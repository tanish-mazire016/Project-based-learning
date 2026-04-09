/**
 * RiskGauge — SVG arc gauge component (0–1 scale, color-coded).
 *
 * Props:
 *   score: number (0.0–1.0)
 *   size: number (default 160)
 *   label: string (optional)
 */
export default function RiskGauge({ score = 0, size = 160, label = "Risk Score" }) {
  const radius = 60;
  const stroke = 10;
  const center = size / 2;
  const circumference = Math.PI * radius; // half-circle

  const normalizedScore = Math.max(0, Math.min(1, score));
  const offset = circumference - normalizedScore * circumference;

  // Color based on score
  let color = "var(--risk-low)";
  let riskLabel = "LOW";
  if (normalizedScore >= 0.65) {
    color = "var(--risk-high)";
    riskLabel = "HIGH";
  } else if (normalizedScore >= 0.30) {
    color = "var(--risk-medium)";
    riskLabel = "MEDIUM";
  }

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
        {/* Background arc */}
        <path
          d={describeArc(center, center - 5, radius, 180, 360)}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d={describeArc(center, center - 5, radius, 180, 180 + normalizedScore * 180)}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
            transition: "all 0.8s ease-out",
          }}
        />
        {/* Score text */}
        <text
          x={center}
          y={center - 10}
          textAnchor="middle"
          style={{
            fontSize: 28,
            fontWeight: 700,
            fill: color,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {(normalizedScore * 100).toFixed(1)}
        </text>
        <text
          x={center}
          y={center + 14}
          textAnchor="middle"
          style={{
            fontSize: 12,
            fontWeight: 600,
            fill: color,
            letterSpacing: "0.1em",
          }}
        >
          {riskLabel} RISK
        </text>
      </svg>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -4 }}>
        {label}
      </div>
    </div>
  );
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}
