"use client";

import { useState, useRef, useCallback } from "react";
import { parseVoiceCommand } from "@/lib/glass-os/command-parser";
import { executeAction } from "@/lib/glass-os/action-executor";

interface GlassVoiceCommandProps {
  onFeedback: (msg: string) => void;
}

export function GlassVoiceCommand({ onFeedback }: GlassVoiceCommandProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      onFeedback("Speech recognition not supported");
      return;
    }

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    setIsListening(true);
    setTranscript("");

    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (transcript.trim()) {
        processCommand(transcript.trim());
      }
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [transcript, onFeedback]);

  const processCommand = useCallback((text: string) => {
    const action = parseVoiceCommand(text);
    setLastCommand(text);
    executeAction(action);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      padding: "8px 0",
    }}>
      <button
        onClick={isListening ? stopListening : startListening}
        style={{
          background: isListening ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${isListening ? "#22c55e" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 24,
          padding: "8px 20px",
          color: isListening ? "#22c55e" : "#94a3b8",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          transition: "all 0.2s",
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
            Listening...
          </>
        ) : (
          "🎤 Voice Command"
        )}
      </button>

      {transcript && (
        <div style={{
          fontSize: 12,
          color: "#64748b",
          textAlign: "center",
          padding: "2px 8px",
        }}>
          &ldquo;{transcript}&rdquo;
        </div>
      )}

      {lastCommand && !isListening && (
        <div style={{
          fontSize: 11,
          color: "#475569",
          textAlign: "center",
        }}>
          Last: {lastCommand}
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