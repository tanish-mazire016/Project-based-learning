"""
Feature Engineering Service — bridges shared feature logic into the pipeline.

Uses the shared feature engineering module (ML/shared_features.py) to compute
features for transaction batches from the database. This ensures identical
transformations between offline training and online inference.

The original ML/feature_engineering.py is NOT modified.
"""

import os
import sys
import pandas as pd
import numpy as np
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Import shared feature module from ML directory
# ─────────────────────────────────────────────────────────────────────────────
_ml_dir = getattr(settings, 'ML_DIR', os.path.join(os.path.dirname(__file__), '..', '..', '..', 'ML'))
if _ml_dir not in sys.path:
    sys.path.insert(0, _ml_dir)

from shared_features import (
    FEATURE_COLUMNS,
    compute_time_features,
    compute_frequency_features,
    compute_high_amount_flag,
    encode_transaction_type,
)


def compute_features(transactions: list[dict]) -> list[dict]:
    """
    Compute engineered features for a batch of transactions.

    Uses the shared feature module (ML/shared_features.py) to guarantee
    identical logic between training and inference. Transforms database
    transaction records into the 12-column feature format expected by
    the pre-trained XGBoost and Isolation Forest models.

    Feature pipeline (matches ML/feature_engineering.py exactly):
      1. compute_time_features()      → hour from step
      2. compute_frequency_features() → orig_txn_count, dest_txn_count
      3. compute_high_amount_flag()   → top 5% by amount
      4. encode_transaction_type()    → one-hot encode transaction type

    Args:
        transactions: List of transaction dicts with keys:
            id, user_id, merchant_id, amount, transaction_type, step,
            location_metadata (contains oldbalanceOrg, oldbalanceDest, etc.)

    Returns:
        List of feature dicts, one per transaction, keyed by transaction_id.
    """
    if not transactions:
        return []

    df = pd.DataFrame(transactions)

    # ------------------------------------------------------------------
    # Reconstruct PaySim-shaped columns for the shared feature module
    # ------------------------------------------------------------------
    # Extract balance fields from location_metadata
    df['oldbalanceOrg'] = df['location_metadata'].apply(
        lambda m: float(m.get('oldbalanceOrg', 0)) if isinstance(m, dict) else 0
    )
    df['oldbalanceDest'] = df['location_metadata'].apply(
        lambda m: float(m.get('oldbalanceDest', 0)) if isinstance(m, dict) else 0
    )

    # Rename to match shared module expectations (PaySim column names)
    df['nameOrig'] = df['user_id']
    df['nameDest'] = df['merchant_id']
    df['type'] = df['transaction_type']

    # ------------------------------------------------------------------
    # Apply shared feature engineering (same logic as offline pipeline)
    # ------------------------------------------------------------------
    df = compute_time_features(df)
    df = compute_frequency_features(df)
    df = compute_high_amount_flag(df)
    df = encode_transaction_type(df)

    # Validate feature columns exist
    missing_cols = [c for c in FEATURE_COLUMNS if c not in df.columns]
    if missing_cols:
        logger.error(f"Missing feature columns after engineering: {missing_cols}")
        raise ValueError(f"Feature engineering produced incomplete columns: {missing_cols}")

    # ------------------------------------------------------------------
    # Build output: one feature dict per transaction
    # ------------------------------------------------------------------
    results = []
    for _, row in df.iterrows():
        feature_dict = {
            'transaction_id': int(row['id']),
            'feat_amount': float(row['amount']),
            'feat_old_balance_org': float(row['oldbalanceOrg']),
            'feat_old_balance_dest': float(row['oldbalanceDest']),
            'feat_hour': int(row['hour']),
            'feat_orig_txn_count': int(row['orig_txn_count']),
            'feat_dest_txn_count': int(row['dest_txn_count']),
            'feat_high_amount': int(row['high_amount']),
            'feat_type_cash_in': int(row['type_CASH_IN']),
            'feat_type_cash_out': int(row['type_CASH_OUT']),
            'feat_type_debit': int(row['type_DEBIT']),
            'feat_type_payment': int(row['type_PAYMENT']),
            'feat_type_transfer': int(row['type_TRANSFER']),
        }
        results.append(feature_dict)

    logger.info(
        f"Computed features for {len(results)} transactions "
        f"(columns: {len(FEATURE_COLUMNS)}, batch_size: {len(df)})"
    )
    return results
