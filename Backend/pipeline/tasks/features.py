"""
Stage 3 — Feature Engineering Worker

Celery task: process_feature_engineering_batch
Queue: features_queue

Receives transaction IDs, computes engineered features via feature_service,
inserts into transaction_features, and chains to risk scoring.
"""

import logging
from celery import shared_task
from django.db import transaction as db_transaction

from pipeline.models import Transaction, TransactionFeature
from pipeline.services.feature_service import compute_features
from pipeline.services.audit_service import write_audit_log

logger = logging.getLogger(__name__)


@shared_task(
    name='pipeline.tasks.features.process_feature_engineering_batch',
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
    reject_on_worker_lost=True,
)
def process_feature_engineering_batch(self, transaction_ids: list[int]):
    """
    Compute engineered features for a batch of transactions.

    Idempotent: skips transactions that already have features.
    """
    try:
        # ── 1. Fetch transactions from DB ──
        # Exclude transactions that already have features (idempotency)
        existing_feature_txn_ids = set(
            TransactionFeature.objects
            .filter(transaction_id__in=transaction_ids)
            .values_list('transaction_id', flat=True)
        )
        new_ids = [tid for tid in transaction_ids if tid not in existing_feature_txn_ids]

        if not new_ids:
            logger.info(f"All {len(transaction_ids)} transactions already have features, skipping")
            return

        transactions = Transaction.objects.filter(id__in=new_ids)
        txn_dicts = []
        for txn in transactions:
            txn_dicts.append({
                'id': txn.id,
                'user_id': txn.user_id,
                'merchant_id': txn.merchant_id,
                'amount': txn.amount,
                'transaction_type': txn.transaction_type,
                'step': txn.step,
                'location_metadata': txn.location_metadata or {},
            })

        if not txn_dicts:
            logger.warning(f"No transactions found for IDs: {new_ids[:10]}...")
            return

        # ── 2. Compute features ──
        feature_dicts = compute_features(txn_dicts)

        # ── 3. Bulk-insert into transaction_features ──
        with db_transaction.atomic():
            feature_objects = [
                TransactionFeature(
                    transaction_id=fd['transaction_id'],
                    feat_amount=fd['feat_amount'],
                    feat_old_balance_org=fd['feat_old_balance_org'],
                    feat_old_balance_dest=fd['feat_old_balance_dest'],
                    feat_hour=fd['feat_hour'],
                    feat_orig_txn_count=fd['feat_orig_txn_count'],
                    feat_dest_txn_count=fd['feat_dest_txn_count'],
                    feat_high_amount=fd['feat_high_amount'],
                    feat_type_cash_in=fd['feat_type_cash_in'],
                    feat_type_cash_out=fd['feat_type_cash_out'],
                    feat_type_debit=fd['feat_type_debit'],
                    feat_type_payment=fd['feat_type_payment'],
                    feat_type_transfer=fd['feat_type_transfer'],
                )
                for fd in feature_dicts
            ]
            TransactionFeature.objects.bulk_create(feature_objects, ignore_conflicts=True)

        # ── 4. Audit log ──
        write_audit_log(
            event_type='FEATURES_ENGINEERED',
            entity_id=str(new_ids[0]) if new_ids else '0',
            entity_type='Transaction',
            description=f"Features computed for {len(feature_dicts)} transactions",
        )

        # ── 5. Chain to risk scoring ──
        from pipeline.tasks.scoring import process_risk_scoring_batch
        process_risk_scoring_batch.delay(new_ids)

        logger.info(f"Features computed for {len(feature_dicts)} transactions")

    except Exception as exc:
        logger.exception(f"Feature engineering failed for {len(transaction_ids)} transactions")
        raise self.retry(exc=exc)
