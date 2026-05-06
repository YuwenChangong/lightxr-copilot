"use client";

import { useEffect, useCallback, useState } from "react";
import { APP_REGISTRY } from "@/lib/glass-os/gaze-types";
import type { AppId } from "@/lib/glass-os/gaze-types";
import { registerHandler, setDispatchFeedback } from "@/lib/glass-os/action-executor";
import { useGazeNavigation } from "@/hooks/useGazeNavigation";
import { GlassAppCard } from "./GlassAppCard";
import { GlassStatusBar, GlassBottomBar } from "./GlassStatusBar";
import { GlassVoiceCommand } from "./GlassVoiceCommand";
import { DemoReaderApp } from "./DemoReaderApp";
import { DemoChatApp } from "./DemoChatApp";
import { DemoVideoApp } from "./DemoVideoApp";
import { DemoMusicApp } from "./DemoMusicApp";
import { DemoCameraApp } from "./DemoCameraApp";
import { DemoAskAIApp } from "./DemoAskAIApp";

export function GlassDesktop() {
  const gaze = useGazeNavigation();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackKey, setFeedbackKey] = useState(0);

  // Set up feedback toast from action executor
  useEffect(() => {
    setDispatchFeedback((label: string) => {
      setFeedback(label);
      setFeedbackKey((k) => k + 1);
    });
  }, []);

  // Auto-dismiss feedback
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [feedback, feedbackKey]);

  // Register global handler for open_app / close_app
  useEffect(() => {
    const unsub = registerHandler("global", (action) => {
      if (action.type === "open_app" && action.payload?.appId) {
        gaze.openApp(action.payload.appId as AppId);
      } else if (action.type === "close_app") {
        gaze.closeApp();
      }
    });
    return unsub;
  }, [gaze.openApp, gaze.closeApp]);

  const activeAppMeta = gaze.activeApp ? APP_REGISTRY.find((a) => a.id === gaze.activeApp) : null;

  const renderApp = useCallback(() => {
    switch (gaze.activeApp) {
      case "reader":
        return <DemoReaderApp />;
      case "chat":
        return <DemoChatApp />;
      case "video":
        return <DemoVideoApp />;
      case "music":
        return <DemoMusicApp />;
      case "camera":
        return <DemoCameraApp />;
      case "ask":
        return <DemoAskAIApp />;
      case "settings":
        return (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 48 }}>⚙️</span>
            <span style={{ fontSize: 16, color: "#e2e8f0", fontWeight: 600 }}>Settings</span>
            <span style={{ fontSize: 13, color: "#64748b" }}>Coming soon — gaze sensitivity, voice, theme</span>
          </div>
        );
      default:
        return null;
    }
  }, [gaze.activeApp]);

  return (
    <div style={{
      width: "100%",
      maxWidth: 420,
      margin: "0 auto",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#0a0f1a",
      color: "#f1f5f9",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Status Bar */}
      <GlassStatusBar
        onBack={gaze.view === "app" ? gaze.closeApp : undefined}
        title={gaze.view === "app" ? activeAppMeta?.name : "Gaze OS"}
        icon={gaze.view === "app" ? activeAppMeta?.icon : "👓"}
      />

      {/* Main Content */}
      {gaze.view === "launcher" ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, overflow: "auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 20, marginTop: 8 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#f1f5f9" }}>👓 Gaze OS</h1>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              Look + Say · Gaze-Simulated Launcher
            </p>
          </div>

          {/* App Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            padding: "0 4px",
          }}>
            {APP_REGISTRY.map((app, idx) => (
              <GlassAppCard
                key={app.id}
                app={app}
                isFocused={gaze.focusedIndex === idx}
                isHovered={gaze.hoveredIndex === idx}
                onClick={() => gaze.openApp(app.id)}
                onMouseEnter={() => gaze.setHoveredIndex(idx)}
                onMouseLeave={() => gaze.setHoveredIndex(null)}
              />
            ))}
          </div>

          {/* Voice Command */}
          <div style={{ marginTop: 16 }}>
            <GlassVoiceCommand onFeedback={(msg) => {
              setFeedback(msg);
              setFeedbackKey((k) => k + 1);
            }} />
          </div>

          {/* Quick actions hint */}
          <div style={{
            marginTop: "auto",
            paddingTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontSize: 11,
            color: "#334155",
            textAlign: "center",
          }}>
            <div>🎯 Mouse hover = gaze simulation</div>
            <div>Arrow keys + Enter · Esc to return</div>
            <div>🎤 Try: "open reader" · "open music"</div>
          </div>
        </div>
      ) : (
        renderApp()
      )}

      {/* Feedback toast */}
      {feedback && (
        <div style={{
          position: "absolute",
          top: 48,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(15,23,42,0.95)",
          border: "1px solid rgba(59,130,246,0.3)",
          borderRadius: 12,
          padding: "8px 20px",
          fontSize: 13,
          color: "#93c5fd",
          zIndex: 100,
          backdropFilter: "blur(12px)",
          whiteSpace: "nowrap",
          animation: "fadeSlideIn 0.2s ease",
        }}>
          {feedback}
        </div>
      )}

      {/* Bottom Bar */}
      <GlassBottomBar />

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}