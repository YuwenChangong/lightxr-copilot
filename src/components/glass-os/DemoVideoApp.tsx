"use client";

import { useState, useEffect } from "react";
import { registerHandler } from "@/lib/glass-os/action-executor";
import type { AgentAction } from "@/lib/glass-os/gaze-types";

const DEMO_EPISODES = [
  { id: 1, title: "S01E01 · Pilot", duration: "42:10" },
  { id: 2, title: "S01E02 · The Signal", duration: "38:45" },
  { id: 3, title: "S01E03 · Through the Lens", duration: "41:22" },
];

export function DemoVideoApp() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEp, setCurrentEp] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const unsub = registerHandler("video", (action: AgentAction) => {
      switch (action.type) {
        case "media_play":
          setIsPlaying(true);
          break;
        case "media_pause":
          setIsPlaying(false);
          break;
        case "media_next":
          setCurrentEp((p) => Math.min(p + 1, DEMO_EPISODES.length - 1));
          setProgress(0);
          setIsPlaying(true);
          break;
        case "media_prev":
          setCurrentEp((p) => Math.max(p - 1, 0));
          setProgress(0);
          break;
      }
    });
    return unsub;
  }, []);

  // Simulate progress
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 0.5));
    }, 200);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const ep = DEMO_EPISODES[currentEp];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20 }}>
      {/* Fake video viewport */}
      <div style={{
        flex: 1,
        background: `linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)`,
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        border: "1px solid #1e293b",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Animated circles when playing */}
        {isPlaying && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: 4,
                  height: 20 + Math.sin(Date.now() / 200 + i) * 12,
                  background: "#ef4444",
                  borderRadius: 2,
                  transition: "height 0.15s ease",
                  animation: `eq-bar 0.${4 + i}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        )}

        <span style={{ fontSize: 48 }}>{isPlaying ? "▶" : "⏸"}</span>
        <span style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600 }}>{ep.title}</span>
        <span style={{ fontSize: 12, color: "#64748b" }}>{ep.duration}</span>
        {!isPlaying && (
          <span style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Paused</span>
        )}
      </div>

      {/* Progress bar */}
      <div style={{
        height: 3,
        background: "#1e293b",
        borderRadius: 2,
        marginTop: 12,
        overflow: "hidden",
      }}>
        <div style={{
          width: `${progress}%`,
          height: "100%",
          background: "#ef4444",
          borderRadius: 2,
          transition: "width 0.2s linear",
        }} />
      </div>

      {/* Controls */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "12px 0",
      }}>
        <button
          onClick={() => setCurrentEp((p) => Math.max(p - 1, 0))}
          style={ctrlBtn}
        >
          ⏮ Prev
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{ ...ctrlBtn, background: "rgba(239,68,68,0.15)", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
        <button
          onClick={() => { setCurrentEp((p) => Math.min(p + 1, DEMO_EPISODES.length - 1)); setProgress(0); setIsPlaying(true); }}
          style={ctrlBtn}
        >
          Next ⏭
        </button>
      </div>

      <div style={{ fontSize: 11, color: "#334155", textAlign: "center" }}>
        🎤 "play" · "pause" · "next"
      </div>

      <style>{`
        @keyframes eq-bar {
          0% { height: 6px; }
          100% { height: 28px; }
        }
      `}</style>
    </div>
  );
}

const ctrlBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  padding: "8px 16px",
  color: "#94a3b8",
  fontSize: 13,
  cursor: "pointer",
};