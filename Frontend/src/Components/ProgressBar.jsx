/**
 * ProgressBar — animated progress bar with percentage counter.
 *
 * Props:
 *   percent: number (0–100)
 *   status: string (e.g. "PROCESSING", "DONE", "FAILED")
 *   label: string (optional)
 */
export default function ProgressBar({ percent = 0, status = "", label = "" }) {
  const clamped = Math.max(0, Math.min(100, percent));

  let barColor = "linear-gradient(90deg, var(--gradient-start), var(--gradient-end))";
  if (status === "DONE") {
    barColor = "linear-gradient(90deg, #22c55e, #16a34a)";
  } else if (status === "FAILED") {
    barColor = "linear-gradient(90deg, #ef4444, #dc2626)";
  }

  return (
    <div>
      {label && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <span style={{ color: "var(--text-secondary)" }}>{label}</span>
          <span style={{ color: "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace" }}>
            {clamped.toFixed(1)}%
          </span>
        </div>
      )}
      <div
        style={{
          width: "100%",
          height: 10,
          background: "var(--bg-input)",
          borderRadius: 5,
          overflow: "hidden",
          border: "1px solid var(--border-color)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${clamped}%`,
            background: barColor,
            borderRadius: 5,
            transition: "width 0.5s ease-out",
            boxShadow: status === "DONE" ? "0 0 10px rgba(34,197,94,0.3)" : "0 0 10px rgba(99,102,241,0.3)",
          }}
        />
      </div>
    </div>
  );
}
