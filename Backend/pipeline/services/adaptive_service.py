"""
Adaptive Engine Service — computes rule performance and weight adjustments.

These functions are NEW (not in the ML folder) because the adaptive engine
logic does not exist in the original ML codebase.

Called by the run_adaptive_engine Celery task after feedback submission
and on a 24-hour Celery Beat schedule.
"""

import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

# Guardrails
MAX_WEIGHT_CHANGE_PERCENT = 0.20   # ±20% max change per cycle
MIN_WEIGHT = 0.05
MAX_WEIGHT = 0.50
MIN_FEEDBACK_COUNT = 5             # Minimum feedback to trigger adjustments


def compute_rule_performance(feedback_records: list[dict]) -> dict:
    """
    Compute per-rule performance metrics from human feedback.

    For each rule that was triggered on reviewed transactions, compute:
      - true_positives:  rule triggered AND verdict=FRAUD
      - false_positives: rule triggered AND verdict=LEGITIMATE
      - false_negatives: rule NOT triggered AND verdict=FRAUD
      - precision, recall, f1_score

    Args:
        feedback_records: List of dicts with keys:
            transaction_id, verdict, triggered_rules (list of rule dicts)

    Returns:
        Dict keyed by rule_id:
        {
            rule_id: {
                'rule_name': str,
                'true_positives': int,
                'false_positives': int,
                'false_negatives': int,
                'precision': float,
                'recall': float,
                'f1_score': float,
                'total_triggers': int,
            }
        }
    """
    rule_stats = defaultdict(lambda: {
        'rule_name': '',
        'true_positives': 0,
        'false_positives': 0,
        'false_negatives': 0,
        'total_triggers': 0,
    })

    # Collect all triggered rule IDs across all feedback
    all_rule_ids = set()
    for record in feedback_records:
        triggered = record.get('triggered_rules', [])
        for rule in triggered:
            rule_id = rule.get('rule_id')
            if rule_id:
                all_rule_ids.add(rule_id)
                rule_stats[rule_id]['rule_name'] = rule.get('rule_name', '')

    # Compute TP, FP, FN for each rule
    for record in feedback_records:
        verdict = record.get('verdict', '')
        triggered_ids = {r.get('rule_id') for r in record.get('triggered_rules', []) if r.get('rule_id')}

        for rule_id in all_rule_ids:
            was_triggered = rule_id in triggered_ids

            if was_triggered and verdict == 'FRAUD':
                rule_stats[rule_id]['true_positives'] += 1
                rule_stats[rule_id]['total_triggers'] += 1
            elif was_triggered and verdict == 'LEGITIMATE':
                rule_stats[rule_id]['false_positives'] += 1
                rule_stats[rule_id]['total_triggers'] += 1
            elif not was_triggered and verdict == 'FRAUD':
                rule_stats[rule_id]['false_negatives'] += 1

    # Compute precision, recall, F1
    results = {}
    for rule_id, stats in rule_stats.items():
        tp = stats['true_positives']
        fp = stats['false_positives']
        fn = stats['false_negatives']

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        results[rule_id] = {
            **stats,
            'precision': round(precision, 4),
            'recall': round(recall, 4),
            'f1_score': round(f1, 4),
        }

    return results


def compute_weight_adjustments(rule_metrics: dict, current_rules: dict) -> dict:
    """
    Propose weight adjustments based on rule performance metrics.

    Strategy:
      - Rules with high F1 (>0.7) get a small weight increase
      - Rules with low F1 (<0.3) get a weight decrease
      - Rules with medium F1 stay unchanged
      - Guardrails: ±20% max change, clamped to [MIN_WEIGHT, MAX_WEIGHT]

    Args:
        rule_metrics: Output of compute_rule_performance()
        current_rules: Dict of {rule_id: current_weight}

    Returns:
        Dict of {rule_id: new_weight} — only includes rules that changed.
    """
    adjustments = {}

    for rule_id, metrics in rule_metrics.items():
        if rule_id not in current_rules:
            continue

        current_weight = current_rules[rule_id]
        f1 = metrics.get('f1_score', 0.0)
        total_triggers = metrics.get('total_triggers', 0)

        # Skip if insufficient data
        if total_triggers < MIN_FEEDBACK_COUNT:
            continue

        # Compute adjustment factor
        if f1 > 0.7:
            # Good performance → increase weight by up to 10%
            factor = 1.0 + (0.10 * (f1 - 0.7) / 0.3)  # Scale 0–10%
        elif f1 < 0.3:
            # Poor performance → decrease weight by up to 15%
            factor = 1.0 - (0.15 * (0.3 - f1) / 0.3)   # Scale 0–15%
        else:
            # Adequate — no change
            continue

        # Apply guardrails
        max_increase = current_weight * (1 + MAX_WEIGHT_CHANGE_PERCENT)
        max_decrease = current_weight * (1 - MAX_WEIGHT_CHANGE_PERCENT)

        new_weight = current_weight * factor
        new_weight = max(max_decrease, min(max_increase, new_weight))
        new_weight = max(MIN_WEIGHT, min(MAX_WEIGHT, new_weight))
        new_weight = round(new_weight, 4)

        if abs(new_weight - current_weight) > 0.001:
            adjustments[rule_id] = new_weight
            logger.info(
                f"Rule {rule_id}: weight {current_weight:.4f} → {new_weight:.4f} "
                f"(F1={f1:.4f}, triggers={total_triggers})"
            )

    return adjustments


def compute_threshold_adjustments(feedback_records: list[dict]) -> dict:
    """
    Propose threshold adjustments based on feedback patterns.

    Strategy:
      - If too many LEGITIMATE verdicts are at REVIEW (false alarm rate high):
        → raise ALLOW_THRESHOLD slightly
      - If too many FRAUD verdicts are at REVIEW (should have been blocked):
        → lower BLOCK_THRESHOLD slightly
      - Guardrails: thresholds stay within [0.10, 0.90] and
        ALLOW < BLOCK with minimum 0.10 gap

    Args:
        feedback_records: List with verdict and risk_score.

    Returns:
        Dict like {'ALLOW_THRESHOLD': 0.32, 'BLOCK_THRESHOLD': 0.63}
        Only includes changed thresholds.
    """
    if len(feedback_records) < MIN_FEEDBACK_COUNT:
        return {}

    # Count verdicts
    fraud_count = sum(1 for r in feedback_records if r.get('verdict') == 'FRAUD')
    legit_count = sum(1 for r in feedback_records if r.get('verdict') == 'LEGITIMATE')
    total = len(feedback_records)

    adjustments = {}

    # False alarm rate: legit verdicts in review queue
    false_alarm_rate = legit_count / total if total > 0 else 0.0

    # Miss rate: fraud verdicts in review queue
    miss_rate = fraud_count / total if total > 0 else 0.0

    # Adjust ALLOW_THRESHOLD
    if false_alarm_rate > 0.6:
        # Too many false alarms — raise allow threshold to let more through
        adjustments['ALLOW_THRESHOLD'] = 0.02   # increase by 0.02
    elif false_alarm_rate < 0.2 and total >= MIN_FEEDBACK_COUNT:
        # Very few false alarms — can lower allow threshold
        adjustments['ALLOW_THRESHOLD'] = -0.01

    # Adjust BLOCK_THRESHOLD
    if miss_rate > 0.5:
        # Too many frauds passing through to review — lower block threshold
        adjustments['BLOCK_THRESHOLD'] = -0.02
    elif miss_rate < 0.1 and total >= MIN_FEEDBACK_COUNT:
        # Very few misses — can raise block threshold
        adjustments['BLOCK_THRESHOLD'] = 0.01

    return adjustments
