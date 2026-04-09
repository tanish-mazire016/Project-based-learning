import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, CheckCircle, Loader } from "lucide-react";
import { getReviewDetail, submitFeedback } from "../api/client";
import RiskGauge from "../Components/RiskGauge";

const VERDICT_OPTIONS = ["FRAUD", "LEGITIMATE", "UNCERTAIN"];

export default function ReviewDetailView() {
  const { reviewId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [verdict, setVerdict] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getReviewDetail(reviewId);
        setData(res);
      } catch (err) {
        setError("Failed to load review details");
      } finally {
        setLoading(false);
      }
    })();
  }, [reviewId]);

  const handleSubmit = async () => {
    if (!verdict) { setError("Please select a verdict"); return; }
    setSubmitting(true);
    setError(null);
    try {
      await submitFeedback(reviewId, { verdict, confidence_score: confidence, notes });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <Loader size={32} className="animate-pulse" />
        <p style={{ marginTop: 12 }}>Loading review details...</p>
      </div>
    );
  }

  const txn = data?.transaction || {};
  const features = data?.features || {};
  const assessment = data?.risk_assessment || {};
  const triggeredRules = assessment?.triggered_rules || [];

  // Feature labels for display
  const featureLabels = {
    feat_amount: "Amount",
    feat_old_balance_org: "Sender Balance (before)",
    feat_old_balance_dest: "Receiver Balance (before)",
    feat_hour: "Hour of Day",
    feat_orig_txn_count: "Sender Txn Count",
    feat_dest_txn_count: "Receiver Txn Count",
    feat_high_amount: "High Amount Flag",
    feat_type_cash_in: "Type: Cash In",
    feat_type_cash_out: "Type: Cash Out",
    feat_type_debit: "Type: Debit",
    feat_type_payment: "Type: Payment",
    feat_type_transfer: "Type: Transfer",
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate("/reviews")}
        >
          <ArrowLeft size={16} /> Back to Queue
        </button>
        <div>
          <h1 className="page-title" style={{ fontSize: 22 }}>
            Review #{reviewId} — Transaction #{txn.id}
          </h1>
        </div>
      </div>

      {submitted ? (
        <div className="card animate-fade-in" style={{ textAlign: "center", padding: 60 }}>
          <CheckCircle size={48} style={{ color: "var(--accent-green)", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Feedback Submitted</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
            Your verdict has been recorded and the adaptive engine has been triggered.
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/reviews")}>
            Return to Queue
          </button>
        </div>
      ) : (
        <div className="grid-2">
          {/* Left Column */}
          <div>
            {/* Transaction Data Panel */}
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Transaction Details
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
                {[
                  ["Transaction ID", `#${txn.id}`],
                  ["Type", txn.transaction_type],
                  ["Amount", `$${Number(txn.amount).toLocaleString()}`],
                  ["Sender", txn.user_id],
                  ["Receiver", txn.merchant_id],
                  ["Timestamp", txn.timestamp ? new Date(txn.timestamp).toLocaleString() : "—"],
                  ["Outlier", txn.is_outlier ? "Yes" : "No"],
                  ["Ground Truth", txn.ground_truth_label == null ? "Unknown" : txn.ground_truth_label ? "Fraud" : "Legitimate"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2, textTransform: "uppercase" }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }} className="truncate">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Breakdown Panel */}
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Engineered Features
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.entries(featureLabels).map(([key, label]) => {
                  const val = features?.[key];
                  const isFlag = key.startsWith("feat_type_") || key === "feat_high_amount";
                  return (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        background: "var(--bg-input)",
                        borderRadius: 6,
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>
                      <span
                        className="text-mono"
                        style={{
                          fontWeight: 600,
                          color: isFlag
                            ? val === 1
                              ? "var(--accent-amber)"
                              : "var(--text-muted)"
                            : "var(--text-primary)",
                        }}
                      >
                        {val != null ? (isFlag ? (val === 1 ? "YES" : "NO") : typeof val === "number" ? val.toLocaleString() : val) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* Risk Score Gauge */}
            <div className="card" style={{ textAlign: "center", marginBottom: 24 }}>
              <RiskGauge score={assessment.risk_score || 0} />
              <div className="grid-2" style={{ marginTop: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>ML Score</div>
                  <div className="text-mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--accent-indigo-light)" }}>
                    {assessment.ml_score != null ? assessment.ml_score.toFixed(1) : "—"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Anomaly Score</div>
                  <div className="text-mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--accent-cyan)" }}>
                    {assessment.anomaly_score != null ? assessment.anomaly_score.toFixed(1) : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Triggered Rules */}
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Triggered Rules ({triggeredRules.length})
              </h3>
              {triggeredRules.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No rules triggered.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {triggeredRules.map((rule, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "12px 14px",
                        background: "var(--bg-input)",
                        borderRadius: 8,
                        border: "1px solid var(--border-color)",
                        borderLeft: "3px solid var(--accent-amber)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                          {rule.rule_name}
                        </span>
                        <span className="text-mono" style={{ fontSize: 12, color: "var(--accent-amber)" }}>
                          w={rule.weight}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {rule.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Verdict Form */}
            <div className="card" style={{ borderColor: "var(--accent-indigo)", borderWidth: 1 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--accent-indigo-light)", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Submit Verdict
              </h3>

              {/* Verdict Radio */}
              <div className="form-group">
                <label className="form-label">Verdict</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {VERDICT_OPTIONS.map((v) => (
                    <button
                      key={v}
                      onClick={() => setVerdict(v)}
                      className={`btn btn-sm ${verdict === v ? "btn-primary" : "btn-secondary"}`}
                      style={{
                        flex: 1,
                        borderColor: verdict === v
                          ? v === "FRAUD" ? "var(--accent-red)" : v === "LEGITIMATE" ? "var(--accent-green)" : "var(--accent-amber)"
                          : undefined,
                        background: verdict === v
                          ? v === "FRAUD" ? "rgba(239,68,68,0.2)" : v === "LEGITIMATE" ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"
                          : undefined,
                        color: verdict === v
                          ? v === "FRAUD" ? "var(--accent-red)" : v === "LEGITIMATE" ? "var(--accent-green)" : "var(--accent-amber)"
                          : undefined,
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confidence Slider */}
              <div className="form-group">
                <label className="form-label">
                  Confidence: {confidence}/5
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent-indigo)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}>
                  <span>Low</span><span>High</span>
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Notes (encrypted at rest)</label>
                <textarea
                  className="form-textarea"
                  placeholder="Add your analysis notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {error && (
                <div style={{ color: "var(--accent-red)", fontSize: 13, marginBottom: 12 }}>
                  {error}
                </div>
              )}

              <button
                className="btn btn-primary"
                style={{ width: "100%" }}
                onClick={handleSubmit}
                disabled={submitting || !verdict}
              >
                {submitting ? (
                  <><Loader size={16} className="animate-pulse" /> Submitting...</>
                ) : (
                  <><Send size={16} /> Submit Verdict</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
