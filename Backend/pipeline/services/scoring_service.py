"""
Scoring Service — bridges risk_engine.py + pre-trained models into the pipeline.

Loads the pre-trained XGBoost and Isolation Forest models from ML/models/
and uses risk_engine.py functions (compute_ml_score, compute_anomaly_score,
combine_scores) for hybrid risk scoring.

Hybrid scoring mechanism:
  1. XGBoost  → predict_proba → compute_ml_score()      → 0-100
  2. IsoForest → decision_function → compute_anomaly_score() → 0-100
  3. combine_scores() → 80% ML + 20% Anomaly             → 0-100
  4. Normalize to 0.0-1.0 for threshold comparison

The original ML files are NOT modified. Models are NOT retrained.
"""

import os
import sys
import hashlib
import json
import logging
import time

import joblib
import numpy as np
import pandas as pd
from django.conf import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Add ML directory to path so we can import risk_engine and shared_features
# ---------------------------------------------------------------------------
_ml_dir = getattr(settings, 'ML_DIR', os.path.join(os.path.dirname(__file__), '..', '..', '..', 'ML'))
if _ml_dir not in sys.path:
    sys.path.insert(0, _ml_dir)

from risk_engine import compute_ml_score, compute_anomaly_score, combine_scores
from shared_features import FEATURE_COLUMNS

# ---------------------------------------------------------------------------
# Model singleton — loaded once per worker process
# ---------------------------------------------------------------------------
_xgb_model = None
_iso_model = None


def _load_models():
    """
    Load pre-trained XGBoost and Isolation Forest models from disk.

    Models are loaded once per worker process (singleton pattern).
    Subsequent calls are no-ops unless a model failed to load previously.

    Raises:
        FileNotFoundError: If model files are missing from ML_MODELS_DIR.
        Exception: If model files are corrupted or incompatible.
    """
    global _xgb_model, _iso_model

    if _xgb_model is not None and _iso_model is not None:
        return

    models_dir = getattr(settings, 'ML_MODELS_DIR', os.path.join(_ml_dir, 'models'))

    xgb_path = os.path.join(models_dir, 'xgb_model.pkl')
    iso_path = os.path.join(models_dir, 'isolation_forest.pkl')

    # Validate files exist before attempting to load
    for path, name in [(xgb_path, 'XGBoost'), (iso_path, 'Isolation Forest')]:
        if not os.path.exists(path):
            logger.error(f"{name} model file not found: {path}")
            raise FileNotFoundError(
                f"{name} model file not found at {path}. "
                f"Run train_xgb.py / train_isolation.py first."
            )

    try:
        logger.info(f"Loading XGBoost model from {xgb_path} "
                    f"({os.path.getsize(xgb_path) / 1024:.1f} KB)")
        _xgb_model = joblib.load(xgb_path)
    except Exception as exc:
        logger.exception(f"Failed to load XGBoost model from {xgb_path}")
        raise RuntimeError(f"Corrupt or incompatible XGBoost model: {exc}") from exc

    try:
        logger.info(f"Loading Isolation Forest model from {iso_path} "
                    f"({os.path.getsize(iso_path) / 1024:.1f} KB)")
        _iso_model = joblib.load(iso_path)
    except Exception as exc:
        _xgb_model = None  # Reset so next call retries both
        logger.exception(f"Failed to load Isolation Forest model from {iso_path}")
        raise RuntimeError(f"Corrupt or incompatible Isolation Forest model: {exc}") from exc

    logger.info("Both models loaded successfully")

# Minimum batch size for stable model predictions
MIN_BATCH_SIZE = 32


def _pad_batch(X: pd.DataFrame, target_size: int) -> pd.DataFrame:
    """
    Pad a small batch to target_size via oversampling with gaussian noise.

    Duplicates existing rows and adds small noise to numeric features
    to give the model sufficient variance for calibrated probabilities.
    Binary/categorical columns are kept unchanged.
    """
    original_size = len(X)
    pad_needed = target_size - original_size

    # Columns that are continuous (add noise) vs binary (keep as-is)
    noise_cols = ['amount', 'oldbalanceOrg', 'oldbalanceDest']
    binary_cols = [c for c in X.columns if c not in noise_cols]

    # Sample rows to duplicate (with replacement)
    indices = np.random.choice(original_size, size=pad_needed, replace=True)
    padded_rows = X.iloc[indices].copy().reset_index(drop=True)

    # Add small gaussian noise to continuous features only
    for col in noise_cols:
        col_std = X[col].std()
        if col_std > 0:
            noise = np.random.normal(0, col_std * 0.01, size=pad_needed)
            padded_rows[col] = padded_rows[col] + noise
            # Ensure no negative values for amounts/balances
            padded_rows[col] = padded_rows[col].clip(lower=0)

    return pd.concat([X, padded_rows], ignore_index=True)


def verify_rule_integrity(rule) -> bool:
    """
    Verify that a FraudRule's integrity_hash matches its current config.

    Recomputes SHA-256 of the rule_config dict and compares to stored hash.
    """
    config_str = json.dumps(rule.rule_config, sort_keys=True)
    computed_hash = hashlib.sha256(config_str.encode()).hexdigest()
    return computed_hash == rule.integrity_hash


def compute_rule_hash(rule_config: dict) -> str:
    """Compute SHA-256 integrity hash for a rule config."""
    config_str = json.dumps(rule_config, sort_keys=True)
    return hashlib.sha256(config_str.encode()).hexdigest()


def score_transactions(feature_dicts: list[dict], rules: list) -> list[dict]:
    """
    Score a batch of transactions using the pre-trained models and fraud rules.

    Uses the exact same inference pipeline as ML/evaluate.py:
      1. XGBoost predict_proba → compute_ml_score()         (from risk_engine.py)
      2. IsolationForest decision_function → compute_anomaly_score() (from risk_engine.py)
      3. combine_scores() with 80/20 weighting               (from risk_engine.py)
      4. Normalize 0–100 → 0.0–1.0 for threshold comparison
      5. Match features against fraud rules

    Dynamic Batch Sizing:
      - If fewer than MIN_BATCH_SIZE features, pad via oversampling with
        small gaussian noise to improve model confidence.
      - After scoring, only return results for original transactions.

    Args:
        feature_dicts: List of dicts with keys matching FEATURE_COLUMNS,
                       plus 'transaction_id'.
        rules: List of FraudRule model instances.

    Returns:
        List of dicts with risk_score, ml_score, anomaly_score, etc.
    """
    _load_models()

    if not feature_dicts:
        return []

    # Build DataFrame in the exact column order the models expect
    transaction_ids = [f['transaction_id'] for f in feature_dicts]
    original_count = len(feature_dicts)

    # Map DB column names to model column names
    model_data = []
    for f in feature_dicts:
        model_data.append({
            'amount': f.get('feat_amount', f.get('amount', 0)),
            'oldbalanceOrg': f.get('feat_old_balance_org', f.get('oldbalanceOrg', 0)),
            'oldbalanceDest': f.get('feat_old_balance_dest', f.get('oldbalanceDest', 0)),
            'hour': f.get('feat_hour', f.get('hour', 0)),
            'orig_txn_count': f.get('feat_orig_txn_count', f.get('orig_txn_count', 0)),
            'dest_txn_count': f.get('feat_dest_txn_count', f.get('dest_txn_count', 0)),
            'high_amount': f.get('feat_high_amount', f.get('high_amount', 0)),
            'type_CASH_IN': f.get('feat_type_cash_in', f.get('type_CASH_IN', 0)),
            'type_CASH_OUT': f.get('feat_type_cash_out', f.get('type_CASH_OUT', 0)),
            'type_DEBIT': f.get('feat_type_debit', f.get('type_DEBIT', 0)),
            'type_PAYMENT': f.get('feat_type_payment', f.get('type_PAYMENT', 0)),
            'type_TRANSFER': f.get('feat_type_transfer', f.get('type_TRANSFER', 0)),
        })

    X = pd.DataFrame(model_data, columns=FEATURE_COLUMNS)

    # ── Dynamic Batch Padding ──
    padded = False
    if len(X) < MIN_BATCH_SIZE:
        padded = True
        pad_count = MIN_BATCH_SIZE - len(X)
        logger.info(
            f"Batch padded from {original_count} to {MIN_BATCH_SIZE} "
            f"(+{pad_count} synthetic samples) for model stability"
        )
        X = _pad_batch(X, MIN_BATCH_SIZE)

    # ── 1. XGBoost inference (calibrated probabilities) ──
    t_start = time.perf_counter()
    y_pred_proba = _xgb_model.predict_proba(X)[:, 1]
    ml_scores = compute_ml_score(y_pred_proba)      # 0–100
    t_xgb = time.perf_counter() - t_start

    # ── 2. Isolation Forest inference ──
    t_start = time.perf_counter()
    anomaly_raw = _iso_model.decision_function(X)
    anomaly_scores = compute_anomaly_score(anomaly_raw)  # 0–100
    t_iso = time.perf_counter() - t_start

    # ── 3. Combine with 80/20 weighting ──
    combined_scores = combine_scores(ml_scores, anomaly_scores)  # 0–100

    # ── 4. Normalize to 0.0–1.0 ──
    normalized_scores = combined_scores / 100.0

    logger.info(
        f"Inference timing: XGBoost={t_xgb:.3f}s, IsoForest={t_iso:.3f}s "
        f"(batch_size={len(X)})"
    )

    # ── Discard padded results, keep only originals ──
    if padded:
        ml_scores = ml_scores[:original_count]
        anomaly_scores = anomaly_scores[:original_count]
        normalized_scores = normalized_scores[:original_count]
        logger.info(
            f"Discarded {MIN_BATCH_SIZE - original_count} padded results, "
            f"returning {original_count} original scores"
        )

    # ── 5. Build rule weights snapshot ──
    rule_weights_snapshot = {}
    for rule in rules:
        rule_weights_snapshot[rule.name] = rule.weight

    # ── 6. Match against fraud rules ──
    results = []
    for i, txn_id in enumerate(transaction_ids):
        triggered = _evaluate_rules(model_data[i], rules, normalized_scores[i])

        results.append({
            'transaction_id': txn_id,
            'risk_score': float(normalized_scores[i]),
            'ml_score': float(ml_scores[i]),
            'anomaly_score': float(anomaly_scores[i]),
            'triggered_rules': triggered,
            'rule_weights_snapshot': rule_weights_snapshot,
        })

    logger.info(f"Scored {len(results)} transactions (avg_risk={np.mean(normalized_scores[:original_count]):.4f})")
    return results


def _evaluate_rules(features: dict, rules: list, risk_score: float) -> list[dict]:
    """
    Evaluate which fraud rules are triggered by a transaction's features.

    Each rule has a rule_config dict like:
      {"feature": "high_amount", "operator": "==", "threshold": 1}
    """
    triggered = []
    for rule in rules:
        if not rule.is_active:
            continue

        config = rule.rule_config
        feature_name = config.get('feature', '')
        operator = config.get('operator', '>')
        threshold = config.get('threshold', 0)

        feature_value = features.get(feature_name, 0)

        is_triggered = False
        if operator == '>':
            is_triggered = feature_value > threshold
        elif operator == '>=':
            is_triggered = feature_value >= threshold
        elif operator == '<':
            is_triggered = feature_value < threshold
        elif operator == '<=':
            is_triggered = feature_value <= threshold
        elif operator == '==':
            is_triggered = feature_value == threshold
        elif operator == '!=':
            is_triggered = feature_value != threshold

        if is_triggered:
            triggered.append({
                'rule_name': rule.name,
                'rule_id': rule.id,
                'weight': rule.weight,
                'feature': feature_name,
                'feature_value': feature_value,
                'threshold': threshold,
                'score_contribution': rule.weight * risk_score,
                'explanation': f"{feature_name} ({feature_value}) {operator} {threshold}",
            })

    return triggered
