"""
Cleaning Service — bridges data_cleaning.py logic into the pipeline.

Adapts the batch-level data cleaning functions from ML/data_cleaning.py
for operation on lists of row dicts rather than full CSVs.

The original ML/data_cleaning.py is NOT modified.
"""

import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

# PaySim expected columns
PAYSIM_COLUMNS = [
    'step', 'type', 'amount', 'nameOrig', 'oldbalanceOrg',
    'newbalanceOrig', 'nameDest', 'oldbalanceDest', 'newbalanceDest',
    'isFraud', 'isFlaggedFraud',
]

NUMERIC_COLUMNS = ['amount', 'oldbalanceOrg', 'newbalanceOrig', 'oldbalanceDest', 'newbalanceDest']

VALID_TRANSACTION_TYPES = {'CASH_IN', 'CASH_OUT', 'DEBIT', 'PAYMENT', 'TRANSFER'}


def clean_batch(rows: list[dict]) -> dict:
    """
    Clean a batch of raw row dicts using the same logic as data_cleaning.py.

    Returns:
        {
            'valid_rows': [dict, ...],
            'rejected_rows': [{'row': dict, 'reason': str}, ...]
        }
    """
    valid_rows = []
    rejected_rows = []

    if not rows:
        return {'valid_rows': valid_rows, 'rejected_rows': rejected_rows}

    # Convert to DataFrame for vectorized operations
    df = pd.DataFrame(rows)

    # --- Step 1: Check required columns ---
    # Rows missing critical columns are rejected individually
    for idx, row in enumerate(rows):
        missing = [c for c in ['step', 'type', 'amount', 'nameOrig', 'nameDest'] if c not in row or row[c] is None]
        if missing:
            rejected_rows.append({
                'row': row,
                'reason': f"Missing required columns: {', '.join(missing)}"
            })
            df = df.drop(idx, errors='ignore')

    if df.empty:
        return {'valid_rows': valid_rows, 'rejected_rows': rejected_rows}

    # Reset index after dropping
    df = df.reset_index(drop=True)

    # --- Step 2: Check for missing values (from check_missing_values) ---
    null_mask = df.isnull().any(axis=1)
    for idx in df[null_mask].index:
        null_cols = df.columns[df.iloc[idx].isnull()].tolist()
        rejected_rows.append({
            'row': df.iloc[idx].to_dict(),
            'reason': f"Null values in columns: {', '.join(null_cols)}"
        })
    df = df[~null_mask].reset_index(drop=True)

    if df.empty:
        return {'valid_rows': valid_rows, 'rejected_rows': rejected_rows}

    # --- Step 3: Remove duplicates (from remove_duplicates) ---
    dup_mask = df.duplicated(keep='first')
    for idx in df[dup_mask].index:
        rejected_rows.append({
            'row': df.iloc[idx].to_dict(),
            'reason': 'Duplicate row within batch'
        })
    df = df[~dup_mask].reset_index(drop=True)

    if df.empty:
        return {'valid_rows': valid_rows, 'rejected_rows': rejected_rows}

    # --- Step 4: Validate data types (from validate_data_types) ---
    rows_to_drop = set()
    for idx in range(len(df)):
        try:
            float(df.at[idx, 'amount'])
            int(df.at[idx, 'step'])
        except (ValueError, TypeError):
            rejected_rows.append({
                'row': df.iloc[idx].to_dict(),
                'reason': f"Invalid data types: amount={df.at[idx, 'amount']}, step={df.at[idx, 'step']}"
            })
            rows_to_drop.add(idx)

    if rows_to_drop:
        df = df.drop(index=list(rows_to_drop)).reset_index(drop=True)

    if df.empty:
        return {'valid_rows': valid_rows, 'rejected_rows': rejected_rows}

    # Cast numeric columns
    for col in NUMERIC_COLUMNS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    df['step'] = pd.to_numeric(df['step'], errors='coerce').astype('Int64')

    # --- Step 5: Check invalid values (from check_invalid_values) ---
    rows_to_drop = set()
    for col in NUMERIC_COLUMNS:
        if col not in df.columns:
            continue
        neg_mask = df[col] < 0
        for idx in df[neg_mask].index:
            if idx not in rows_to_drop:
                rejected_rows.append({
                    'row': df.iloc[idx].to_dict(),
                    'reason': f"Negative value in {col}: {df.at[idx, col]}"
                })
                rows_to_drop.add(idx)

    if rows_to_drop:
        df = df.drop(index=list(rows_to_drop)).reset_index(drop=True)

    if df.empty:
        return {'valid_rows': valid_rows, 'rejected_rows': rejected_rows}

    # --- Step 6: Validate transaction type ---
    rows_to_drop = set()
    if 'type' in df.columns:
        invalid_type_mask = ~df['type'].isin(VALID_TRANSACTION_TYPES)
        for idx in df[invalid_type_mask].index:
            if idx not in rows_to_drop:
                rejected_rows.append({
                    'row': df.iloc[idx].to_dict(),
                    'reason': f"Invalid transaction type: {df.at[idx, 'type']}"
                })
                rows_to_drop.add(idx)

    if rows_to_drop:
        df = df.drop(index=list(rows_to_drop)).reset_index(drop=True)

    # --- Step 7: Compute statistical outlier flag ---
    # is_outlier = amount > mean + 3*std (statistical outlier, NOT isFraud)
    if len(df) > 1:
        amount_mean = df['amount'].mean()
        amount_std = df['amount'].std()
        df['is_outlier'] = (df['amount'] > (amount_mean + 3 * amount_std))
    else:
        df['is_outlier'] = False

    # Convert valid rows to list of dicts
    valid_rows = df.to_dict(orient='records')

    # Ensure serializable types
    for row in valid_rows:
        for key, val in row.items():
            if isinstance(val, (np.integer,)):
                row[key] = int(val)
            elif isinstance(val, (np.floating,)):
                row[key] = float(val)
            elif isinstance(val, (np.bool_,)):
                row[key] = bool(val)

    logger.info(f"Batch cleaned: {len(valid_rows)} valid, {len(rejected_rows)} rejected")

    return {'valid_rows': valid_rows, 'rejected_rows': rejected_rows}
