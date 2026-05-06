"use client";

import type { AppMeta } from "@/lib/glass-os/gaze-types";

interface GlassAppCardProps {
  app: AppMeta;
  isFocused: boolean;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function GlassAppCard({ app, isFocused, isHovered, onClick, onMouseEnter, onMouseLeave }: GlassAppCardProps) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        background: isFocused
          ? `${app.color}18`
          : isHovered
          ? "rgba(255,255,255,0.04)"
          : "rgba(255,255,255,0.02)",
        border: `2px solid ${isFocused ? app.color : "rgba(255,255,255,0.06)"}`,
        borderRadius: 20,
        padding: "20px 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        transition: "all 0.2s ease",
        transform: isFocused ? "scale(1.06)" : "scale(1)",
        boxShadow: isFocused ? `0 0 20px ${app.color}30` : "none",
      }}
    >
      <span style={{ fontSize: 32 }}>{app.icon}</span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: isFocused ? app.color : "#94a3b8",
          transition: "color 0.2s",
        }}
      >
        {app.name}
      </span>
    </button>
  );
}