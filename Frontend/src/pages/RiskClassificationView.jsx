import { useState, useEffect } from "react";
import {
  RefreshCw, Layers, ShieldCheck, ShieldAlert, AlertTriangle,
  ChevronLeft, ChevronRight, ArrowUpDown, Filter,
} from "lucide-react";
import { getClassifiedTransactions } from "../api/client";

const TIERS = [
  { key: "all", label: "All", color: "var(--accent-indigo-light)" },
  { key: "low", label: "Low Risk", color: "var(--risk-low)" },
  { key: "medium", label: "Medium Risk", color: "var(--risk-medium)" },
  { key: "high", label: "High Risk", color: "var(--risk-high)" },
];

const SORT_OPTIONS = [
  { value: "risk_score", label: "Risk Score" },
  { value: "amount", label: "Amount" },
  { value: "timestamp", label: "Timestamp" },
];

const TXN_TYPES = ["", "TRANSFER", "CASH_OUT", "CASH_IN", "PAYMENT", "DEBIT"];

export default function RiskClassificationView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTier, setActiveTier] = useState("all");
  const [sortBy, setSortBy] = useState("risk_score");
  const [order, setOrder] = useState("desc");
  const [txnType, setTxnType] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const d = await getClassifiedTransactions({
        risk_level: activeTier,
        sort: sortBy,
        order,
        type: txnType,
        page,
      });
      setData(d);
    } catch (err) {
      console.error("Failed to fetch classified transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTier, sortBy, order, txnType, page]);

  useEffect(() => {
    setPage(1);
  }, [activeTier, sortBy, order, txnType]);

  const tierSummary = data?.tier_summary || { low: 0, medium: 0, high: 0, total: 0 };
  const transactions = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / 25);

  const tierBadge = (tier) => {
    if (tier === "LOW") return "badge-risk-low";
    if (tier === "MEDIUM") return "badge-risk-medium";
    if (tier === "HIGH") return "badge-risk-high";
    return "badge-pending";
  };

  const decisionBadge = (dec) => {
    if (dec === "ALLOWED") return "badge-allowed";
    if (dec === "BLOCKED") return "badge-blocked";
    if (dec === "REVIEW") return "badge-review";
    return "badge-pending";
  };

  const riskColor = (score) => {
    if (score === null) return "var(--text-muted)";
    if (score < 0.30) return "var(--risk-low)";
    if (score < 0.65) return "var(--risk-medium)";
    return "var(--risk-high)";
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Risk Classification</h1>
          <p className="page-subtitle">
            Transactions categorized by fraud risk level
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchData} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-pulse" : ""} />
          Refresh
        </button>
      </div>

      {/* Tier Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <TierCard
          label="Low Risk"
          count={tierSummary.low}
          total={tierSummary.total}
          color="var(--risk-low)"
          icon={<ShieldCheck size={20} />}
          desc={`Score < ${tierSummary.thresholds?.allow || 0.30}`}
          active={activeTier === "low"}
          onClick={() => setActiveTier(activeTier === "low" ? "all" : "low")}
        />
        <TierCard
          label="Medium Risk"
          count={tierSummary.medium}
          total={tierSummary.total}
          color="var(--risk-medium)"
          icon={<AlertTriangle size={20} />}
          desc={`${tierSummary.thresholds?.allow || 0.30} – ${tierSummary.thresholds?.block || 0.65}`}
          active={activeTier === "medium"}
          onClick={() => setActiveTier(activeTier === "medium" ? "all" : "medium")}
        />
        <TierCard
          label="High Risk"
          count={tierSummary.high}
          total={tierSummary.total}
          color="var(--risk-high)"
          icon={<ShieldAlert size={20} />}
          desc={`Score ≥ ${tierSummary.thresholds?.block || 0.65}`}
          active={activeTier === "high"}
          onClick={() => setActiveTier(activeTier === "high" ? "all" : "high")}
        />
      </div>

      {/* Filter & Sort Controls */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Filter size={14} style={{ color: "var(--text-muted)" }} />
          <select
            className="form-select"
            value={txnType}
            onChange={(e) => setTxnType(e.target.value)}
            style={{ width: 160, padding: "6px 10px", fontSize: 13 }}
          >
            <option value="">All Types</option>
            {TXN_TYPES.filter(Boolean).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ArrowUpDown size={14} style={{ color: "var(--text-muted)" }} />
          <select
            className="form-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ width: 140, padding: "6px 10px", fontSize: 13 }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setOrder(order === "desc" ? "asc" : "desc")}
            style={{ padding: "5px 10px", fontSize: 12 }}
          >
            {order === "desc" ? "↓ DESC" : "↑ ASC"}
          </button>
        </div>

        <div style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-muted)" }}>
          {totalCount} transactions
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {transactions.length === 0 ? (
          <div className="empty-state">
            <Layers size={36} style={{ margin: "0 auto", opacity: 0.4 }} />
            <p style={{ marginTop: 12 }}>
              {loading ? "Loading transactions..." : "No transactions found. Upload a dataset first."}
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>From → To</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Risk Score</th>
                <th>Tier</th>
                <th>Decision</th>
                <th>Top Rules</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr key={txn.id}>
                  <td className="text-mono" style={{ fontSize: 12, fontWeight: 600 }}>#{txn.id}</td>
                  <td style={{ fontSize: 12 }}>
                    <span style={{ color: "var(--text-primary)" }}>{txn.user_id?.substring(0, 8)}...</span>
                    <span style={{ color: "var(--text-muted)", margin: "0 4px" }}>→</span>
                    <span style={{ color: "var(--text-primary)" }}>{txn.merchant_id?.substring(0, 8)}...</span>
                  </td>
                  <td className="text-mono" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    ${txn.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span className="badge badge-pending" style={{ fontSize: 10, padding: "2px 8px" }}>{txn.transaction_type}</span>
                  </td>
                  <td>
                    <span className="text-mono" style={{ fontWeight: 700, color: riskColor(txn.risk_score), fontSize: 14 }}>
                      {txn.risk_score !== null ? (txn.risk_score * 100).toFixed(1) : "—"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${tierBadge(txn.tier)}`}>{txn.tier}</span>
                  </td>
                  <td>
                    <span className={`badge ${decisionBadge(txn.decision)}`}>{txn.decision || "—"}</span>
                  </td>
                  <td style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 160 }} className="truncate">
                    {txn.triggered_rules?.join(", ") || "—"}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {new Date(txn.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span style={{ padding: "6px 14px", fontSize: 13, color: "var(--text-muted)" }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function TierCard({ label, count, total, color, icon, desc, active, onClick }) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        padding: 20,
        cursor: "pointer",
        borderColor: active ? color : undefined,
        boxShadow: active ? `0 0 20px ${color}22` : undefined,
        position: "relative",
        overflow: "hidden",
        transition: "all 0.2s ease",
      }}
    >
      <div style={{
        position: "absolute", top: -10, right: -10,
        width: 70, height: 70, borderRadius: "50%",
        background: color, opacity: 0.06,
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: `${color}18`, display: "flex",
          alignItems: "center", justifyContent: "center", color,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
      </div>
      <div className="text-mono" style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>
        {count}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{desc}</span>
        <span className="text-mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{pct}%</span>
      </div>
      {/* Progress bar */}
      <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: color, transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}
