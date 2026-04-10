import { useState, useEffect } from "react";
import {
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Eye,
  DollarSign,
  Activity,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { getAnalyticsDashboard } from "../api/client";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ─── Shared chart options ───
const chartFont = { family: "'Inter', sans-serif" };
const gridColor = "rgba(255,255,255,0.06)";
const textMuted = "rgba(255,255,255,0.45)";

export default function DashboardView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getAnalyticsDashboard();
      setData(d);
    } catch (err) {
      console.error("Dashboard fetch failed:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="animate-fade-in" style={{ padding: 40, textAlign: "center" }}>
        <RefreshCw size={32} className="animate-pulse" style={{ margin: "0 auto 16px", color: "var(--accent-indigo-light)" }} />
        <p style={{ color: "var(--text-muted)" }}>Loading analytics...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="animate-fade-in" style={{ padding: 40, textAlign: "center" }}>
        <AlertTriangle size={32} style={{ margin: "0 auto 16px", color: "var(--accent-red)" }} />
        <p style={{ color: "var(--text-muted)" }}>{error}</p>
        <button className="btn btn-primary btn-sm" onClick={fetchData} style={{ marginTop: 12 }}>
          Retry
        </button>
      </div>
    );
  }

  const kpi = data?.kpi || {};
  const riskDist = data?.risk_distribution || [];
  const topRules = data?.top_triggered_rules || [];
  const reviewEff = data?.review_efficiency || {};
  const modelPerf = data?.model_performance || {};
  const txnTypes = data?.transaction_types || [];
  const recentEvents = data?.recent_events || [];

  // ─── Chart Data: Risk Score Distribution ───
  const riskChartData = {
    labels: riskDist.map((b) => b.range),
    datasets: [
      {
        label: "Transactions",
        data: riskDist.map((b) => b.count),
        backgroundColor: riskDist.map((_, i) => {
          if (i < 3) return "rgba(52, 211, 153, 0.7)";    // green (safe)
          if (i < 7) return "rgba(251, 191, 36, 0.7)";    // amber (review)
          return "rgba(239, 68, 68, 0.7)";                  // red (blocked)
        }),
        borderColor: riskDist.map((_, i) => {
          if (i < 3) return "rgb(52, 211, 153)";
          if (i < 7) return "rgb(251, 191, 36)";
          return "rgb(239, 68, 68)";
        }),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const riskChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        titleFont: chartFont,
        bodyFont: chartFont,
        borderColor: "rgba(99, 102, 241, 0.3)",
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: {
      x: {
        ticks: { color: textMuted, font: { ...chartFont, size: 11 } },
        grid: { display: false },
      },
      y: {
        ticks: { color: textMuted, font: { ...chartFont, size: 11 } },
        grid: { color: gridColor },
      },
    },
  };

  // ─── Chart Data: Decision Breakdown ───
  const decisionChartData = {
    labels: ["Allowed", "Blocked", "Review"],
    datasets: [
      {
        data: [kpi.allowed_count, kpi.blocked_count, kpi.review_count],
        backgroundColor: [
          "rgba(52, 211, 153, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(251, 191, 36, 0.8)",
        ],
        borderColor: [
          "rgb(52, 211, 153)",
          "rgb(239, 68, 68)",
          "rgb(251, 191, 36)",
        ],
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "rgba(255,255,255,0.7)",
          font: { ...chartFont, size: 12 },
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        titleFont: chartFont,
        bodyFont: chartFont,
        borderColor: "rgba(99, 102, 241, 0.3)",
        borderWidth: 1,
        padding: 12,
      },
    },
  };

  // ─── Chart Data: Top Rules ───
  const rulesChartData = {
    labels: topRules.map((r) => r.name.length > 20 ? r.name.substring(0, 18) + "..." : r.name),
    datasets: [
      {
        label: "Times Triggered",
        data: topRules.map((r) => r.count),
        backgroundColor: "rgba(99, 102, 241, 0.6)",
        borderColor: "rgb(99, 102, 241)",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const rulesChartOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        titleFont: chartFont,
        bodyFont: chartFont,
        borderColor: "rgba(99, 102, 241, 0.3)",
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: {
      x: {
        ticks: { color: textMuted, font: { ...chartFont, size: 11 } },
        grid: { color: gridColor },
      },
      y: {
        ticks: { color: "rgba(255,255,255,0.7)", font: { ...chartFont, size: 11 } },
        grid: { display: false },
      },
    },
  };

  // ─── Chart Data: Transaction Types ───
  const typeChartData = {
    labels: txnTypes.map((t) => t.transaction_type),
    datasets: [
      {
        data: txnTypes.map((t) => t.count),
        backgroundColor: [
          "rgba(99, 102, 241, 0.7)",
          "rgba(139, 92, 246, 0.7)",
          "rgba(236, 72, 153, 0.7)",
          "rgba(14, 165, 233, 0.7)",
          "rgba(52, 211, 153, 0.7)",
        ],
        borderColor: [
          "rgb(99, 102, 241)",
          "rgb(139, 92, 246)",
          "rgb(236, 72, 153)",
          "rgb(14, 165, 233)",
          "rgb(52, 211, 153)",
        ],
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  // ─── Helper: Format large numbers ───
  const formatNumber = (n) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n?.toLocaleString() ?? "0";
  };

  const formatCurrency = (n) => {
    if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
    if (n >= 1_000) return "$" + (n / 1_000).toFixed(1) + "K";
    return "$" + (n?.toFixed(2) ?? "0");
  };

  // ─── Event badge color ───
  const eventColor = (type) => {
    if (type?.includes("CLEANED") || type?.includes("ENGINEERED")) return "badge-resolved";
    if (type?.includes("ASSESSED") || type?.includes("DECISION")) return "badge-pending";
    if (type?.includes("FEEDBACK")) return "badge-review";
    if (type?.includes("VIOLATION") || type?.includes("FAILED")) return "badge-blocked";
    return "badge-pending";
  };

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Analytics Dashboard</h1>
          <p className="page-subtitle">
            Real-time pipeline performance &amp; fraud detection insights
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchData} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-pulse" : ""} />
          Refresh
        </button>
      </div>

      {/* ── KPI Cards Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <KpiCard
          icon={<Activity size={20} />}
          label="Total Transactions"
          value={formatNumber(kpi.total_transactions)}
          sub={`${kpi.total_datasets} datasets processed`}
          color="var(--accent-indigo-light)"
        />
        <KpiCard
          icon={<ShieldCheck size={20} />}
          label="Approval Rate"
          value={`${kpi.approval_rate}%`}
          sub={`${formatNumber(kpi.allowed_count)} transactions allowed`}
          color="var(--accent-green)"
        />
        <KpiCard
          icon={<ShieldAlert size={20} />}
          label="Block Rate"
          value={`${kpi.block_rate}%`}
          sub={`${formatNumber(kpi.blocked_count)} transactions blocked`}
          color="var(--accent-red)"
        />
        <KpiCard
          icon={<DollarSign size={20} />}
          label="Value Protected"
          value={formatCurrency(kpi.value_protected)}
          sub="Total blocked transaction value"
          color="var(--accent-amber)"
        />
      </div>

      {/* ── Second Row: Risk Score + Decision Breakdown ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                Risk Score Distribution
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                How transactions are distributed across risk levels
              </p>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Avg: <span className="text-mono" style={{ color: "var(--accent-indigo-light)", fontWeight: 600 }}>
                {kpi.avg_risk_score?.toFixed(3)}
              </span>
            </div>
          </div>
          <div style={{ height: 260 }}>
            <Bar data={riskChartData} options={riskChartOptions} />
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 8px 0" }}>
            Decision Breakdown
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
            {formatNumber(kpi.total_decisions)} total decisions
          </p>
          <div style={{ height: 220 }}>
            <Doughnut data={decisionChartData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* ── Third Row: Top Rules + Review Efficiency ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 8px 0" }}>
            Top Triggered Rules
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
            Most frequently firing fraud rules
          </p>
          <div style={{ height: topRules.length > 0 ? Math.max(180, topRules.length * 36) : 180 }}>
            {topRules.length > 0 ? (
              <Bar data={rulesChartData} options={rulesChartOptions} />
            ) : (
              <div className="empty-state" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ color: "var(--text-muted)" }}>No rules triggered yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 16px 0" }}>
            Review Queue Efficiency
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            <MiniStat icon={<Clock size={16} />} label="Pending" value={reviewEff.pending} color="var(--accent-amber)" />
            <MiniStat icon={<Eye size={16} />} label="In Progress" value={reviewEff.claimed} color="var(--accent-indigo-light)" />
            <MiniStat icon={<CheckCircle2 size={16} />} label="Resolved" value={reviewEff.resolved} color="var(--accent-green)" />
          </div>

          {reviewEff.avg_resolution_minutes != null && (
            <div style={{
              background: "rgba(99, 102, 241, 0.08)",
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 16,
              border: "1px solid rgba(99, 102, 241, 0.15)",
            }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Avg Resolution Time</div>
              <div className="text-mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--accent-indigo-light)" }}>
                {reviewEff.avg_resolution_minutes} min
              </div>
            </div>
          )}

          {/* Verdict breakdown */}
          {Object.keys(reviewEff.verdicts || {}).length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Human Verdicts</div>
              <div style={{ display: "flex", gap: 8 }}>
                {Object.entries(reviewEff.verdicts).map(([verdict, count]) => (
                  <div key={verdict} style={{
                    flex: 1,
                    textAlign: "center",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 8,
                    padding: "8px 4px",
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: verdict === "FRAUD" ? "var(--accent-red)" : verdict === "LEGITIMATE" ? "var(--accent-green)" : "var(--accent-amber)" }}>
                      {count}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "capitalize" }}>
                      {verdict.toLowerCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Fourth Row: Transaction Types + Model Accuracy + Recent Activity ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 8px 0" }}>
            Transaction Types
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
            Distribution by type
          </p>
          <div style={{ height: 200 }}>
            <Doughnut data={typeChartData} options={doughnutOptions} />
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 16px 0" }}>
            Model Performance
          </h3>
          {modelPerf.accuracy != null ? (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                margin: "0 auto 16px",
                background: `conic-gradient(
                  ${modelPerf.accuracy >= 70 ? "var(--accent-green)" : modelPerf.accuracy >= 50 ? "var(--accent-amber)" : "var(--accent-red)"} ${modelPerf.accuracy * 3.6}deg,
                  rgba(255,255,255,0.06) 0deg
                )`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <div style={{
                  width: 90,
                  height: 90,
                  borderRadius: "50%",
                  background: "var(--bg-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                }}>
                  <span className="text-mono" style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
                    {modelPerf.accuracy}%
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
                ML vs Human Agreement
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
                <div style={{ textAlign: "center" }}>
                  <CheckCircle2 size={16} style={{ color: "var(--accent-green)", marginBottom: 4 }} />
                  <div className="text-mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                    {modelPerf.agreements}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Agree</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <XCircle size={16} style={{ color: "var(--accent-red)", marginBottom: 4 }} />
                  <div className="text-mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                    {modelPerf.disagreements}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Disagree</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <TrendingUp size={32} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Submit reviews to see<br />model accuracy metrics
              </p>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 16px 0" }}>
            Recent Activity
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentEvents.length > 0 ? recentEvents.slice(0, 7).map((evt, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 6,
                fontSize: 12,
              }}>
                <span className={`badge ${eventColor(evt.event_type)}`} style={{ fontSize: 9, padding: "2px 6px" }}>
                  {evt.event_type?.replace(/_/g, " ")}
                </span>
                <span style={{ color: "var(--text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {evt.entity_type}/{evt.entity_id}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 10, whiteSpace: "nowrap" }}>
                  {evt.created_at ? new Date(evt.created_at).toLocaleTimeString() : ""}
                </span>
              </div>
            )) : (
              <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>
                No activity yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function KpiCard({ icon, label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: 20, position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "absolute",
        top: -10,
        right: -10,
        width: 80,
        height: 80,
        borderRadius: "50%",
        background: color,
        opacity: 0.06,
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: `${color}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: color,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
      </div>
      <div className="text-mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{sub}</div>
    </div>
  );
}

function MiniStat({ icon, label, value, color }) {
  return (
    <div style={{
      textAlign: "center",
      background: "rgba(255,255,255,0.03)",
      borderRadius: 8,
      padding: "12px 8px",
    }}>
      <div style={{ color, marginBottom: 6 }}>{icon}</div>
      <div className="text-mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
        {value ?? 0}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}
