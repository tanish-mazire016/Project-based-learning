"""
Shared Feature Engineering Module — Single Source of Truth

This module provides the canonical feature engineering logic used by BOTH:
  1. Offline ML training pipeline (feature_engineering.py)
  2. Online Backend inference pipeline (feature_service.py)

By importing from this single module, we guarantee identical feature
transformations during training and inference, preventing train/serve skew.

Features produced (12 columns, in exact model-expected order):
  amount, oldbalanceOrg, oldbalanceDest, hour,
  orig_txn_count, dest_txn_count, high_amount,
  type_CASH_IN, type_CASH_OUT, type_DEBIT, type_PAYMENT, type_TRANSFER
"""

import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Canonical feature column order — MUST match the order used during training.
# Both the ML models (.pkl) and the backend scoring service depend on this.
# DO NOT reorder or rename without retraining all models.
# ─────────────────────────────────────────────────────────────────────────────
FEATURE_COLUMNS = [
    'amount', 'oldbalanceOrg', 'oldbalanceDest',
    'hour', 'orig_txn_count', 'dest_txn_count', 'high_amount',
    'type_CASH_IN', 'type_CASH_OUT', 'type_DEBIT', 'type_PAYMENT', 'type_TRANSFER',
]

# All possible PaySim transaction types for deterministic one-hot encoding
ALL_TRANSACTION_TYPES = ['CASH_IN', 'CASH_OUT', 'DEBIT', 'PAYMENT', 'TRANSFER']

# Default high-amount percentile threshold (95th percentile)
HIGH_AMOUNT_PERCENTILE = 0.95

# Minimum batch size for percentile-based thresholds to be meaningful
MIN_BATCH_FOR_PERCENTILE = 20


def compute_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Derive hour-of-day from the PaySim step column.

    Step represents hours from the start of simulation (1 step = 1 hour).
    Hour = step % 24, giving a value in [0, 23].

    Args:
        df: DataFrame with a 'step' column.

    Returns:
        DataFrame with 'hour' column added.
    """
    df['hour'] = (df['step'] % 24).astype(int)
    return df


def compute_frequency_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute per-sender and per-receiver transaction counts within the batch.

    High transaction frequency from/to an account can indicate suspicious
    activity (e.g., rapid draining or mule account patterns).

    Args:
        df: DataFrame with 'nameOrig' and 'nameDest' columns.

    Returns:
        DataFrame with 'orig_txn_count' and 'dest_txn_count' columns added.
    """
    orig_counts = df.groupby('nameOrig').size()
    df['orig_txn_count'] = df['nameOrig'].map(orig_counts).astype(int)

    dest_counts = df.groupby('nameDest').size()
    df['dest_txn_count'] = df['nameDest'].map(dest_counts).astype(int)

    return df


def compute_high_amount_flag(df: pd.DataFrame, threshold: float = None) -> pd.DataFrame:
    """
    Flag transactions with amounts above a threshold as high-value.

    For batch sizes >= MIN_BATCH_FOR_PERCENTILE, the threshold is the
    95th percentile of amount. For smaller batches, the max amount is used
    (so no transaction is flagged unless an explicit threshold is given).

    Args:
        df: DataFrame with an 'amount' column.
        threshold: Optional explicit threshold. If None, computed from data.

    Returns:
        DataFrame with 'high_amount' binary column added.
    """
    if threshold is None:
        if len(df) >= MIN_BATCH_FOR_PERCENTILE:
            threshold = df['amount'].quantile(HIGH_AMOUNT_PERCENTILE)
        else:
            # For very small batches, use max (effectively flags nothing)
            threshold = df['amount'].max()

    df['high_amount'] = (df['amount'] > threshold).astype(int)
    return df


def encode_transaction_type(df: pd.DataFrame) -> pd.DataFrame:
    """
    One-hot encode the transaction type column deterministically.

    Always produces columns for ALL_TRANSACTION_TYPES regardless of which
    types are present in the current batch. This ensures consistent
    column order between training and inference.

    Args:
        df: DataFrame with a 'type' column.

    Returns:
        DataFrame with binary type_* columns added (original 'type' kept).
    """
    for t in ALL_TRANSACTION_TYPES:
        col_name = f'type_{t}'
        df[col_name] = (df['type'] == t).astype(int)

    return df


def build_feature_matrix(df: pd.DataFrame, threshold: float = None) -> pd.DataFrame:
    """
    Full feature engineering pipeline: time → frequency → amount flag → encoding.

    Orchestrates all feature transformations and returns a DataFrame with
    only the 12 model-expected columns in FEATURE_COLUMNS order.

    Prerequisites — the input df must have these columns:
      - step (int): simulation step
      - amount (float): transaction amount
      - oldbalanceOrg (float): sender's balance before transaction
      - oldbalanceDest (float): receiver's balance before transaction
      - nameOrig (str): sender account ID
      - nameDest (str): receiver account ID
      - type (str): transaction type (CASH_IN, CASH_OUT, etc.)

    Args:
        df: Input DataFrame with required columns.
        threshold: Optional high-amount threshold override.

    Returns:
        DataFrame with exactly 12 columns in FEATURE_COLUMNS order.
    """
    df = compute_time_features(df)
    df = compute_frequency_features(df)
    df = compute_high_amount_flag(df, threshold=threshold)
    df = encode_transaction_type(df)

    return df[FEATURE_COLUMNS]
