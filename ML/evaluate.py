import pandas as pd
import numpy as np
import joblib
from collections import Counter
from sklearn.metrics import classification_report, recall_score, precision_score, fbeta_score, roc_auc_score

# Import our modular risk engine
from risk_engine import compute_ml_score, compute_anomaly_score, combine_scores, categorize_risk

def load_data():
    """Load evaluation test set from CSV files."""
    print("Loading test data...")
    X_test = pd.read_csv("data/processed/X_test.csv")
    y_test = pd.read_csv("data/processed/y_test.csv")
    # Convert target to 1D array
    y_test = y_test.values.ravel()
    
    return X_test, y_test

def load_models():
    """Load the supervised and unsupervised models from disk."""
    print("Loading models from disk...")
    xgb_model = joblib.load("models/xgb_model.pkl")
    iso_model = joblib.load("models/isolation_forest.pkl")
    return xgb_model, iso_model

def evaluate_system(xgb_model, iso_model, X_test, y_test):
    """Drive the evaluation of the combined risk engine system."""
    
    # --- 1. GENERATE MODEL OUTPUTS ---
    print("\nGenerating model outputs...")
    # Probabilities from XGBoost (for class 1: fraud)
    y_pred_proba = xgb_model.predict_proba(X_test)[:, 1]
    
    # Raw anomaly scores from Isolation Forest
    anomaly_raw_scores = iso_model.decision_function(X_test)
    
    # --- 2. COMPUTE SCORES USING RISK ENGINE ---
    print("Computing Risk Scores...")
    ml_score = compute_ml_score(y_pred_proba)
    anomaly_score = compute_anomaly_score(anomaly_raw_scores)
    final_score = combine_scores(ml_score, anomaly_score)
    
    # --- 3. CATEGORIZE RISKS ---
    print("Categorizing Risk Levels...")
    risk_labels = [categorize_risk(s) for s in final_score]
    
    # Print the distribution of risk labels
    risk_distribution = Counter(risk_labels)
    print("\nRisk Level Distribution:")
    for level in ["HIGH RISK", "MEDIUM RISK", "LOW RISK"]:
        print(f"  - {level}: {risk_distribution.get(level, 0)}")

    # --- 4. CONVERT TO BINARY PREDICTIONS & EVALUATE ---
    # Map HIGH RISK to 1 (fraud prediction) and others to 0 (normal)
    y_pred_binary = np.array([1 if r == "HIGH RISK" else 0 for r in risk_labels])
    
    print(f"\n{'='*50}")
    print("Combined Risk Engine Evaluation Results")
    print(f"{'='*50}")
    
    print("\nClassification Report (HIGH RISK = Fraud):")
    print(classification_report(y_test, y_pred_binary, digits=4))
    
    # Calculate specific metrics
    recall = recall_score(y_test, y_pred_binary, pos_label=1)
    precision = precision_score(y_test, y_pred_binary, pos_label=1)
    f2 = fbeta_score(y_test, y_pred_binary, beta=2, pos_label=1)
    
    # We use final_score normalized to 0.0 - 1.0 as the probability proxy for ROC-AUC evaluation.
    roc_auc = roc_auc_score(y_test, final_score / 100.0)
    
    print("Detailed Metrics (Fraud / HIGH RISK Class):")
    print(f"- Recall:        {recall:.4f} (Ability to catch true frauds via HIGH RISK)")
    print(f"- Precision:     {precision:.4f} (Accuracy of HIGH RISK fraud predictions)")
    print(f"- F2 Score:      {f2:.4f} (Harmonic mean placing more weight on recall)")
    print(f"- ROC-AUC Score: {roc_auc:.4f} (System-wide ability to distinguish fraud)")

def main():
    """Main execution block for evaluation."""
    # 1. Load data
    X_test, y_test = load_data()
    
    # 2. Load trained models
    xgb_model, iso_model = load_models()
    
    # 3. Process through Risk Engine & Evaluate
    evaluate_system(xgb_model, iso_model, X_test, y_test)
    
    print("\nEvaluation pipeline complete!")

if __name__ == "__main__":
    main()
