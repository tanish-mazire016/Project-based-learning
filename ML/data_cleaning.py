"""
Data Cleaning Pipeline for PaySim Fraud Detection Dataset

This script performs comprehensive data cleaning and validation,
optimized for large-scale data (~6 million rows).

Author: ML Engineer
"""

import pandas as pd
import numpy as np
import os
import warnings

warnings.filterwarnings('ignore')


def load_dataset(filepath: str) -> pd.DataFrame:
    """
    Load the PaySim dataset with memory-optimized dtypes.

    Args:
        filepath: Path to the CSV file

    Returns:
        Loaded DataFrame
    """
    print("Loading dataset...")

    # Define dtypes for memory efficiency
    dtype_spec = {
        'step': 'int32',
        'type': 'category',
        'amount': 'float64',
        'nameOrig': 'str',
        'oldbalanceOrg': 'float64',
        'newbalanceOrig': 'float64',
        'nameDest': 'str',
        'oldbalanceDest': 'float64',
        'newbalanceDest': 'float64',
        'isFraud': 'int8',
        'isFlaggedFraud': 'int8'
    }

    df = pd.read_csv(filepath, dtype=dtype_spec)

    print(f"Dataset loaded: {df.shape[0]:,} rows, {df.shape[1]} columns")
    print(f"Memory usage: {df.memory_usage(deep=True).sum() / 1e6:.2f} MB")

    return df


def check_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    """
    Check for missing values and print summary.

    Args:
        df: Input DataFrame

    Returns:
        DataFrame (unchanged if no missing values)
    """
    print("\n" + "=" * 50)
    print("MISSING VALUES CHECK")
    print("=" * 50)

    # Calculate missing values
    missing_count = df.isnull().sum()
    missing_percent = (df.isnull().sum() / len(df)) * 100

    # Create summary DataFrame
    missing_summary = pd.DataFrame({
        'Column': df.columns,
        'Missing Count': missing_count.values,
        'Missing %': missing_percent.values
    })

    # Print summary
    print("\nMissing Values Summary:")
    print(missing_summary.to_string(index=False))

    total_missing = missing_count.sum()
    if total_missing == 0:
        print("\nResult: No missing values found.")
    else:
        print(f"\nResult: {total_missing:,} total missing values found.")
        # Handle missing values - drop rows with any missing
        initial_rows = len(df)
        df = df.dropna()
        dropped_rows = initial_rows - len(df)
        print(f"Action: Dropped {dropped_rows:,} rows with missing values.")

    return df


def remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """
    Remove duplicate rows from the dataset.

    Args:
        df: Input DataFrame

    Returns:
        DataFrame with duplicates removed
    """
    print("\n" + "=" * 50)
    print("DUPLICATE CHECK")
    print("=" * 50)

    initial_rows = len(df)
    duplicates = df.duplicated().sum()

    print(f"Duplicate rows found: {duplicates:,}")

    if duplicates > 0:
        df = df.drop_duplicates()
        print(f"Action: Removed {duplicates:,} duplicate rows.")
        print(f"Rows remaining: {len(df):,}")
    else:
        print("Result: No duplicates found.")

    return df


def validate_data_types(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ensure correct data types for all columns.

    Args:
        df: Input DataFrame

    Returns:
        DataFrame with corrected data types
    """
    print("\n" + "=" * 50)
    print("DATA TYPE VALIDATION")
    print("=" * 50)

    # Expected data types
    expected_types = {
        'step': 'int32',
        'type': 'category',
        'amount': 'float32',
        'nameOrig': 'object',
        'oldbalanceOrg': 'float32',
        'newbalanceOrig': 'float32',
        'nameDest': 'object',
        'oldbalanceDest': 'float32',
        'newbalanceDest': 'float32',
        'isFraud': 'int8',
        'isFlaggedFraud': 'int8'
    }

    print("\nCurrent vs Expected Data Types:")
    print("-" * 40)

    for col in df.columns:
        current_type = str(df[col].dtype)
        expected = expected_types.get(col, 'N/A')
        status = "OK" if current_type == expected else "CONVERT"
        print(f"  {col:20} | Current: {current_type:10} | Expected: {expected:10} | {status}")

    # Convert to correct types
    print("\nConverting data types...")

    # Numeric columns to float32 (memory optimization)
    float_cols = ['amount', 'oldbalanceOrg', 'newbalanceOrig', 'oldbalanceDest', 'newbalanceDest']
    for col in float_cols:
        df[col] = df[col].astype('float32')

    # Integer columns
    df['step'] = df['step'].astype('int32')
    df['isFraud'] = df['isFraud'].astype('int8')

    if 'isFlaggedFraud' in df.columns:
        df['isFlaggedFraud'] = df['isFlaggedFraud'].astype('int8')

    # Categorical
    if df['type'].dtype.name != 'category':
        df['type'] = df['type'].astype('category')

    print("Data types converted successfully.")

    return df


def check_invalid_values(df: pd.DataFrame) -> pd.DataFrame:
    """
    Check for negative or invalid values in balance/amount columns.

    Args:
        df: Input DataFrame

    Returns:
        DataFrame with invalid values handled
    """
    print("\n" + "=" * 50)
    print("INVALID VALUES CHECK")
    print("=" * 50)

    # Columns to check for negative values
    numeric_cols = ['amount', 'oldbalanceOrg', 'newbalanceOrig', 'oldbalanceDest', 'newbalanceDest']

    print("\nChecking for negative values:")
    print("-" * 40)

    invalid_rows = pd.Series([False] * len(df))

    for col in numeric_cols:
        negative_count = (df[col] < 0).sum()
        negative_pct = (negative_count / len(df)) * 100

        if negative_count > 0:
            print(f"  {col:20}: {negative_count:,} negative values ({negative_pct:.4f}%)")
            invalid_rows |= (df[col] < 0)
        else:
            print(f"  {col:20}: No negative values")

    # Check for extremely large values (potential data errors)
    print("\nChecking for extreme outliers (> 1 billion):")
    print("-" * 40)

    for col in numeric_cols:
        extreme_count = (df[col] > 1e9).sum()
        if extreme_count > 0:
            print(f"  {col:20}: {extreme_count:,} extreme values")
        else:
            print(f"  {col:20}: No extreme values")

    # Check for NaN or Inf values
    print("\nChecking for NaN/Inf values:")
    print("-" * 40)

    for col in numeric_cols:
        nan_count = df[col].isna().sum()
        inf_count = np.isinf(df[col]).sum() if np.issubdtype(df[col].dtype, np.floating) else 0

        if nan_count > 0 or inf_count > 0:
            print(f"  {col:20}: {nan_count} NaN, {inf_count} Inf")
            invalid_rows |= df[col].isna() | np.isinf(df[col])
        else:
            print(f"  {col:20}: Clean")

    # Handle invalid values
    total_invalid = invalid_rows.sum()
    if total_invalid > 0:
        print(f"\nTotal rows with invalid values: {total_invalid:,}")
        print("Action: Flagging invalid rows (keeping for analysis)")
        df['has_invalid_values'] = invalid_rows.astype('int8')
    else:
        print("\nResult: No invalid values found.")

    return df


def verify_balance_relationships(df: pd.DataFrame) -> pd.DataFrame:
    """
    Verify that balance relationships are logical.

    For legitimate transactions:
    - newbalanceOrig should roughly equal oldbalanceOrg - amount (for outgoing)
    - newbalanceDest should roughly equal oldbalanceDest + amount (for incoming)

    Args:
        df: Input DataFrame

    Returns:
        DataFrame with balance discrepancy flags
    """
    print("\n" + "=" * 50)
    print("BALANCE RELATIONSHIP VERIFICATION")
    print("=" * 50)

    # Calculate expected balances
    # Origin: after transaction, balance should decrease by amount
    df['expected_newbalanceOrig'] = df['oldbalanceOrg'] - df['amount']
    df['balance_diff_orig'] = np.abs(df['newbalanceOrig'] - df['expected_newbalanceOrig'])

    # Destination: after transaction, balance should increase by amount
    df['expected_newbalanceDest'] = df['oldbalanceDest'] + df['amount']
    df['balance_diff_dest'] = np.abs(df['newbalanceDest'] - df['expected_newbalanceDest'])

    # Tolerance for floating point comparison (0.01)
    tolerance = 0.01

    # Check origin balance discrepancies
    orig_mismatch = df['balance_diff_orig'] > tolerance
    dest_mismatch = df['balance_diff_dest'] > tolerance

    print("\nBalance Discrepancy Analysis:")
    print("-" * 40)

    # By transaction type
    print("\nOrigin Balance Mismatches by Transaction Type:")
    orig_mismatch_by_type = df[orig_mismatch].groupby('type').size()
    if len(orig_mismatch_by_type) > 0:
        for txn_type, count in orig_mismatch_by_type.items():
            type_total = (df['type'] == txn_type).sum()
            pct = (count / type_total) * 100
            print(f"  {txn_type:15}: {count:,} mismatches ({pct:.2f}%)")
    else:
        print("  No mismatches found.")

    print("\nDestination Balance Mismatches by Transaction Type:")
    dest_mismatch_by_type = df[dest_mismatch].groupby('type').size()
    if len(dest_mismatch_by_type) > 0:
        for txn_type, count in dest_mismatch_by_type.items():
            type_total = (df['type'] == txn_type).sum()
            pct = (count / type_total) * 100
            print(f"  {txn_type:15}: {count:,} mismatches ({pct:.2f}%)")
    else:
        print("  No mismatches found.")

    # Fraud correlation with balance mismatches
    print("\nBalance Mismatch vs Fraud Correlation:")
    print("-" * 40)

    fraud_with_orig_mismatch = df[orig_mismatch & (df['isFraud'] == 1)].shape[0]
    fraud_total = df['isFraud'].sum()

    if fraud_total > 0:
        print(f"  Fraudulent txns with origin mismatch: {fraud_with_orig_mismatch:,} ({100*fraud_with_orig_mismatch/fraud_total:.1f}% of all fraud)")

    # Clean up temporary columns
    df = df.drop(columns=['expected_newbalanceOrig', 'expected_newbalanceDest',
                          'balance_diff_orig', 'balance_diff_dest'])

    print("\nNote: Balance discrepancies are normal for CASH_IN/CASH_OUT")
    print("and can indicate fraud in TRANSFER transactions.")

    return df


def print_statistics(df: pd.DataFrame) -> None:
    """
    Print basic statistics about the dataset.

    Args:
        df: Input DataFrame
    """
    print("\n" + "=" * 50)
    print("DATASET STATISTICS")
    print("=" * 50)

    # Info summary
    print("\nDataset Info:")
    print("-" * 40)
    print(f"  Total rows: {len(df):,}")
    print(f"  Total columns: {len(df.columns)}")
    print(f"  Memory usage: {df.memory_usage(deep=True).sum() / 1e6:.2f} MB")

    # Transaction type distribution
    print("\nTransaction Type Distribution:")
    print("-" * 40)
    type_counts = df['type'].value_counts()
    for txn_type, count in type_counts.items():
        pct = (count / len(df)) * 100
        print(f"  {txn_type:15}: {count:>10,} ({pct:5.2f}%)")

    # Fraud distribution
    print("\nFraud Distribution:")
    print("-" * 40)
    fraud_counts = df['isFraud'].value_counts()
    for label, count in fraud_counts.items():
        pct = (count / len(df)) * 100
        status = "Fraud" if label == 1 else "Legitimate"
        print(f"  {status:15}: {count:>10,} ({pct:6.3f}%)")

    # Fraud by transaction type
    print("\nFraud by Transaction Type:")
    print("-" * 40)
    fraud_by_type = df[df['isFraud'] == 1].groupby('type').size()
    for txn_type, count in fraud_by_type.items():
        type_total = (df['type'] == txn_type).sum()
        pct = (count / type_total) * 100
        print(f"  {txn_type:15}: {count:>6,} fraudulent ({pct:5.2f}%)")

    # Numerical columns statistics
    print("\nNumerical Columns Statistics:")
    print("-" * 40)
    numeric_cols = ['amount', 'oldbalanceOrg', 'newbalanceOrig', 'oldbalanceDest', 'newbalanceDest']
    stats = df[numeric_cols].describe()
    print(stats.round(2).to_string())

    # Step (time) distribution
    print("\nTime (Step) Distribution:")
    print("-" * 40)
    print(f"  Min step: {df['step'].min()}")
    print(f"  Max step: {df['step'].max()}")
    print(f"  Unique steps: {df['step'].nunique()}")


def save_cleaned_dataset(df: pd.DataFrame, output_path: str) -> None:
    """
    Save the cleaned dataset to CSV.

    Args:
        df: Cleaned DataFrame
        output_path: Output file path
    """
    print("\n" + "=" * 50)
    print("SAVING CLEANED DATASET")
    print("=" * 50)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Save to CSV
    df.to_csv(output_path, index=False)

    # Get file size
    file_size = os.path.getsize(output_path) / 1e6

    print(f"\nSaved to: {output_path}")
    print(f"File size: {file_size:.2f} MB")
    print(f"Rows: {len(df):,}")
    print(f"Columns: {len(df.columns)}")


def main():
    """Main data cleaning pipeline."""

    print("=" * 60)
    print("PaySim Fraud Detection - Data Cleaning Pipeline")
    print("=" * 60)

    # Configuration
    DATA_PATH = 'dataset/transactions_reduced.csv'
    OUTPUT_PATH = 'data/processed/clean_paysim.csv'

    # Step 1: Load dataset
    df = load_dataset(DATA_PATH)

    # Step 2: Check and handle missing values
    df = check_missing_values(df)

    # Step 3: Remove duplicates
    df = remove_duplicates(df)

    # Step 4: Validate and correct data types
    df = validate_data_types(df)

    # Step 5: Check for invalid values
    df = check_invalid_values(df)

    # Step 6: Verify balance relationships
    df = verify_balance_relationships(df)

    # Step 7: Print statistics
    print_statistics(df)

    # Step 8: Save cleaned dataset
    save_cleaned_dataset(df, OUTPUT_PATH)

    print("\n" + "=" * 60)
    print("Data Cleaning Complete!")
    print("=" * 60)

    return df


if __name__ == "__main__":
    cleaned_df = main()
