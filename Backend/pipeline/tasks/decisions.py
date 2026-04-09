"""
Stage 5 — Decision Worker

Celery task: process_decisions_batch
Queue: decisions_queue

Applies threshold logic to risk assessments:
  score < ALLOW_THRESHOLD  → ALLOWED
  score >= BLOCK_THRESHOLD → BLOCKED
  otherwise                → REVIEW (enters review queue)
"""

import math
import logging
from celery import shared_task
from django.db import transaction as db_transaction

from pipeline.models import (
    RiskAssessment, Decision, ReviewQueue, AppSetting,
    DecisionType, ReviewStatus,
)
from pipeline.services.audit_service import write_audit_log

logger = logging.getLogger(__name__)


@shared_task(
    name='pipeline.tasks.decisions.process_decisions_batch',
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
    reject_on_worker_lost=True,
)
def process_decisions_batch(self, transaction_ids: list[int]):
    """
    Make ALLOWED/REVIEW/BLOCKED decisions for scored transactions.

    Idempotent: skips transactions that already have decisions.
    """
    try:
        # ── 1. Skip already-decided transactions ──
        existing = set(
            Decision.objects
            .filter(transaction_id__in=transaction_ids)
            .values_list('transaction_id', flat=True)
        )
        new_ids = [tid for tid in transaction_ids if tid not in existing]

        if not new_ids:
            logger.info("All transactions already decided, skipping")
            return

        # ── 2. Fetch risk assessments ──
        assessments = RiskAssessment.objects.filter(transaction_id__in=new_ids)
        if not assessments.exists():
            logger.warning(f"No risk assessments found for IDs: {new_ids[:10]}...")
            return

        # ── 3. Load thresholds from app_settings ──
        allow_threshold = float(AppSetting.get('ALLOW_THRESHOLD', '0.30'))
        block_threshold = float(AppSetting.get('BLOCK_THRESHOLD', '0.65'))

        threshold_snapshot = {
            'ALLOW_THRESHOLD': allow_threshold,
            'BLOCK_THRESHOLD': block_threshold,
        }

        # ── 4. Apply decision logic ──
        decision_objects = []
        review_objects = []

        with db_transaction.atomic():
            for assessment in assessments:
                score = assessment.risk_score

                if score < allow_threshold:
                    decision_type = DecisionType.ALLOWED
                    reason = f"Risk score {score:.3f} below allow threshold {allow_threshold}"
                elif score >= block_threshold:
                    decision_type = DecisionType.BLOCKED
                    reason = f"Risk score {score:.3f} at/above block threshold {block_threshold}"
                else:
                    decision_type = DecisionType.REVIEW
                    reason = f"Risk score {score:.3f} between thresholds ({allow_threshold}, {block_threshold})"

                decision = Decision(
                    transaction_id=assessment.transaction_id,
                    decision_type=decision_type,
                    reason=reason,
                    threshold_snapshot=threshold_snapshot,
                )
                decision_objects.append(decision)

            # Bulk-create decisions
            created_decisions = Decision.objects.bulk_create(decision_objects, ignore_conflicts=True)

            # ── 5. Create ReviewQueue entries for REVIEW decisions ──
            # We need the decision IDs, so re-fetch decisions with REVIEW type
            review_decisions = Decision.objects.filter(
                transaction_id__in=new_ids,
                decision_type=DecisionType.REVIEW,
            ).select_related()

            for decision in review_decisions:
                # Get the risk score for priority calculation
                try:
                    assessment = RiskAssessment.objects.get(
                        transaction_id=decision.transaction_id
                    )
                    priority = math.ceil(assessment.risk_score * 10)
                except RiskAssessment.DoesNotExist:
                    priority = 5

                review = ReviewQueue(
                    transaction_id=decision.transaction_id,
                    decision=decision,
                    status=ReviewStatus.PENDING,
                    priority=priority,
                )
                review_objects.append(review)

            if review_objects:
                ReviewQueue.objects.bulk_create(review_objects, ignore_conflicts=True)

        # ── 6. Audit log ──
        review_count = len(review_objects)
        allowed_count = sum(1 for d in decision_objects if d.decision_type == DecisionType.ALLOWED)
        blocked_count = sum(1 for d in decision_objects if d.decision_type == DecisionType.BLOCKED)

        write_audit_log(
            event_type='DECISION_MADE',
            entity_id=str(new_ids[0]) if new_ids else '0',
            entity_type='Transaction',
            description=(
                f"Decisions for {len(decision_objects)} transactions: "
                f"{allowed_count} ALLOWED, {review_count} REVIEW, {blocked_count} BLOCKED"
            ),
        )

        logger.info(
            f"Decisions: {allowed_count} ALLOWED, {review_count} REVIEW, "
            f"{blocked_count} BLOCKED (thresholds: allow={allow_threshold}, block={block_threshold})"
        )

    except Exception as exc:
        logger.exception(f"Decision making failed for {len(transaction_ids)} transactions")
        raise self.retry(exc=exc)
