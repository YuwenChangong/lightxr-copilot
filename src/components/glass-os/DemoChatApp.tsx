"use client";

import { useState, useEffect, useCallback } from "react";
import { registerHandler, speak } from "@/lib/glass-os/action-executor";
import type { AgentAction } from "@/lib/glass-os/gaze-types";

const DEMO_MESSAGES = [
  { id: 1, from: "Alice", text: "Hey! Are you coming to the meeting at 3?", time: "14:52" },
  { id: 2, from: "Bob", text: "The design review is ready for your input.", time: "15:01" },
  { id: 3, from: "Alice", text: "Also, check the latest prototype when you get a chance 🙏", time: "15:10" },
];

export function DemoChatApp() {
  const [draft, setDraft] = useState("");
  const [showDraft, setShowDraft] = useState(false);
  const [sent, setSent] = useState(false);
  const [readAloud, setReadAloud] = useState(false);

  useEffect(() => {
    const unsub = registerHandler("chat", (action: AgentAction) => {
      switch (action.type) {
        case "chat_read_latest": {
          const last = DEMO_MESSAGES[DEMO_MESSAGES.length - 1];
          speak(`${last.from} says: ${last.text}`);
          setReadAloud(true);
          setTimeout(() => setReadAloud(false), 3000);
          break;
        }
        case "chat_reply":
          setDraft((action.payload?.text as string) ?? "");
          setShowDraft(true);
          setSent(false);
          break;
        case "chat_send":
          if (showDraft && draft) {
            speak(`Message sent: ${draft}`);
            setSent(true);
            setDraft("");
            setTimeout(() => { setShowDraft(false); setSent(false); }, 2000);
          }
          break;
        case "chat_cancel":
          setDraft("");
          setShowDraft(false);
          setSent(false);
          break;
      }
    });
    return unsub;
  }, [draft, showDraft]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16 }}>
      {/* Messages */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
        {DEMO_MESSAGES.map((msg) => (
          <div key={msg.id} style={{
            background: "rgba(59,130,246,0.08)",
            border: "1px solid rgba(59,130,246,0.15)",
            borderRadius: 12,
            padding: "10px 14px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6" }}>{msg.from}</span>
              <span style={{ fontSize: 11, color: "#475569" }}>{msg.time}</span>
            </div>
            <div style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.5 }}>{msg.text}</div>
          </div>
        ))}

        {readAloud && (
          <div style={{ fontSize: 12, color: "#22c55e", textAlign: "center" }}>🔊 Reading latest message...</div>
        )}
      </div>

      {/* Draft area */}
      {showDraft && (
        <div style={{
          background: sent ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${sent ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 12,
          padding: 12,
          marginTop: 10,
        }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>
            {sent ? "✓ Sent" : "Draft reply:"}
          </div>
          {!sent && (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "8px 12px",
                color: "#e2e8f0",
                fontSize: 14,
                outline: "none",
              }}
              placeholder="Type your reply..."
            />
          )}
        </div>
      )}

      {/* Voice hints */}
      <div style={{ fontSize: 11, color: "#334155", textAlign: "center", marginTop: 10 }}>
        🎤 "read latest" · "reply hello!" · "send" · "cancel"
      </div>
    </div>
  );
}