"use client";

import { useState, useEffect, useCallback } from "react";
import { registerHandler, speak } from "@/lib/glass-os/action-executor";
import type { AgentAction } from "@/lib/glass-os/gaze-types";

const SAMPLE_PAGES = [
  `Chapter 1: The Future of Wearable AI

Augmented reality glasses represent the next frontier in personal computing. Unlike smartphones that demand our visual attention, AR glasses overlay information onto the real world seamlessly.

The key challenge is not hardware — it's interaction. How do you control a device when your hands are occupied and your eyes are scanning the environment?

Eye tracking provides the answer. By understanding where the user is looking, the system can infer intent and offer contextual assistance.`,
  `Chapter 2: Gaze-Based Interaction

Gaze interaction differs fundamentally from touch or mouse input. A gaze signal is:
- Fast (~200ms latency)
- Always available (eyes are always "on")
- Ambiguous (looking ≠ intending)

The solution: combine gaze with confirmation signals like voice commands, tap gestures, or dwell time.

In Gaze OS, the "look + say" pattern is primary: look at an app and say "open" to launch it.`,
  `Chapter 3: Agent Actions

Every user intent in Gaze OS is expressed as a structured AgentAction:

{
  type: "open_app",
  payload: { appId: "reader" },
  source: "voice",
  timestamp: 1234567890
}

This architecture decouples input (voice, gaze, touch) from output (UI changes), making the system extensible and testable.`,
];

export function DemoReaderApp() {
  const [pageIndex, setPageIndex] = useState(0);
  const [fontSize, setFontSize] = useState(14);
  const [summary, setSummary] = useState<string | null>(null);

  // Register action handler
  useEffect(() => {
    const unsub = registerHandler("reader", (action: AgentAction) => {
      switch (action.type) {
        case "reader_next_page":
          setPageIndex((p) => Math.min(p + 1, SAMPLE_PAGES.length - 1));
          break;
        case "reader_prev_page":
          setPageIndex((p) => Math.max(p - 1, 0));
          break;
        case "reader_summarize":
          setSummary("This page discusses " + getTopic(SAMPLE_PAGES[pageIndex]));
          speak("This page discusses " + getTopic(SAMPLE_PAGES[pageIndex]));
          break;
        case "reader_font_increase":
          setFontSize((s) => Math.min(s + 2, 24));
          break;
        case "reader_font_decrease":
          setFontSize((s) => Math.max(s - 2, 10));
          break;
      }
    });
    return unsub;
  }, [pageIndex]);

  const handleNext = useCallback(() => {
    setPageIndex((p) => Math.min(p + 1, SAMPLE_PAGES.length - 1));
  }, []);

  const handlePrev = useCallback(() => {
    setPageIndex((p) => Math.max(p - 1, 0));
  }, []);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20 }}>
      {/* Page content */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        color: "#e2e8f0",
        fontSize,
        lineHeight: 1.8,
        whiteSpace: "pre-wrap",
        fontFamily: "Georgia, serif",
        padding: "0 4px",
      }}>
        {SAMPLE_PAGES[pageIndex]}
      </div>

      {/* Summary overlay */}
      {summary && (
        <div style={{
          background: "rgba(34,197,94,0.1)",
          border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: 12,
          padding: 12,
          marginTop: 12,
          fontSize: 13,
          color: "#22c55e",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span>📝 {summary}</span>
          <button
            onClick={() => setSummary(null)}
            style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 12 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 0 0",
        borderTop: "1px solid #1e293b",
        marginTop: 12,
      }}>
        <button
          onClick={handlePrev}
          disabled={pageIndex === 0}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "6px 14px",
            color: pageIndex === 0 ? "#334155" : "#94a3b8",
            fontSize: 13,
            cursor: pageIndex === 0 ? "default" : "pointer",
          }}
        >
          ← Prev
        </button>

        <span style={{ fontSize: 12, color: "#64748b" }}>
          Page {pageIndex + 1} / {SAMPLE_PAGES.length} · Font {fontSize}px
        </span>

        <button
          onClick={handleNext}
          disabled={pageIndex === SAMPLE_PAGES.length - 1}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "6px 14px",
            color: pageIndex === SAMPLE_PAGES.length - 1 ? "#334155" : "#94a3b8",
            fontSize: 13,
            cursor: pageIndex === SAMPLE_PAGES.length - 1 ? "default" : "pointer",
          }}
        >
          Next →
        </button>
      </div>

      {/* Voice hints */}
      <div style={{ fontSize: 11, color: "#334155", textAlign: "center", marginTop: 8 }}>
        🎤 "next page" · "previous page" · "summarize" · "font bigger"
      </div>
    </div>
  );
}

function getTopic(text: string): string {
  const firstLine = text.split("\n")[0];
  return firstLine.replace(/^Chapter \d+:\s*/, "").toLowerCase();
}