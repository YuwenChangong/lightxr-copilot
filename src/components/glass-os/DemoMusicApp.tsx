"use client";

import { useState, useEffect, useCallback } from "react";
import { registerHandler, speak } from "@/lib/glass-os/action-executor";
import type { AgentAction } from "@/lib/glass-os/gaze-types";

const DEMO_TRACKS = [
  { id: 1, title: "Horizon Dreams", artist: "Luna Wave", duration: "3:42" },
  { id: 2, title: "Neon Pulse", artist: "Cyber Drift", duration: "4:15" },
  { id: 3, title: "Starlight", artist: "Aurora Beat", duration: "3:58" },
  { id: 4, title: "Midnight Run", artist: "Echo Valley", duration: "4:33" },
  { id: 5, title: "Crystal Clear", artist: "Glass City", duration: "3:21" },
];

export function DemoMusicApp() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [progress, setProgress] = useState(0);

  // Register action handler
  useEffect(() => {
    const unsub = registerHandler("music", (action: AgentAction) => {
      switch (action.type) {
        case "media_play":
          setIsPlaying(true);
          break;
        case "media_pause":
          setIsPlaying(false);
          break;
        case "media_next":
          setCurrentTrack((t) => (t + 1) % DEMO_TRACKS.length);
          setProgress(0);
          setIsPlaying(true);
          break;
        case "media_prev":
          setCurrentTrack((t) => (t - 1 + DEMO_TRACKS.length) % DEMO_TRACKS.length);
          setProgress(0);
          setIsPlaying(true);
          break;
      }
    });
    return unsub;
  }, []);

  // Simulate playback progress
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 0.3));
    }, 200);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const track = DEMO_TRACKS[currentTrack];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, gap: 16 }}>
      {/* Now Playing */}
      <div style={{
        background: "rgba(168,85,247,0.08)",
        border: "1px solid rgba(168,85,247,0.2)",
        borderRadius: 16,
        padding: 24,
        textAlign: "center",
      }}>
        {/* Album art placeholder */}
        <div style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: `conic-gradient(from 0deg, #a855f7, #3b82f6, #a855f7)`,
          margin: "0 auto 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
          animation: isPlaying ? "spin 4s linear infinite" : "none",
        }}>
          🎵
        </div>

        <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
          {track.title}
        </div>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>{track.artist}</div>

        {/* Progress bar */}
        <div style={{
          height: 3,
          background: "#1e293b",
          borderRadius: 2,
          marginTop: 16,
          overflow: "hidden",
        }}>
          <div style={{
            width: `${progress}%`,
            height: "100%",
            background: "#a855f7",
            borderRadius: 2,
            transition: "width 0.2s linear",
          }} />
        </div>
        <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{track.duration}</div>
      </div>

      {/* Track list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {DEMO_TRACKS.map((t, i) => (
          <button
            key={t.id}
            onClick={() => { setCurrentTrack(i); setIsPlaying(true); setProgress(0); }}
            style={{
              width: "100%",
              background: i === currentTrack ? "rgba(168,85,247,0.08)" : "transparent",
              border: "none",
              borderBottom: "1px solid #1e293b",
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: i === currentTrack ? "#a855f7" : "#e2e8f0", fontWeight: i === currentTrack ? 600 : 400 }}>
                {i === currentTrack && isPlaying ? "▶ " : ""}{t.title}
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{t.artist}</div>
            </div>
            <span style={{ fontSize: 11, color: "#475569" }}>{t.duration}</span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        paddingTop: 8,
        borderTop: "1px solid #1e293b",
      }}>
        <button onClick={() => setCurrentTrack((t) => (t - 1 + DEMO_TRACKS.length) % DEMO_TRACKS.length)} style={ctrlBtn}>
          ⏮
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{ ...ctrlBtn, background: "rgba(168,85,247,0.15)", color: "#a855f7", borderColor: "rgba(168,85,247,0.3)" }}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button onClick={() => setCurrentTrack((t) => (t + 1) % DEMO_TRACKS.length)} style={ctrlBtn}>
          ⏭
        </button>
      </div>

      <div style={{ fontSize: 11, color: "#334155", textAlign: "center" }}>
        🎤 "play" · "pause" · "next"
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const ctrlBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  padding: "10px 20px",
  color: "#94a3b8",
  fontSize: 16,
  cursor: "pointer",
};