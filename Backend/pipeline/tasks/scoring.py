"""
Stage 4 — Risk Scoring Worker

Celery task: process_risk_scoring_batch
Queue: scoring_queue

Fetches transactions + features, verifies rule integrity,
runs the pre-trained XGBoost + Isolation Forest models via scoring_service,
inserts RiskAssessment records, and chains to the decision stage.
"""

import logging
from celery import shared_task
from django.db import transaction as db_transaction

from pipeline.models import (
    Transaction, TransactionFeature, FraudRule, RiskAssessment,
)
from pipeline.services.scoring_service import score_transactions, verify_rule_integrity
from pipeline.services.audit_service import write_audit_log

logger = logging.getLogger(__name__)


@shared_task(
    name='pipeline.tasks.scoring.process_risk_scoring_batch',
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
    reject_on_worker_lost=True,
)
def process_risk_scoring_batch(self, transaction_ids: list[int]):
    """
    Score a batch of transactions using pre-trained ML models + fraud rules.

    Idempotent: skips transactions that already have risk assessments.
    """
    try:
        # ── 1. Skip already-scored transactions ──
        existing = set(
            RiskAssessment.objects
            .filter(transaction_id__in=transaction_ids)
            .values_list('transaction_id', flat=True)
        )
        new_ids = [tid for tid in transaction_ids if tid not in existing]

        if not new_ids:
            logger.info("All transactions already scored, skipping")
            return

        # ── 2. Fetch features (JOIN) ──
        features = TransactionFeature.objects.filter(transaction_id__in=new_ids)
        feature_dicts = []
        for f in features:
            fd = f.to_model_input_dict()
            fd['transaction_id'] = f.transaction_id
            feature_dicts.append(fd)

        if not feature_dicts:
            logger.warning(f"No features found for transaction IDs: {new_ids[:10]}...")
            return

        # ── 3. Load active fraud rules and verify integrity ──
        rules = list(FraudRule.objects.filter(is_active=True))

        for rule in rules:
            if not verify_rule_integrity(rule):
                # SECURITY: halt batch on tamper detection
                write_audit_log(
                    event_type='INTEGRITY_VIOLATION',
                    entity_id=str(rule.id),
                    entity_type='FraudRule',
                    description=f"Integrity hash mismatch for rule '{rule.name}' (v{rule.version})",
                )
                raise SecurityError(
                    f"Rule '{rule.name}' integrity hash mismatch — possible tampering detected"
                )

        # ── 4. Score transactions ──
        results = score_transactions(feature_dicts, rules)

        # ── 5. Bulk-insert RiskAssessment records ──
        with db_transaction.atomic():
            assessment_objects = [
                RiskAssessment(
                    transaction_id=r['transaction_id'],
                    risk_score=r['risk_score'],
                    ml_score=r['ml_score'],
                    anomaly_score=r['anomaly_score'],
                    triggered_rules=r['triggered_rules'],
                    rule_weights_snapshot=r['rule_weights_snapshot'],
                )
                for r in results
            ]
            RiskAssessment.objects.bulk_create(assessment_objects, ignore_conflicts=True)

        # ── 6. Audit log ──
        write_audit_log(
            event_type='TRANSACTION_ASSESSED',
            entity_id=str(new_ids[0]) if new_ids else '0',
            entity_type='Transaction',
            description=f"Scored {len(results)} transactions",
        )

        # ── 7. Chain to decisions ──
        from pipeline.tasks.decisions import process_decisions_batch
        process_decisions_batch.delay(new_ids)

        logger.info(f"Scored {len(results)} transactions")

    except Exception as exc:
        logger.exception(f"Risk scoring failed for {len(transaction_ids)} transactions")
        raise self.retry(exc=exc)


class SecurityError(Exception):
    """Raised when a rule integrity check fails."""
    pass
