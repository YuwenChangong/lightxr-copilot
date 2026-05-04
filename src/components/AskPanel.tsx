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
}

export default function AskPanel({
  captureResult,
  onAnswered,
  currentTask,
  currentStepIndex = 0,
  sessionId = null,
}: AskPanelProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVoiceResult = useCallback((text: string) => {
    setQuestion(text);
  }, []);

  async function handleAsk() {
    if (!captureResult || !question.trim()) return;

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const formData = new FormData();
      const imageFile = new File([captureResult.blob], "capture.jpg", {
        type: "image/jpeg",
      });
      formData.append("image", imageFile);
      formData.append("question", question.trim());

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
      onAnswered?.();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-zinc-900 border-t border-zinc-800 px-4 py-3">
      {/* Question input */}
        <div className="flex gap-2 items-center">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder={captureResult ? "问一下关于拍摄画面的问题..." : "输入问题，或先拍照再提问"}
          disabled={loading}
          className="flex-1 bg-zinc-800 text-white text-sm px-3 py-2 rounded-lg border border-zinc-700 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <VoiceInputButton
          onResult={handleVoiceResult}
          lang="zh-CN"
          disabled={loading}
        />
        <button
          onClick={handleAsk}
          disabled={!captureResult || loading || !question.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "..." : "Ask"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-xs mt-2">{error}</p>
      )}

      {/* AI Answer */}
      {answer && (
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-zinc-500 font-medium">AI Response</p>
            <TextToSpeechButton text={answer} lang="zh-CN" />
          </div>
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
            {answer}
          </p>
        </div>
      )}
    </div>
  );
}
