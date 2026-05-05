"use client";

import { useState, useCallback } from "react";
import type { CaptureResult } from "./CameraCapture";
import type { TaskTemplate } from "@/lib/task-templates";
import VoiceInputButton from "./VoiceInputButton";
import TextToSpeechButton from "./TextToSpeechButton";

interface AskPanelProps {
  captureResult: CaptureResult | null;
  onAnswered?: () => void;
  currentTask?: TaskTemplate | null;
  currentStepIndex?: number;
  sessionId?: string | null;
  accessToken?: string | null;
}

export default function AskPanel({
  captureResult,
  onAnswered,
  currentTask,
  currentStepIndex = 0,
  sessionId = null,
  accessToken = null,
}: AskPanelProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "failed" | null>(null);

  const handleVoiceResult = useCallback((text: string) => {
    setQuestion(text);
  }, []);

  async function handleAsk() {
    // Allow asking with just a photo (no text needed) - use default question
    const effectiveQuestion = question.trim() || (captureResult ? "请描述这个画面，识别图中的物体，并告诉我下一步该做什么" : "");
    if (!effectiveQuestion) return;

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const formData = new FormData();
      if (captureResult) {
        const blob = captureResult instanceof FileList ? captureResult[Math.max(0, captureResult.length - 1)] : captureResult.blob;
        const imageFile = new File([blob], "capture.jpg", {
          type: "image/jpeg",
        });
        formData.append("image", imageFile);
      }
      formData.append("question", effectiveQuestion);

      // Attach task context if active
      if (currentTask) {
        const step = currentTask.steps[currentStepIndex];
        formData.append("taskName", currentTask.name);
        formData.append("stepIndex", String(currentStepIndex));
        formData.append("stepTitle", step?.title || "");
        formData.append("stepInstruction", step?.instruction || "");
        formData.append("successCriteria", step?.successCriteria || "");
      }

      // Attach session ID if active
      if (sessionId) {
        formData.append("sessionId", sessionId);
      }

      const headers: HeadersInit = {};
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Request failed.");
        return;
      }

      setAnswer(data.answer);
      // Show save status
      if (data.capture) {
        setSaveStatus("saved");
      } else {
        setSaveStatus("failed");
        console.warn("Capture not saved:", data);
      }
      // Show AI error in development
      if (data.debug?.aiError) {
        console.error("AI Error:", data.debug.aiError);
      }
      onAnswered?.();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border-t border-[var(--separator)] px-4 py-3 rounded-b-2xl mx-3" style={{ boxShadow: "0 0 0 1px var(--separator), 0 2px 8px rgba(0,0,0,0.04)" }}>
      {/* Question input */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder={captureResult ? "问一下关于拍摄画面的问题..." : "输入问题，或先拍照再提问"}
          disabled={loading}
          className="flex-1 bg-[#f2f2f7] text-[#1c1c1e] text-[15px] px-3.5 py-2.5 rounded-xl border-0 placeholder:text-[#aeaeb2] focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 disabled:opacity-40"
          style={{ fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}
        />
        <VoiceInputButton
          onResult={handleVoiceResult}
          lang="zh-CN"
          disabled={loading}
        />
        <button
          onClick={handleAsk}
          disabled={loading || (!question.trim() && !captureResult)}
          className="px-4 py-2.5 bg-[#007aff] text-white text-[15px] font-semibold rounded-xl active:bg-[#0066d6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "..." : "Ask"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-[#ff3b30] text-xs mt-2 font-medium">{error}</p>
      )}

      {/* Save Status */}
      {saveStatus && (
        <p className={`text-xs mt-2 font-medium ${saveStatus === "saved" ? "text-[#34c759]" : "text-[#ff9500]"}`}>
          {saveStatus === "saved" ? "✓ 记录已保存" : "⚠ 记录未保存到数据库"}
        </p>
      )}

      {/* AI Answer */}
      {answer && (
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-[#8e8e93] font-medium">AI Response</p>
            <TextToSpeechButton text={answer} lang="zh-CN" />
          </div>
          <p className="text-sm text-[#3a3a3c] leading-relaxed whitespace-pre-wrap">
            {answer}
          </p>
        </div>
      )}
    </div>
  );
}
