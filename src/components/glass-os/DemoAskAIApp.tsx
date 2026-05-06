"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { registerHandler, speak } from "@/lib/glass-os/action-executor";
import type { AgentAction } from "@/lib/glass-os/gaze-types";

export function DemoAskAIApp() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "thinking">("idle");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ q: string; a: string }>>([]);
  const queryRef = useRef(query);
  queryRef.current = query;

  const handleAsk = useCallback(async (text?: string) => {
    const effectiveQuery = text || queryRef.current;
    if (!effectiveQuery.trim()) return;

    setLoading(true);
    setPhase("thinking");
    setError(null);
    setAnswer(null);

    try {
      const formData = new FormData();
      formData.append("question", effectiveQuery.trim());

      setPhase("thinking");

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Request failed.");
        return;
      }

      setAnswer(data.answer);
      speak(data.answer, "zh-CN");
      setHistory((h) => [{ q: effectiveQuery.trim(), a: data.answer }, ...h].slice(0, 10));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      setPhase("idle");
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setPhase("uploading");
    setError(null);
    setAnswer(null);

    try {
      // Capture current screen via canvas
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0a0f1a";
        ctx.fillRect(0, 0, 400, 300);
        ctx.fillStyle = "#64748b";
        ctx.font = "14px sans-serif";
        ctx.fillText("Screen analysis requested", 100, 150);
      }

      const formData = new FormData();
      formData.append("question", "请描述当前画面，识别图中的物体，并告诉我下一步该做什么");

      // Simulate upload phase for image analysis
      await new Promise((r) => setTimeout(r, 600));
      setPhase("thinking");

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Analysis failed.");
        return;
      }

      setAnswer(data.answer);
      speak(data.answer, "zh-CN");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      setPhase("idle");
    }
  }, []);

  // Register action handler for voice commands
  useEffect(() => {
    const unsub = registerHandler("ask", (action: AgentAction) => {
      switch (action.type) {
        case "ask_query":
          handleAsk(action.payload?.text as string);
          break;
        case "ask_analyze":
          handleAnalyze();
          break;
      }
    });
    return unsub;
  }, [handleAsk, handleAnalyze]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, gap: 12 }}>
      {/* AI Brain icon */}
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 36 }}>🧠</span>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginTop: 4 }}>Ask AI</div>
        <div style={{ fontSize: 11, color: "#64748b" }}>Voice or text — ask anything</div>
      </div>

      {/* Input area */}
      <div style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder="Type a question..."
          disabled={loading}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: "10px 14px",
            color: "#e2e8f0",
            fontSize: 14,
            outline: "none",
            opacity: loading ? 0.5 : 1,
          }}
        />
        <button
          onClick={() => handleAsk()}
          disabled={loading || !query.trim()}
          style={{
            background: "rgba(6,182,212,0.15)",
            border: "1px solid rgba(6,182,212,0.3)",
            borderRadius: 10,
            padding: "10px 16px",
            color: "#06b6d4",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            opacity: loading || !query.trim() ? 0.4 : 1,
          }}
        >
          {loading ? "..." : "Ask"}
        </button>
      </div>

      {/* Analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={loading}
        style={{
          background: "rgba(6,182,212,0.08)",
          border: "1px solid rgba(6,182,212,0.15)",
          borderRadius: 10,
          padding: "10px 16px",
          color: "#06b6d4",
          fontSize: 13,
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.5 : 1,
        }}
      >
        📸 Analyze Current View
      </button>

      {/* Error */}
      {error && (
        <div style={{
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 10,
          padding: 10,
          fontSize: 13,
          color: "#ef4444",
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Loading indicator with phase differentiation */}
      {loading && (
        <div style={{ textAlign: "center", padding: 12 }}>
          {phase === "uploading" ? (
            <div style={{ fontSize: 13, color: "#f59e0b" }}>
              <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>{" "}
              Uploading image...
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#06b6d4" }}>🧠 Thinking...</div>
          )}
        </div>
      )}

      {/* Answer */}
      {answer && !loading && (
        <div style={{
          background: "rgba(6,182,212,0.08)",
          border: "1px solid rgba(6,182,212,0.15)",
          borderRadius: 12,
          padding: 14,
          flex: 1,
          overflowY: "auto",
        }}>
          <div style={{ fontSize: 11, color: "#06b6d4", fontWeight: 700, marginBottom: 8 }}>AI Response</div>
          <div style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {answer}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={{
          borderTop: "1px solid #1e293b",
          paddingTop: 10,
        }}>
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>Recent</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 120, overflowY: "auto" }}>
            {history.map((item, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
                onClick={() => { setQuery(item.q); setAnswer(item.a); }}
              >
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 2 }}>Q: {item.q}</div>
                <div style={{ fontSize: 11, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  A: {item.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voice hints */}
      <div style={{ fontSize: 11, color: "#334155", textAlign: "center", marginTop: "auto" }}>
        🗣 问什么是… · 分析 · 分析当前画面 · 返回
      </div>
    </div>
  );
}