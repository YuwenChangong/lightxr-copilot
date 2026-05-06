"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type AppId = "chat" | "video" | "reader" | "music" | "camera" | "ask" | "settings";

interface AppCard {
  id: AppId;
  name: string;
  icon: string;
  color: string;
  description: string;
}

const APPS: AppCard[] = [
  { id: "chat", name: "Chat", icon: "💬", color: "#3b82f6", description: "Messages & conversations" },
  { id: "video", name: "Video", icon: "🎬", color: "#ef4444", description: "Watch & record" },
  { id: "reader", name: "Reader", icon: "📖", color: "#22c55e", description: "Documents & articles" },
  { id: "music", name: "Music", icon: "🎵", color: "#a855f7", description: "Play & discover" },
  { id: "camera", name: "Camera", icon: "📷", color: "#f59e0b", description: "Capture moments" },
  { id: "ask", name: "Ask AI", icon: "🧠", color: "#06b6d4", description: "Ask anything" },
  { id: "settings", name: "Settings", icon: "⚙️", color: "#64748b", description: "Preferences" },
];

type OSState = "launcher" | "app";

export default function GlassOSPage() {
  const [osState, setOsState] = useState<OSState>("launcher");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [activeApp, setActiveApp] = useState<AppId | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [voiceText, setVoiceText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [agentAction, setAgentAction] = useState<string | null>(null);
  const [showAgentFeedback, setShowAgentFeedback] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Keyboard navigation for gaze simulation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (osState === "launcher") {
        switch (e.key) {
          case "ArrowRight":
            e.preventDefault();
            setFocusedIndex((prev) => Math.min(prev + 1, APPS.length - 1));
            break;
          case "ArrowLeft":
            e.preventDefault();
            setFocusedIndex((prev) => Math.max(prev - 1, 0));
            break;
          case "ArrowDown":
            e.preventDefault();
            setFocusedIndex((prev) => Math.min(prev + 3, APPS.length - 1));
            break;
          case "ArrowUp":
            e.preventDefault();
            setFocusedIndex((prev) => Math.max(prev - 3, 0));
            break;
          case "Enter":
            e.preventDefault();
            openApp(APPS[focusedIndex].id);
            break;
          case "Escape":
            break;
        }
      } else if (osState === "app") {
        if (e.key === "Escape") {
          e.preventDefault();
          closeApp();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [osState, focusedIndex]);

  const openApp = useCallback((id: AppId) => {
    setActiveApp(id);
    setOsState("app");
    setAgentAction(`Opening ${APPS.find((a) => a.id === id)?.name}...`);
    setShowAgentFeedback(true);
    setTimeout(() => setShowAgentFeedback(false), 1500);
  }, []);

  const closeApp = useCallback(() => {
    setActiveApp(null);
    setOsState("launcher");
  }, []);

  const startVoiceCommand = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceText("Speech recognition not supported");
      return;
    }

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    setIsListening(true);
    setVoiceText("");

    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setVoiceText(text);
    };

    recognition.onend = () => {
      setIsListening(false);
      processVoiceCommand(voiceText);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [voiceText]);

  const processVoiceCommand = useCallback((text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("chat") || lower.includes("message")) {
      openApp("chat");
    } else if (lower.includes("video") || lower.includes("watch")) {
      openApp("video");
    } else if (lower.includes("read") || lower.includes("book")) {
      openApp("reader");
    } else if (lower.includes("music") || lower.includes("play")) {
      openApp("music");
    } else if (lower.includes("camera") || lower.includes("photo")) {
      openApp("camera");
    } else if (lower.includes("ask") || lower.includes("ai")) {
      openApp("ask");
    } else if (lower.includes("setting") || lower.includes("config")) {
      openApp("settings");
    } else if (lower.includes("back") || lower.includes("home")) {
      closeApp();
    } else {
      setAgentAction(`Agent: "${text}" — no matching app found`);
      setShowAgentFeedback(true);
      setTimeout(() => setShowAgentFeedback(false), 2500);
    }
  }, [openApp, closeApp]);

  // Render app content
  function renderAppContent(appId: AppId) {
    const app = APPS.find((a) => a.id === appId);
    if (!app) return null;

    return (
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{app.icon}</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", margin: "0 0 8px" }}>{app.name}</h2>
        <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px" }}>{app.description}</p>

        {appId === "ask" && (
          <div style={{
            background: "rgba(6,182,212,0.1)",
            border: "1px solid rgba(6,182,212,0.3)",
            borderRadius: 16,
            padding: 20,
            maxWidth: 400,
            width: "100%",
          }}>
            <p style={{ fontSize: 13, color: "#06b6d4", margin: "0 0 12px" }}>Ask AI would open the camera + voice interface</p>
            <a
              href="/glass"
              style={{
                display: "inline-block",
                background: "#06b6d4",
                borderRadius: 10,
                padding: "10px 24px",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Open Glass Mode →
            </a>
          </div>
        )}

        {appId === "settings" && (
          <div style={{
            background: "rgba(100,116,139,0.1)",
            border: "1px solid rgba(100,116,139,0.3)",
            borderRadius: 16,
            padding: 20,
            maxWidth: 400,
            width: "100%",
            textAlign: "left",
          }}>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>
              <div style={{ padding: "8px 0", borderBottom: "1px solid rgba(100,116,139,0.2)" }}>
                🌐 Language: English
              </div>
              <div style={{ padding: "8px 0", borderBottom: "1px solid rgba(100,116,139,0.2)" }}>
                🔊 Volume: 80%
              </div>
              <div style={{ padding: "8px 0", borderBottom: "1px solid rgba(100,116,139,0.2)" }}>
                👁️ Gaze Sensitivity: Medium
              </div>
              <div style={{ padding: "8px 0" }}>
                🔒 Privacy: Standard
              </div>
            </div>
          </div>
        )}

        {appId !== "ask" && appId !== "settings" && (
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 24,
            maxWidth: 400,
            width: "100%",
          }}>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
              This is a Gaze OS prototype placeholder.
              <br />In the real device, {app.name} would be rendered here.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0a0f1a",
      color: "#e2e8f0",
      fontFamily: "'Inter', system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: "1px solid #1e293b",
        background: "#0f172a",
      }}>
        <a href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: 13 }}>← Home</a>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>
          👓 Gaze OS
        </span>
        <button
          onClick={startVoiceCommand}
          disabled={isListening}
          style={{
            background: isListening ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${isListening ? "#22c55e" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 20,
            padding: "4px 12px",
            color: isListening ? "#22c55e" : "#94a3b8",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {isListening ? "🎤 Listening..." : "🎤 Voice"}
        </button>
      </div>

      {/* Voice feedback */}
      {voiceText && (
        <div style={{
          background: "rgba(34,197,94,0.08)",
          padding: "8px 16px",
          fontSize: 13,
          color: "#22c55e",
          textAlign: "center",
        }}>
          🎤 "{voiceText}"
        </div>
      )}

      {/* Agent action feedback */}
      {showAgentFeedback && agentAction && (
        <div style={{
          background: "rgba(59,130,246,0.08)",
          padding: "8px 16px",
          fontSize: 13,
          color: "#3b82f6",
          textAlign: "center",
        }}>
          ⚡ {agentAction}
        </div>
      )}

      {/* Content */}
      {osState === "launcher" ? (
        /* Launcher - App Grid */
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}>
          <h1 style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#94a3b8",
            margin: "0 0 32px",
            textAlign: "center",
          }}>
            Gaze OS Launcher
          </h1>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            maxWidth: 400,
            width: "100%",
          }}>
            {APPS.map((app, index) => (
              <button
                key={app.id}
                onClick={() => openApp(app.id)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  background: focusedIndex === index
                    ? `${app.color}15`
                    : hoveredIndex === index
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.02)",
                  border: `2px solid ${focusedIndex === index ? app.color : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 20,
                  padding: "20px 12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  transform: focusedIndex === index ? "scale(1.05)" : "scale(1)",
                }}
              >
                <span style={{ fontSize: 32 }}>{app.icon}</span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: focusedIndex === index ? app.color : "#94a3b8",
                }}>
                  {app.name}
                </span>
              </button>
            ))}
          </div>

          {/* Navigation hint */}
          <p style={{
            fontSize: 11,
            color: "#475569",
            marginTop: 32,
            textAlign: "center",
            lineHeight: 1.6,
          }}>
            Arrow keys to simulate gaze • Enter to select • Esc to go back
            <br />
            Hover mouse to simulate eye tracking
          </p>
        </div>
      ) : (
        /* App View */
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* App header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderBottom: "1px solid #1e293b",
          }}>
            <button
              onClick={closeApp}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "4px 12px",
                color: "#94a3b8",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              ← Back
            </button>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {APPS.find((a) => a.id === activeApp)?.icon}{" "}
              {APPS.find((a) => a.id === activeApp)?.name}
            </span>
          </div>

          {activeApp && renderAppContent(activeApp)}
        </div>
      )}

      {/* Bottom status bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        borderTop: "1px solid #1e293b",
        background: "#0f172a",
        fontSize: 11,
        color: "#475569",
      }}>
        <span>Gaze OS v0.1 Prototype</span>
        <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </div>
  );
}