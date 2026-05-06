"use client";

export function GlassStatusBar({ onBack, title, icon }: { onBack?: () => void; title?: string; icon?: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 16px",
      borderBottom: "1px solid #1e293b",
      background: "#0f172a",
    }}>
      {onBack ? (
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "4px 14px",
            color: "#94a3b8",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
      ) : (
        <a href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: 13 }}>← Home</a>
      )}

      <span style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>
        {icon} {title ?? "Gaze OS"}
      </span>

      <span style={{ fontSize: 11, color: "#475569" }}>
        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
}

export function GlassBottomBar() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "6px 16px",
      borderTop: "1px solid #1e293b",
      background: "#0f172a",
      fontSize: 11,
      color: "#475569",
    }}>
      <span>Gaze OS v0.1 Prototype</span>
      <span>Arrow keys · Enter · Esc</span>
    </div>
  );
}