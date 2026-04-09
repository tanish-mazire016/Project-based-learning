import os
import pandas as pd
import numpy as np
import xgboost as xgb
import joblib

def load_data():
    """Load training data from CSV files."""
    print("Loading training data...")
    X_train = pd.read_csv("data/processed/X_train.csv")
    y_train = pd.read_csv("data/processed/y_train.csv")
    
    # Convert target to 1D array required by XGBoost/scikit-learn
    print("Converting target variable to 1D array...")
    y_train = y_train.values.ravel()
    
    return X_train, y_train

def train_model(X_train, y_train):
    """Initialize and train the XGBoost classifier."""
    print("\nCalculating scale_pos_weight...")
    # Calculate scale_pos_weight to handle class imbalance
    negative_cases = np.sum(y_train == 0)
    positive_cases = np.sum(y_train == 1)
    scale_pos_weight_value = negative_cases / positive_cases
    print(f"Calculated scale_pos_weight: {scale_pos_weight_value:.2f}")

    print("\nInitializing and training XGBoost model...")
    model = xgb.XGBClassifier(
        n_estimators=100,               # Number of trees
        learning_rate=0.1,              # Step size shrinkage
        max_depth=5,                    # Maximum depth of a tree
        scale_pos_weight=scale_pos_weight_value, # Handle class imbalance
        tree_method='hist',             # Updated tree_method
        device='cuda',                  # GPU acceleration (XGBoost 2.0+ syntax)
        random_state=42                 # For reproducibility
    )
    
    # Fit the model
    model.fit(X_train, y_train, verbose=10)
    return model

def save_model(model, filepath):
    """Save the trained model to disk."""
    print(f"\nSaving model to {filepath}...")
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    joblib.dump(model, filepath)
    print("Model successfully saved!")

def main():
    """Main execution block for training pipeline."""
    # 1. Load data
    X_train, y_train = load_data()
    
    # 2. Train model
    model = train_model(X_train, y_train)
    
    # 3. Save model
    save_model(model, "models/xgb_model.pkl")
    
    print("\nTraining pipeline complete!")

if __name__ == "__main__":
    main()
