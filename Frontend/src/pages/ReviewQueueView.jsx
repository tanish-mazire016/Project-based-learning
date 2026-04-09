import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, RefreshCw, Clock, AlertTriangle } from "lucide-react";
import { getReviewQueue, claimReview } from "../api/client";

export default function ReviewQueueView() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [claiming, setClaiming] = useState(null);
  const navigate = useNavigate();

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await getReviewQueue(page);
      setReviews(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      console.error("Failed to fetch review queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [page]);

  const handleClaim = async (reviewId) => {
    setClaiming(reviewId);
    try {
      await claimReview(reviewId);
      navigate(`/reviews/${reviewId}`);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to claim";
      alert(msg);
    } finally {
      setClaiming(null);
    }
  };

  const getRiskBadge = (score) => {
    if (score == null) return <span className="badge badge-pending">N/A</span>;
    if (score >= 0.65) return <span className="badge badge-risk-high">{(score * 100).toFixed(1)}</span>;
    if (score >= 0.30) return <span className="badge badge-risk-medium">{(score * 100).toFixed(1)}</span>;
    return <span className="badge badge-risk-low">{(score * 100).toFixed(1)}</span>;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Review Queue</h1>
          <p className="page-subtitle">
            {totalCount} transactions pending human review
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchQueue} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-pulse" : ""} />
          Refresh
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading && reviews.length === 0 ? (
          <div className="empty-state">
            <RefreshCw size={32} className="animate-pulse" style={{ margin: "0 auto" }} />
            <p style={{ marginTop: 12 }}>Loading review queue...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="empty-state">
            <Shield size={40} style={{ margin: "0 auto" }} />
            <p style={{ marginTop: 12, fontSize: 16, fontWeight: 500 }}>Queue is empty</p>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              All transactions have been reviewed or none require review.
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Risk Score</th>
                <th>Top Rule</th>
                <th>Priority</th>
                <th>Time in Queue</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id} className="animate-slide-in">
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <AlertTriangle
                        size={16}
                        style={{
                          color:
                            review.risk_score >= 0.65
                              ? "var(--risk-high)"
                              : review.risk_score >= 0.30
                              ? "var(--risk-medium)"
                              : "var(--risk-low)",
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: 14 }}>
                          #{review.transaction_id}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {review.user_id?.substring(0, 12)}... → {review.merchant_id?.substring(0, 12)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{getRiskBadge(review.risk_score)}</td>
                  <td>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      {review.top_triggered_rule || "—"}
                    </span>
                  </td>
                  <td>
                    <span
                      className="text-mono"
                      style={{
                        color:
                          review.priority >= 7
                            ? "var(--risk-high)"
                            : review.priority >= 4
                            ? "var(--risk-medium)"
                            : "var(--text-secondary)",
                        fontWeight: 600,
                      }}
                    >
                      P{review.priority}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
                      <Clock size={13} />
                      {review.time_in_queue}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleClaim(review.id)}
                      disabled={claiming === review.id}
                    >
                      {claiming === review.id ? "Claiming..." : "Claim & Review"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 20 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span style={{ padding: "6px 14px", fontSize: 13, color: "var(--text-muted)" }}>
            Page {page}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={reviews.length < 20}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
