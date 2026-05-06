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
    const effectiveQuestion = question.trim() || (captureResult ? "请描述这个画面，识别图中的物体，并告诉我下一步该做什么" : "");
    if (!effectiveQuestion) return;

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const formData = new FormData();
      if (captureResult) {
        const blob = captureResult instanceof FileList ? captureResult[Math.max(0, captureResult.length - 1)] : captureResult.blob;
        const imageFile = new File([blob], "capture.jpg", { type: "image/jpeg" });
        formData.append("image", imageFile);
      }
      formData.append("question", effectiveQuestion);

      if (currentTask) {
        const step = currentTask.steps[currentStepIndex];
        formData.append("taskName", currentTask.name);
        formData.append("stepIndex", String(currentStepIndex));
        formData.append("stepTitle", step?.title || "");
        formData.append("stepInstruction", step?.instruction || "");
        formData.append("successCriteria", step?.successCriteria || "");
      }

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
        setError(data.error || "请求失败");
        return;
      }

      setAnswer(data.answer);
      if (data.capture) {
        setSaveStatus("saved");
      } else {
        setSaveStatus("failed");
        console.warn("Capture not saved:", data);
      }
      if (data.debug?.aiError) {
        console.error("AI Error:", data.debug.aiError);
      }
      onAnswered?.();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card-elevated overflow-hidden">
      {/* Input area */}
      <div className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder={captureResult ? "询问关于拍摄画面的问题..." : "输入问题，或先拍照再提问"}
              disabled={loading}
              className="w-full bg-[var(--system-gray6)] text-[var(--label)] text-subhead px-4 py-3 rounded-[var(--radius-md)] border-0 placeholder:text-[var(--system-gray2)] focus:ring-2 focus:ring-[var(--system-blue)]/30 disabled:opacity-40"
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}
            />
          </div>
          <VoiceInputButton
            onResult={handleVoiceResult}
            lang="zh-CN"
            disabled={loading}
          />
          <button
            onClick={handleAsk}
            disabled={loading || (!question.trim() && !captureResult)}
            className="btn-primary flex-shrink-0"
            style={{ padding: "12px 20px" }}
          >
            {loading ? (
              <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" opacity="0.3"/>
                <path d="M12 2a10 10 0 0 1 10 10"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>

        {/* Status indicators */}
        {error && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--system-red)]/8">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--system-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span className="text-caption-1 font-medium" style={{ color: "var(--system-red)" }}>{error}</span>
          </div>
        )}

        {saveStatus && (
          <div className={`mt-3 flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)] ${
            saveStatus === "saved" ? "bg-[var(--system-green)]/8" : "bg-[var(--system-orange)]/8"
          }`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={saveStatus === "saved" ? "var(--system-green)" : "var(--system-orange)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {saveStatus === "saved" ? (
                <>
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="9 12 11.5 14.5 16 9.5"/>
                </>
              ) : (
                <>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <circle cx="12" cy="16" r="0.5" fill="currentColor"/>
                </>
              )}
            </svg>
            <span className={`text-caption-1 font-medium ${
              saveStatus === "saved" ? "text-[var(--system-green)]" : "text-[var(--system-orange)]"
            }`}>
              {saveStatus === "saved" ? "记录已保存" : "记录未保存到数据库"}
            </span>
          </div>
        )}
      </div>

      {/* AI Answer */}
      {answer && (
        <div className="border-t border-[var(--separator)] p-4 animate-slide-up bg-[var(--system-gray6)]/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--system-blue)] to-[var(--system-purple)] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-footnote font-semibold text-[var(--secondary-label)]">AI 回答</span>
            <div className="ml-auto">
              <TextToSpeechButton text={answer} lang="zh-CN" />
            </div>
          </div>
          <p className="text-subhead text-[var(--label)] leading-relaxed whitespace-pre-wrap">
            {answer}
          </p>
        </div>
      )}
    </div>
  );
}