"""
Stage 7 — Adaptive Engine Worker

Celery task: run_adaptive_engine
Queue: adaptive_queue

Fires after every feedback submission AND on a 24-hour Celery Beat schedule.
Adjusts rule weights and thresholds based on human feedback patterns.
"""

import logging
from datetime import timedelta

from celery import shared_task
from django.db import transaction as db_transaction
from django.utils import timezone

from pipeline.models import (
    HumanFeedback, FraudRule, RuleVersion, AppSetting, RiskAssessment,
)
from pipeline.services.adaptive_service import (
    compute_rule_performance,
    compute_weight_adjustments,
    compute_threshold_adjustments,
)
from pipeline.services.scoring_service import compute_rule_hash
from pipeline.services.audit_service import write_audit_log

logger = logging.getLogger(__name__)


@shared_task(
    name='pipeline.tasks.adaptive.run_adaptive_engine',
    bind=True,
    max_retries=1,
    acks_late=True,
    reject_on_worker_lost=True,
)
def run_adaptive_engine(self):
    """
    Analyze recent feedback and adjust rule weights + thresholds.
    """
    try:
        # ── 1. Query feedback from the last 7 days ──
        cutoff = timezone.now() - timedelta(days=7)
        feedback_qs = HumanFeedback.objects.filter(
            created_at__gte=cutoff
        ).select_related('transaction')

        if not feedback_qs.exists():
            logger.info("No recent feedback to process")
            return

        # Build feedback records with triggered rules from risk assessments
        feedback_records = []
        for fb in feedback_qs:
            triggered_rules = []
            try:
                assessment = RiskAssessment.objects.get(transaction_id=fb.transaction_id)
                triggered_rules = assessment.triggered_rules or []
                risk_score = assessment.risk_score
            except RiskAssessment.DoesNotExist:
                risk_score = 0.0

            feedback_records.append({
                'transaction_id': fb.transaction_id,
                'verdict': fb.verdict,
                'confidence_score': fb.confidence_score,
                'triggered_rules': triggered_rules,
                'risk_score': risk_score,
            })

        logger.info(f"Processing {len(feedback_records)} feedback records")

        # ── 2. Compute rule performance ──
        rule_metrics = compute_rule_performance(feedback_records)

        # ── 3. Compute weight adjustments ──
        current_rules = {}
        rules = {r.id: r for r in FraudRule.objects.filter(is_active=True)}
        for rule_id, rule in rules.items():
            current_rules[rule_id] = rule.weight

        weight_adjustments = compute_weight_adjustments(rule_metrics, current_rules)

        # ── 4. Apply weight changes ──
        if weight_adjustments:
            with db_transaction.atomic():
                for rule_id, new_weight in weight_adjustments.items():
                    rule = rules.get(rule_id)
                    if not rule:
                        continue

                    old_weight = rule.weight

                    # Create version snapshot
                    RuleVersion.objects.create(
                        rule=rule,
                        weight_before=old_weight,
                        weight_after=new_weight,
                        reason=f"Adaptive engine: F1={rule_metrics.get(rule_id, {}).get('f1_score', 'N/A')}",
                    )

                    # Update rule weight
                    rule.weight = new_weight
                    rule.version += 1
                    # Recompute integrity hash with new weight
                    rule.rule_config['weight'] = new_weight
                    rule.integrity_hash = compute_rule_hash(rule.rule_config)
                    rule.save(update_fields=['weight', 'version', 'integrity_hash', 'rule_config', 'updated_at'])

                    logger.info(f"Rule '{rule.name}': weight {old_weight:.4f} → {new_weight:.4f}")

            write_audit_log(
                event_type='RULE_WEIGHTS_UPDATED',
                entity_id='ALL',
                entity_type='FraudRule',
                description=f"Updated {len(weight_adjustments)} rule weights",
            )

        # ── 5. Compute threshold adjustments ──
        threshold_deltas = compute_threshold_adjustments(feedback_records)

        if threshold_deltas:
            with db_transaction.atomic():
                for key, delta in threshold_deltas.items():
                    try:
                        setting = AppSetting.objects.get(key=key)
                        old_value = float(setting.value)
                        new_value = round(old_value + delta, 4)

                        # Guardrails
                        new_value = max(0.10, min(0.90, new_value))

                        # Ensure ALLOW < BLOCK with min gap
                        if key == 'ALLOW_THRESHOLD':
                            block_val = float(AppSetting.get('BLOCK_THRESHOLD', '0.65'))
                            if new_value >= block_val - 0.10:
                                new_value = block_val - 0.10
                        elif key == 'BLOCK_THRESHOLD':
                            allow_val = float(AppSetting.get('ALLOW_THRESHOLD', '0.30'))
                            if new_value <= allow_val + 0.10:
                                new_value = allow_val + 0.10

                        # Create version snapshot
                        RuleVersion.objects.create(
                            threshold_before=old_value,
                            threshold_after=new_value,
                            reason=f"Adaptive engine: {key} adjusted by {delta:+.4f}",
                        )

                        setting.value = str(new_value)
                        setting.save(update_fields=['value', 'updated_at'])

                        logger.info(f"{key}: {old_value:.4f} → {new_value:.4f}")

                    except AppSetting.DoesNotExist:
                        logger.warning(f"AppSetting '{key}' not found, skipping")

            write_audit_log(
                event_type='THRESHOLDS_UPDATED',
                entity_id='ALL',
                entity_type='AppSetting',
                description=f"Updated thresholds: {list(threshold_deltas.keys())}",
            )

        logger.info("Adaptive engine run complete")

    except Exception as exc:
        logger.exception("Adaptive engine failed")
        raise self.retry(exc=exc)
