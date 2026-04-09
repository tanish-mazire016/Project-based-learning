"""
Stage 2 — Cleaning Worker

Celery task: process_cleaning_batch
Queue: cleaning_queue

Receives a batch of raw rows, cleans them via cleaning_service,
inserts valid rows into transactions table, rejected rows into
rejected_transactions, and chains to the feature engineering stage.
"""

import logging
from datetime import datetime, timedelta, timezone

import redis
from celery import shared_task
from django.conf import settings
from django.db import transaction as db_transaction

from pipeline.models import Dataset, Transaction, RejectedTransaction, DatasetStatus
from pipeline.services.cleaning_service import clean_batch
from pipeline.services.audit_service import write_audit_log

logger = logging.getLogger(__name__)

# Redis client for idempotency deduplication
_redis = None


def _get_redis():
    global _redis
    if _redis is None:
        _redis = redis.from_url(settings.CELERY_BROKER_URL)
    return _redis


# Base date for step → UTC timestamp conversion
BASE_DATE = datetime(2024, 1, 1, tzinfo=timezone.utc)


@shared_task(
    name='pipeline.tasks.cleaning.process_cleaning_batch',
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
    reject_on_worker_lost=True,
)
def process_cleaning_batch(self, dataset_id: int, batch_index: int, rows: list[dict]):
    """
    Clean a batch of raw transaction rows and persist results.

    Idempotent: uses Redis set for dedup (dataset_id + batch_index).
    """
    dedup_key = f"processed_batches:{dataset_id}"
    r = _get_redis()

    # ── Idempotency check ──
    if r.sismember(dedup_key, str(batch_index)):
        logger.info(f"Batch {batch_index} of dataset {dataset_id} already processed, skipping")
        return

    try:
        # ── 1. Clean the batch ──
        result = clean_batch(rows)
        valid_rows = result['valid_rows']
        rejected_rows = result['rejected_rows']

        # ── 2. Persist to DB (atomic) ──
        transaction_ids = []

        with db_transaction.atomic():
            dataset = Dataset.objects.select_for_update().get(id=dataset_id)

            if dataset.status == DatasetStatus.PENDING:
                dataset.status = DatasetStatus.PROCESSING
                dataset.save(update_fields=['status'])

            # Bulk-insert valid rows into transactions
            txn_objects = []
            for row in valid_rows:
                step = int(row.get('step', 0))
                timestamp = BASE_DATE + timedelta(hours=step)

                txn = Transaction(
                    dataset_id=dataset_id,
                    user_id=str(row.get('nameOrig', '')),
                    merchant_id=str(row.get('nameDest', '')),
                    amount=float(row.get('amount', 0)),
                    currency='SIM',
                    transaction_type=str(row.get('type', '')),
                    step=step,
                    timestamp=timestamp,
                    location_metadata={
                        'oldbalanceOrg': float(row.get('oldbalanceOrg', 0)),
                        'newbalanceOrig': float(row.get('newbalanceOrig', 0)),
                        'oldbalanceDest': float(row.get('oldbalanceDest', 0)),
                        'newbalanceDest': float(row.get('newbalanceDest', 0)),
                        'isFlaggedFraud': int(row.get('isFlaggedFraud', 0)),
                    },
                    is_outlier=bool(row.get('is_outlier', False)),
                    ground_truth_label=bool(int(row.get('isFraud', 0))) if 'isFraud' in row else None,
                )
                txn_objects.append(txn)

            created_txns = Transaction.objects.bulk_create(txn_objects)
            transaction_ids = [t.id for t in created_txns]

            # Bulk-insert rejected rows
            rejected_objects = [
                RejectedTransaction(
                    dataset_id=dataset_id,
                    raw_row=rej['row'],
                    rejection_reason=rej['reason'],
                )
                for rej in rejected_rows
            ]
            if rejected_objects:
                RejectedTransaction.objects.bulk_create(rejected_objects)

            # ── 3. Update dataset progress ──
            dataset.batches_processed += 1
            if dataset.batches_processed >= dataset.total_batches:
                dataset.status = DatasetStatus.DONE
            dataset.save(update_fields=['batches_processed', 'status'])

        # ── 4. Mark batch as processed (Redis dedup) ──
        r.sadd(dedup_key, str(batch_index))
        # Expire dedup key after 7 days
        r.expire(dedup_key, 7 * 86400)

        # ── 5. Audit log ──
        write_audit_log(
            event_type='BATCH_CLEANED',
            entity_id=str(dataset_id),
            entity_type='Dataset',
            description=f"Batch {batch_index}: {len(valid_rows)} valid, {len(rejected_rows)} rejected",
        )

        # ── 6. Chain to feature engineering ──
        if transaction_ids:
            from pipeline.tasks.features import process_feature_engineering_batch
            process_feature_engineering_batch.delay(transaction_ids)

        logger.info(
            f"Dataset {dataset_id}, batch {batch_index}: "
            f"{len(valid_rows)} valid, {len(rejected_rows)} rejected"
        )

    except Dataset.DoesNotExist:
        logger.error(f"Dataset {dataset_id} not found")
        raise

    except Exception as exc:
        logger.exception(f"Cleaning batch {batch_index} of dataset {dataset_id} failed")

        # Mark dataset as failed
        try:
            Dataset.objects.filter(id=dataset_id).update(status=DatasetStatus.FAILED)
            write_audit_log(
                event_type='BATCH_FAILED',
                entity_id=str(dataset_id),
                entity_type='Dataset',
                description=f"Batch {batch_index} failed: {str(exc)[:500]}",
            )
        except Exception:
            logger.exception("Failed to update dataset status")

        raise self.retry(exc=exc)
