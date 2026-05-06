"use client";

import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with Web Speech API and camera
const GlassDesktop = dynamic(
  () => import("@/components/glass-os/GlassDesktop").then((m) => m.GlassDesktop),
  {
    ssr: false,
    loading: () => (
      <div style={{
        minHeight: "100dvh",
        background: "#0a0f1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#64748b",
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 14,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👓</div>
          <div>Loading Gaze OS...</div>
        </div>
      </div>
    ),
  }
);

export default function GlassOSPage() {
  return <GlassDesktop />;
}