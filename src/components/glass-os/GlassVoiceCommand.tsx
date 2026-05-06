"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { parseCommand, VOICE_HINTS } from "@/lib/glass-os/command-parser";
import { executeAction } from "@/lib/glass-os/action-executor";
import type { AppId } from "@/lib/glass-os/gaze-types";

interface GlassVoiceCommandProps {
  onFeedback: (msg: string) => void;
  currentApp?: AppId | null;
  hasDraft?: boolean;
}

export function GlassVoiceCommand({ onFeedback, currentApp, hasDraft }: GlassVoiceCommandProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedAction, setParsedAction] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<string | null>(null);
  const [holdMode, setHoldMode] = useState(false); // true = hold-to-speak, false = toggle
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");

  // ─── Check SpeechRecognition support ───
  const hasSpeech = typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // ─── Start listening ───
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      onFeedback("⚠ 语音识别不可用，请使用 Chrome");
      return;
    }

    // Stop existing
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const recognition = new SR();
    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setTranscript("");
    setParsedAction(null);
    setExecResult(null);
    finalTranscriptRef.current = "";

    let finalText = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += t;
        } else {
          interim += t;
        }
      }
      const display = (finalText + interim).trim();
      setTranscript(display);
      finalTranscriptRef.current = finalText.trim();
    };

    recognition.onend = () => {
      setIsListening(false);
      const result = finalTranscriptRef.current || transcript.trim();
      if (result) {
        processCommand(result);
      }
      recognitionRef.current = null;
    };

    recognition.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") {
        // Silent — user just didn't speak
      } else {
        onFeedback(`⚠ 语音错误: ${e.error}`);
      }
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      onFeedback("⚠ 无法启动语音识别");
      setIsListening(false);
    }
  }, [transcript, onFeedback]);

  // ─── Stop listening ───
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
  }, []);

  // ─── Toggle (click mode) ───
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // ─── Hold handlers ───
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only primary button, and only if hold mode or shift key
    if (e.button !== 0) return;
    if (e.shiftKey || holdMode) {
      e.preventDefault();
      startListening();
    }
  }, [holdMode, startListening]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (holdMode || (e.shiftKey && isListening)) {
      stopListening();
    }
  }, [holdMode, isListening, stopListening]);

  // ─── Space key support ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        if (isListening) {
          stopListening();
        } else {
          startListening();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isListening, startListening, stopListening]);

  // ─── Process command with context ───
  const processCommand = useCallback((text: string) => {
    const action = parseCommand({ text, currentApp, hasDraft });
    const actionLabel = action.type === "unknown" ? `❓ ${text}` : `→ ${action.type}`;
    setParsedAction(actionLabel);
    executeAction(action, "voice");

    if (action.type !== "unknown") {
      setExecResult("✓ 已执行");
    } else {
      setExecResult("❓ 未识别");
      onFeedback(`❓ 未识别: "${text}"`);
    }

    // Auto-clear after 4s
    setTimeout(() => {
      setParsedAction(null);
      setExecResult(null);
    }, 4000);
  }, [currentApp, hasDraft, onFeedback]);

  // ─── Hint for current context ───
  const hints = currentApp ? VOICE_HINTS[currentApp] : VOICE_HINTS._launcher;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
      padding: "6px 0",
    }}>
      {/* Main button — click = toggle, hold/shift = push-to-talk */}
      <button
        onClick={toggleListening}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => { if (holdMode && isListening) stopListening(); }}
        style={{
          background: isListening ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${isListening ? "#22c55e" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 24,
          padding: "6px 18px",
          color: isListening ? "#22c55e" : "#94a3b8",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          transition: "all 0.2s",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        {isListening ? (
          <>
            <span style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#22c55e",
              animation: "pulse 1s infinite",
            }} />
            聆听中...
          </>
        ) : (
          "🎤 语音"
        )}
      </button>

      {/* Mode toggle + Space hint */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 10,
        color: "#475569",
      }}>
        <button
          onClick={() => setHoldMode(!holdMode)}
          style={{
            background: holdMode ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${holdMode ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.06)"}`,
            borderRadius: 10,
            padding: "2px 8px",
            color: holdMode ? "#93c5fd" : "#475569",
            fontSize: 10,
            cursor: "pointer",
          }}
        >
          {holdMode ? "🔒 Hold" : "🔁 Toggle"}
        </button>
        <span>Space 键 · 按住 Shift</span>
      </div>

      {/* Transcript + Parsed action + Result */}
      {transcript && (
        <div style={{
          fontSize: 12,
          color: "#94a3b8",
          textAlign: "center",
          padding: "2px 8px",
          maxWidth: 280,
          wordBreak: "break-word",
        }}>
          &ldquo;{transcript}&rdquo;
        </div>
      )}

      {parsedAction && (
        <div style={{
          fontSize: 11,
          color: "#60a5fa",
          textAlign: "center",
        }}>
          {parsedAction}
        </div>
      )}

      {execResult && (
        <div style={{
          fontSize: 11,
          color: execResult.startsWith("✓") ? "#22c55e" : "#f59e0b",
          textAlign: "center",
        }}>
          {execResult}
        </div>
      )}

      {/* Voice hints for current context */}
      {hints && hints.length > 0 && !isListening && !transcript && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          marginTop: 4,
        }}>
          {hints.map((h, i) => (
            <div key={i} style={{ fontSize: 10, color: "#334155" }}>
              🗣 {h}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}