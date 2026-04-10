import { NavLink, useNavigate } from "react-router-dom";
import { Upload, Shield, Settings, Activity, BarChart3, Layers, LogOut, User } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const navItems = [
  { to: "/dashboard", icon: BarChart3, label: "Dashboard" },
  { to: "/upload", icon: Upload, label: "Upload Data" },
  { to: "/risk-classification", icon: Layers, label: "Risk Classification" },
  { to: "/reviews", icon: Shield, label: "Review Queue" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: 260,
        height: "100vh",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "24px 20px",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Activity size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>
              FraudShield
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.05em" }}>
              DETECTION PIPELINE
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderRadius: 8,
              marginBottom: 4,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
              color: isActive ? "var(--accent-indigo-light)" : "var(--text-secondary)",
              background: isActive ? "rgba(99, 102, 241, 0.1)" : "transparent",
              transition: "all 0.2s ease",
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User & Logout */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid var(--border-color)",
        }}
      >
        {/* User info */}
        {user && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
              padding: "8px 10px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 8,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                color: "white",
              }}
            >
              {user.username?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.username}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>
                {user.role || "analyst"}
              </div>
            </div>
          </div>
        )}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "8px 12px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.15)",
            borderRadius: 8,
            color: "var(--accent-red)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <LogOut size={16} />
          Sign Out
        </button>

        {/* Pipeline status */}
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--accent-green)",
                boxShadow: "0 0 6px var(--accent-green)",
              }}
            />
            Pipeline Active
          </div>
          <div>XGBoost + Isolation Forest</div>
        </div>
      </div>
    </aside>
  );
}
