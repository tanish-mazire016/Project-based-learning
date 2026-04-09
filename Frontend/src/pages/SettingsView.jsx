import { useState, useEffect } from "react";
import { Settings, RefreshCw, Shield, Hash, ChevronLeft, ChevronRight } from "lucide-react";
import { getThresholds, getRules, getAuditLogs } from "../api/client";

export default function SettingsView() {
  const [thresholds, setThresholds] = useState([]);
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [logCount, setLogCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("thresholds");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [t, r, l] = await Promise.all([
        getThresholds(),
        getRules(),
        getAuditLogs(logPage),
      ]);
      setThresholds(t);
      setRules(r);
      setLogs(l.results || []);
      setLogCount(l.count || 0);
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [logPage]);

  const tabs = [
    { key: "thresholds", label: "Thresholds", icon: Settings },
    { key: "rules", label: "Fraud Rules", icon: Shield },
    { key: "audit", label: "Audit Log", icon: Hash },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Settings & Audit</h1>
          <p className="page-subtitle">
            Read-only — values are managed by the adaptive engine
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-pulse" : ""} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`btn btn-sm ${activeTab === key ? "btn-primary" : "btn-secondary"}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Thresholds Tab ── */}
      {activeTab === "thresholds" && (
        <div className="grid-2" style={{ maxWidth: 640 }}>
          {thresholds.map((t) => (
            <div key={t.key} className="card">
              <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                {t.key.replace(/_/g, " ")}
              </div>
              <div
                className="text-mono"
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: t.key === "ALLOW_THRESHOLD" ? "var(--accent-green)" : "var(--accent-red)",
                }}
              >
                {Number(t.value).toFixed(2)}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                Updated: {new Date(t.updated_at).toLocaleString()}
              </div>
            </div>
          ))}
          {thresholds.length === 0 && !loading && (
            <div className="card" style={{ gridColumn: "1 / -1" }}>
              <p style={{ color: "var(--text-muted)" }}>No thresholds configured. Run the seed command.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Fraud Rules Tab ── */}
      {activeTab === "rules" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {rules.length === 0 ? (
            <div className="empty-state">
              <Shield size={32} style={{ margin: "0 auto" }} />
              <p style={{ marginTop: 12 }}>No fraud rules found. Run the seed command.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rule Name</th>
                  <th>Weight</th>
                  <th>Active</th>
                  <th>Version</th>
                  <th>Integrity Hash</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                        {rule.name}
                      </span>
                    </td>
                    <td>
                      <span className="text-mono" style={{ fontWeight: 600, color: "var(--accent-indigo-light)" }}>
                        {rule.weight.toFixed(4)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${rule.is_active ? "badge-resolved" : "badge-blocked"}`}>
                        {rule.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <span className="text-mono">v{rule.version}</span>
                    </td>
                    <td>
                      <span className="text-mono truncate" style={{ maxWidth: 120, display: "inline-block", fontSize: 12, color: "var(--text-muted)" }}>
                        {rule.integrity_hash?.substring(0, 16)}...
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      {new Date(rule.updated_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Audit Log Tab ── */}
      {activeTab === "audit" && (
        <>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {logs.length === 0 ? (
              <div className="empty-state">
                <Hash size={32} style={{ margin: "0 auto" }} />
                <p style={{ marginTop: 12 }}>No audit log entries yet.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Event</th>
                    <th>Entity</th>
                    <th>Description</th>
                    <th>Hash</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="text-mono" style={{ fontSize: 12 }}>
                        {log.id}
                      </td>
                      <td>
                        <span className="badge badge-pending" style={{ fontSize: 11 }}>
                          {log.event_type}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {log.entity_type}/{log.entity_id}
                      </td>
                      <td style={{ fontSize: 13, maxWidth: 200 }} className="truncate">
                        {log.description}
                      </td>
                      <td>
                        <span className="text-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {log.current_hash?.substring(0, 12)}...
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Audit Log Pagination */}
          {logCount > 20 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={logPage <= 1}
                onClick={() => setLogPage((p) => p - 1)}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span style={{ padding: "6px 14px", fontSize: 13, color: "var(--text-muted)" }}>
                Page {logPage} of {Math.ceil(logCount / 20)}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={logs.length < 20}
                onClick={() => setLogPage((p) => p + 1)}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
