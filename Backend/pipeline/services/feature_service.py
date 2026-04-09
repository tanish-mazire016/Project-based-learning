"""
Feature Engineering Service — bridges feature_engineering.py logic into the pipeline.

Adapts the feature engineering functions from ML/feature_engineering.py
for batch operation on transaction records from the database.

The original ML/feature_engineering.py is NOT modified.
"""

import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

# The 12 feature columns that match what the pre-trained models expect
FEATURE_COLUMNS = [
    'amount', 'oldbalanceOrg', 'oldbalanceDest',
    'hour', 'orig_txn_count', 'dest_txn_count', 'high_amount',
    'type_CASH_IN', 'type_CASH_OUT', 'type_DEBIT', 'type_PAYMENT', 'type_TRANSFER',
]


def compute_features(transactions: list[dict]) -> list[dict]:
    """
    Compute engineered features for a batch of transactions.

    Replicates the logic from feature_engineering.py:
      1. create_time_features()    → hour from step
      2. create_frequency_features() → orig_txn_count, dest_txn_count
      3. create_high_amount_flag()  → top 5% by amount
      4. encode_categorical_features() → one-hot encode transaction type

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
    # Reconstruct PaySim-shaped columns for feature engineering
    # ------------------------------------------------------------------
    # Extract balance fields from location_metadata
    df['oldbalanceOrg'] = df['location_metadata'].apply(
        lambda m: float(m.get('oldbalanceOrg', 0)) if isinstance(m, dict) else 0
    )
    df['oldbalanceDest'] = df['location_metadata'].apply(
        lambda m: float(m.get('oldbalanceDest', 0)) if isinstance(m, dict) else 0
    )

    # Rename to match feature_engineering.py expectations
    df['nameOrig'] = df['user_id']
    df['nameDest'] = df['merchant_id']
    df['type'] = df['transaction_type']

    # ------------------------------------------------------------------
    # 1. Time features (from create_time_features)
    # ------------------------------------------------------------------
    df['hour'] = (df['step'] % 24).astype(int)

    # ------------------------------------------------------------------
    # 2. Frequency features (from create_frequency_features)
    # ------------------------------------------------------------------
    orig_counts = df.groupby('nameOrig').size()
    df['orig_txn_count'] = df['nameOrig'].map(orig_counts).astype(int)

    dest_counts = df.groupby('nameDest').size()
    df['dest_txn_count'] = df['nameDest'].map(dest_counts).astype(int)

    # ------------------------------------------------------------------
    # 3. High amount flag (from create_high_amount_flag)
    # ------------------------------------------------------------------
    if len(df) >= 20:
        threshold = df['amount'].quantile(0.95)
    else:
        # For very small batches, use a sensible default
        threshold = df['amount'].max()
    df['high_amount'] = (df['amount'] > threshold).astype(int)

    # ------------------------------------------------------------------
    # 4. One-hot encode transaction type (from encode_categorical_features)
    # ------------------------------------------------------------------
    all_types = ['CASH_IN', 'CASH_OUT', 'DEBIT', 'PAYMENT', 'TRANSFER']
    for t in all_types:
        col_name = f'type_{t}'
        df[col_name] = (df['type'] == t).astype(int)

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

    logger.info(f"Computed features for {len(results)} transactions")
    return results
