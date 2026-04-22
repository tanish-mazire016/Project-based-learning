import numpy as np

def compute_ml_score(y_pred_proba):
    """
    Convert XGBoost probabilities (0 to 1) into a 0-100 ML risk score.
    """
    return np.clip(y_pred_proba * 100, 0, 100)

def compute_anomaly_score(raw_scores):
    """
    Accept Isolation Forest decision_function output and normalize to a 0-100 score.
    In Isolation Forest:
      - raw_scores < 0 indicating anomalies
      - raw_scores >= 0 indicating normal
    We want a higher score to equal higher risk (higher anomaly).
    Therefore, we invert the scores and use Min-Max scaling.
    """
    inverted_scores = -raw_scores
    
    min_val = inverted_scores.min()
    max_val = inverted_scores.max()
    score_range = max_val - min_val
    
    # Avoid division by zero if all instances are identical
    if score_range == 0:
        return np.zeros_like(inverted_scores)
        
    normalized = (inverted_scores - min_val) / score_range
    
    # Convert to 0-100 scale
    return np.clip(normalized * 100, 0, 100)

def combine_scores(ml_score, anomaly_score):
    """
    Combine supervised (ML) score and unsupervised (Anomaly) score into a final risk score.
    Weighting: 80% ML Score + 20% Anomaly Score
    """
    final_score = (0.8 * ml_score) + (0.2 * anomaly_score)
    
    # Ensure final score strictly stays within 0 and 100
    return np.clip(final_score, 0, 100)

def categorize_risk(score, high_threshold=80, medium_threshold=70):
    """
    Categorize a final numerical risk score (0-100) into a risk bucket.

    Thresholds are configurable to support dynamic adjustment from the
    backend's AppSetting table or via the adaptive engine.

    Args:
        score: Risk score on 0-100 scale.
        high_threshold: Score at/above which risk is HIGH (default: 80).
        medium_threshold: Score at/above which risk is MEDIUM (default: 70).

    Returns:
        One of "HIGH RISK", "MEDIUM RISK", or "LOW RISK".
    """
    if score >= high_threshold:
        return "HIGH RISK"
    elif score >= medium_threshold:
        return "MEDIUM RISK"
    else:
        return "LOW RISK"

if __name__ == "__main__":
    import pandas as pd
    import joblib
    import os
    
    print("Running standalone risk engine test on testing data...")
    
    try:
        # Load testing data
        print("Loading X_test...")
        X_test = pd.read_csv("data/processed/X_test.csv")
        
        # Load models
        print("Loading trained models...")
        xgb_model = joblib.load("models/xgb_model.pkl")
        iso_model = joblib.load("models/isolation_forest.pkl")
        
        # Generate raw predictions
        print("Generating raw model outputs...")
        y_pred_proba = xgb_model.predict_proba(X_test)[:, 1]
        anomaly_raw = iso_model.decision_function(X_test)
        
        # Compute risk scores
        print("Scoring testing data...\n")
        ml_scores = compute_ml_score(y_pred_proba)
        anomaly_scores = compute_anomaly_score(anomaly_raw)
        final_scores = combine_scores(ml_scores, anomaly_scores)
        
        # Print a sample table of 10 risks
        print("Sample of Risk Engine Outputs (First 15 records):")
        print(f"{'ML Score':<10} | {'Anomaly Score':<15} | {'Final Score':<12} | {'Risk Category'}")
        print("-" * 65)
        for i in range(min(15, len(final_scores))):
            cat = categorize_risk(final_scores[i])
            print(f"{ml_scores[i]:<10.2f} | {anomaly_scores[i]:<15.2f} | {final_scores[i]:<12.2f} | {cat}")
        
        print(f"Maximum risk score: {final_scores.max():.2f}")

        print("\nIf you want full metrics and classification reports, run `evaluate.py`.")
            
    except FileNotFoundError as e:
        print(f"\n[Error]: Missing a required file: {e}")
        print("Please ensure you have run `train_xgb.py` and `train_isolation.py` first to generate the models.")
    except Exception as e:
        print(f"\n[Error]: {e}")
