import os
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

def load_data():
    """Load training data from CSV files."""
    print("Loading training data for unsupervised model...")
    X_train = pd.read_csv("data/processed/X_train.csv")
    return X_train

def train_model(X_train):
    """Initialize and train the unsupervised Isolation Forest model."""
    print("\nInitializing and training Isolation Forest model...")
    model = IsolationForest(
        contamination=0.02, # Expected proportion of outliers
        random_state=42,    # For reproducibility
        n_jobs=-1           # Use all available cores
    )
    
    # Fit the model (unsupervised, so no y_train is passed)
    model.fit(X_train)
    return model

def save_model(model, filepath):
    """Save the trained Isolation Forest model to disk."""
    print(f"\nSaving Isolation Forest model to {filepath}...")
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    joblib.dump(model, filepath)
    print("Model successfully saved!")

def main():
    """Main execution block for unsupervised training pipeline."""
    X_train = load_data()
    model = train_model(X_train)
    save_model(model, "models/isolation_forest.pkl")
    print("\nIsolation Forest training complete!")

if __name__ == "__main__":
    main()
