"""
Feature Engineering Pipeline for PaySim Fraud Detection Dataset

This script performs comprehensive feature engineering on the cleaned PaySim dataset,
optimized for large-scale data (~6 million rows) using vectorized operations.

Author: ML Engineer
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
import os
import warnings

warnings.filterwarnings('ignore')


def load_cleaned_dataset(filepath: str) -> pd.DataFrame:
    """
    Load the cleaned PaySim dataset with memory-optimized dtypes.

    Args:
        filepath: Path to the cleaned CSV file

    Returns:
        Loaded DataFrame with optimized dtypes
    """
    print("Loading cleaned dataset...")

    # Define dtypes for memory efficiency
    dtype_spec = {
        'step': 'int32',
        'type': 'category',
        'amount': 'float32',
        'nameOrig': 'str',
        'oldbalanceOrg': 'float32',
        'newbalanceOrig': 'float32',
        'nameDest': 'str',
        'oldbalanceDest': 'float32',
        'newbalanceDest': 'float32',
        'isFraud': 'int8'
    }

    df = pd.read_csv(filepath, dtype=dtype_spec)

    print(f"Dataset loaded: {df.shape[0]:,} rows, {df.shape[1]} columns")
    print(f"Memory usage: {df.memory_usage(deep=True).sum() / 1e6:.2f} MB")

    return df


def create_emptied_account_feature(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create indicator for transactions that completely drain the account.

    Args:
        df: Input DataFrame

    Returns:
        DataFrame with emptied account feature
    """
    print("\nCreating emptied account feature...")

    # True if the transaction amount exactly equals the original balance
    # Wait, because of float32, we should use a small tolerance, but == is what's typically done,
    # or >= to handle if amount is large. Let's use amount >= oldbalanceOrg.
    # But usually fraud specifically "empties" it:
    df['emptied_account'] = (df['amount'] >= df['oldbalanceOrg']).astype('int8')

    print(f"  Emptied accounts: {df['emptied_account'].sum():,}")

    return df


def create_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create time-based features from the step column.

    Step represents hours from the start of simulation (1 step = 1 hour).

    Args:
        df: Input DataFrame

    Returns:
        DataFrame with time features
    """
    print("\nCreating time features...")

    # Extract hour of day (0-23) using modulo operation
    df['hour'] = (df['step'] % 24).astype('int8')

    print(f"  hour: range [{df['hour'].min()}, {df['hour'].max()}]")

    return df


def create_frequency_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create transaction frequency features using vectorized groupby.

    High transaction frequency from/to an account can indicate suspicious activity.

    Args:
        df: Input DataFrame

    Returns:
        DataFrame with frequency features
    """
    print("\nCreating transaction frequency features...")

    # Count transactions per sender using vectorized map
    orig_counts = df.groupby('nameOrig').size()
    df['orig_txn_count'] = df['nameOrig'].map(orig_counts).astype('int32')

    # Count transactions per receiver using vectorized map
    dest_counts = df.groupby('nameDest').size()
    df['dest_txn_count'] = df['nameDest'].map(dest_counts).astype('int32')

    print(f"  orig_txn_count: mean={df['orig_txn_count'].mean():.2f}, max={df['orig_txn_count'].max()}")
    print(f"  dest_txn_count: mean={df['dest_txn_count'].mean():.2f}, max={df['dest_txn_count'].max()}")

    return df


def create_high_amount_flag(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create flag for high-value transactions (above 95th percentile).

    Large transactions are statistically more likely to be fraudulent.

    Args:
        df: Input DataFrame

    Returns:
        DataFrame with high amount flag
    """
    print("\nCreating high amount flag...")

    # Calculate 95th percentile threshold
    threshold = df['amount'].quantile(0.95)

    # Create binary flag using vectorized comparison
    df['high_amount'] = (df['amount'] > threshold).astype('int8')

    high_count = df['high_amount'].sum()
    print(f"  95th percentile threshold: ${threshold:,.2f}")
    print(f"  High amount transactions: {high_count:,} ({100 * high_count / len(df):.2f}%)")

    return df


def create_amount_ratio_feature(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create amount-to-balance ratio feature.

    Transactions that deplete a significant portion of balance may be suspicious.

    Args:
        df: Input DataFrame

    Returns:
        DataFrame with amount ratio feature
    """
    print("\nCreating amount ratio feature...")

    # Ratio of amount to original balance (add 1 to avoid division by zero)
    df['amount_to_balance_ratio'] = (
        df['amount'] / (df['oldbalanceOrg'] + 1)
    ).astype('float32')

    # Cap extreme values to prevent outliers from dominating
    cap_value = df['amount_to_balance_ratio'].quantile(0.99)
    df['amount_to_balance_ratio'] = df['amount_to_balance_ratio'].clip(upper=cap_value)

    print(f"  amount_to_balance_ratio: mean={df['amount_to_balance_ratio'].mean():.4f}, max={df['amount_to_balance_ratio'].max():.4f}")

    return df


def drop_identifier_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Drop identifier columns that should not be used as features.

    These columns are unique identifiers with no predictive value.

    Args:
        df: Input DataFrame

    Returns:
        DataFrame with identifier columns removed
    """
    print("\nDropping identifier columns...")

    columns_to_drop = ['nameOrig', 'nameDest', 'newbalanceOrig', 'newbalanceDest']

    # Also drop isFlaggedFraud if present (rule-based, not useful for ML)
    if 'isFlaggedFraud' in df.columns:
        columns_to_drop.append('isFlaggedFraud')

    existing_cols = [col for col in columns_to_drop if col in df.columns]
    df = df.drop(columns=existing_cols)

    print(f"  Dropped columns: {existing_cols}")

    return df


def encode_categorical_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    One-hot encode the 'type' categorical column.

    Args:
        df: Input DataFrame

    Returns:
        DataFrame with one-hot encoded transaction types
    """
    print("\nOne-hot encoding categorical features...")

    # Get unique transaction types before encoding
    unique_types = df['type'].unique().tolist()
    print(f"  Transaction types: {unique_types}")

    # One-hot encode with prefix for clarity
    type_dummies = pd.get_dummies(df['type'], prefix='type', dtype='int8')

    # Concatenate with original DataFrame
    df = pd.concat([df, type_dummies], axis=1)

    # Drop original 'type' column
    df = df.drop(columns=['type'])

    print(f"  Created {len(type_dummies.columns)} binary columns")

    return df


def verify_numerical_features(df: pd.DataFrame) -> bool:
    """
    Verify that all features are numerical.

    Args:
        df: Input DataFrame

    Returns:
        True if all features are numerical
    """
    print("\nVerifying all features are numerical...")

    non_numeric = df.select_dtypes(exclude=['number']).columns.tolist()

    if non_numeric:
        print(f"  WARNING: Non-numerical columns found: {non_numeric}")
        return False

    print(f"  All {len(df.columns)} columns are numerical")
    return True


def optimize_memory(df: pd.DataFrame) -> pd.DataFrame:
    """
    Optimize DataFrame memory by downcasting numeric types.

    Args:
        df: Input DataFrame

    Returns:
        Memory-optimized DataFrame
    """
    print("\nOptimizing memory usage...")

    initial_mem = df.memory_usage(deep=True).sum() / 1e6

    # Downcast integers
    int_cols = df.select_dtypes(include=['int64']).columns
    for col in int_cols:
        df[col] = pd.to_numeric(df[col], downcast='integer')

    # Downcast floats
    float_cols = df.select_dtypes(include=['float64']).columns
    for col in float_cols:
        df[col] = pd.to_numeric(df[col], downcast='float')

    final_mem = df.memory_usage(deep=True).sum() / 1e6
    reduction = (1 - final_mem / initial_mem) * 100

    print(f"  Memory: {initial_mem:.2f} MB -> {final_mem:.2f} MB ({reduction:.1f}% reduction)")

    return df


def save_datasets(
    X: pd.DataFrame,
    y: pd.Series,
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: pd.Series,
    y_test: pd.Series,
    output_dir: str
) -> None:
    """
    Save all processed datasets to CSV files.

    Args:
        X: Full feature set
        y: Full target set
        X_train: Training features
        X_test: Testing features
        y_train: Training labels
        y_test: Testing labels
        output_dir: Output directory path
    """
    print("\n" + "=" * 50)
    print("SAVING DATASETS")
    print("=" * 50)

    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Save train/test splits
    X_train.to_csv(os.path.join(output_dir, 'X_train.csv'), index=False)
    print(f"Saved: X_train.csv ({X_train.shape[0]:,} rows)")

    X_test.to_csv(os.path.join(output_dir, 'X_test.csv'), index=False)
    print(f"Saved: X_test.csv ({X_test.shape[0]:,} rows)")

    y_train.to_csv(os.path.join(output_dir, 'y_train.csv'), index=False)
    print(f"Saved: y_train.csv ({y_train.shape[0]:,} rows)")

    y_test.to_csv(os.path.join(output_dir, 'y_test.csv'), index=False)
    print(f"Saved: y_test.csv ({y_test.shape[0]:,} rows)")


def print_feature_summary(X: pd.DataFrame, y: pd.Series) -> None:
    """
    Print summary of engineered features.

    Args:
        X: Feature DataFrame
        y: Target Series
    """
    print("\n" + "=" * 50)
    print("FEATURE SUMMARY")
    print("=" * 50)

    print(f"\nTotal features: {len(X.columns)}")
    print("\nFeature list:")
    for i, col in enumerate(X.columns, 1):
        dtype = X[col].dtype
        print(f"  {i:2d}. {col:25} ({dtype})")

    print(f"\nTarget distribution:")
    print(f"  Legitimate: {(y == 0).sum():,} ({100 * (y == 0).mean():.3f}%)")
    print(f"  Fraud:      {(y == 1).sum():,} ({100 * (y == 1).mean():.3f}%)")


def main():
    """Main feature engineering pipeline."""

    print("=" * 60)
    print("PaySim Fraud Detection - Feature Engineering Pipeline")
    print("=" * 60)

    # Configuration
    INPUT_PATH = 'data/processed/clean_paysim.csv'
    OUTPUT_DIR = 'data/processed'
    TEST_SIZE = 0.2
    RANDOM_STATE = 42

    # Step 1: Load cleaned dataset
    df = load_cleaned_dataset(INPUT_PATH)

    # Step 2: Feature Engineering
    print("\n" + "-" * 50)
    print("FEATURE ENGINEERING")
    print("-" * 50)

    # a) Emptied account feature (disabled per user request)
    # df = create_emptied_account_feature(df)

    # b) Time features
    df = create_time_features(df)

    # c) Transaction frequency features
    df = create_frequency_features(df)

    # d) High amount flag
    df = create_high_amount_flag(df)

    # e) Amount ratio feature (disabled per user request)
    # df = create_amount_ratio_feature(df)

    # Step 3: One-hot encode categorical features
    df = encode_categorical_features(df)

    # Step 4: Drop identifier columns
    df = drop_identifier_columns(df)

    # Step 5: Separate features (X) and target (y)
    print("\nSeparating features and target...")
    y = df['isFraud'].copy()
    X = df.drop(columns=['isFraud'])

    # Step 6: Verify all features are numerical
    verify_numerical_features(X)

    # Optimize memory
    X = optimize_memory(X)

    # Print feature summary
    print_feature_summary(X, y)

    # Save full featured dataset before dropping 'step' or splitting
    print("\n" + "=" * 50)
    print("SAVING FULL FEATURED DATASET")
    print("=" * 50)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    featured_df = pd.concat([X, y], axis=1)
    featured_path = os.path.join(OUTPUT_DIR, 'featured_paysim.csv')
    featured_df.to_csv(featured_path, index=False)
    
    # Safely import os.path to print size if we want, it's already imported
    print(f"Saved: featured_paysim.csv ({os.path.getsize(featured_path) / 1e6:.2f} MB)")

    # Step 7: Stratified Train/Test Split
    print("\n" + "=" * 50)
    print("STRATIFIED TRAIN/TEST SPLIT")
    print("=" * 50)

    # Drop step feature as it shouldn't be used for modeling
    print("\nDropping 'step' feature before split...")
    X = X.drop(columns=['step'], errors='ignore')

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, stratify=y, random_state=RANDOM_STATE
    )

    print(f"\nDataset shapes:")
    print(f"  X_train: {X_train.shape}")
    print(f"  X_test:  {X_test.shape}")
    print(f"  y_train: {y_train.shape}")
    print(f"  y_test:  {y_test.shape}")

    print(f"\nClass distribution (stratified):")
    print(f"  Train - Fraud: {y_train.sum():,} ({100 * y_train.mean():.3f}%)")
    print(f"  Test  - Fraud: {y_test.sum():,} ({100 * y_test.mean():.3f}%)")

    # Step 8: Save all datasets
    save_datasets(X, y, X_train, X_test, y_train, y_test, OUTPUT_DIR)

    print("\n" + "=" * 60)
    print("Feature Engineering Complete!")
    print("=" * 60)

    return X_train, X_test, y_train, y_test


if __name__ == "__main__":
    X_train, X_test, y_train, y_test = main()
