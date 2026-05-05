"use client";

import { useState, useCallback } from "react";
import Header from "@/components/Header";
import CameraCapture from "@/components/CameraCapture";
import type { CaptureResult } from "@/components/CameraCapture";
import AskPanel from "@/components/AskPanel";
import TaskPanel from "@/components/TaskPanel";
import { CaptureHistory } from "@/components/CaptureHistory";
import type { TaskTemplate } from "@/lib/task-templates";
import { useAnonymousUser } from "@/hooks/useAnonymousUser";
import Link from "next/link";

export default function Home() {
  const { accessToken, loading: authLoading } = useAnonymousUser();
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Task Mode v2 state
  const [currentTask, setCurrentTask] = useState<TaskTemplate | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Session state (Phase 8)
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionReport, setSessionReport] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const handleCapture = useCallback((result: CaptureResult) => {
    setCaptureResult(result);
  }, []);

  const handleStartSession = useCallback(async () => {
    if (sessionLoading) return;
    setSessionLoading(true);
    setSessionError(null);
    setSessionReport(null);

    try {
      const taskName = currentTask?.name || "自由训练";
      const res = await fetch("/api/sessions/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ taskName }),
      });
      const data = await res.json();
      if (res.ok && data.session) {
        setSessionId(data.session.id);
      } else {
        setSessionError(data.error || "创建训练会话失败");
      }
    } catch {
      setSessionError("网络错误，请重试");
    } finally {
      setSessionLoading(false);
    }
  }, [currentTask, sessionLoading, accessToken]);

  const handleCompleteSession = useCallback(async () => {
    if (!sessionId || sessionLoading) return;
    setSessionLoading(true);
    setSessionError(null);

    try {
      const res = await fetch("/api/sessions/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSessionReport(data.report);
        setSessionId(null);
        setRefreshKey((n) => n + 1);
      } else {
        setSessionError(data.error || "完成训练失败");
      }
    } catch {
      setSessionError("网络错误，请重试");
    } finally {
      setSessionLoading(false);
    }
  }, [sessionId, sessionLoading, accessToken]);

  return (
    <div className="flex flex-col min-h-screen bg-[#f2f2f7] text-[#1c1c1e]">
      <Header />
      <CameraCapture onCapture={handleCapture} />

      {/* Task Builder entry */}
      <div className="px-4 pt-3">
        <Link
          href="/tasks"
          className="flex items-center justify-center gap-2 bg-white rounded-xl py-3 text-[15px] font-semibold text-[#007aff] no-underline active:bg-[#f2f2f7] transition-colors"
          style={{ boxShadow: "0 0 0 1px var(--separator), 0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          Task Builder — Create Custom Workflows
        </Link>
      </div>

      {/* Task selector + step navigator */}
      <TaskPanel
        currentTask={currentTask}
        currentStepIndex={currentStepIndex}
        onTaskChange={setCurrentTask}
        onStepChange={setCurrentStepIndex}
        accessToken={accessToken || undefined}
      />

      {/* Session control bar */}
      <div className="px-4 py-2">
        {!sessionId && !sessionReport ? (
          <button
            onClick={handleStartSession}
            disabled={sessionLoading}
            className="w-full px-4 py-2.5 bg-[#34c759] text-white text-[15px] font-semibold rounded-xl active:bg-[#30b350] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ boxShadow: "0 1px 3px rgba(52,199,89,0.3)" }}
          >
            {sessionLoading ? "创建中..." : "▶ 开始训练"}
          </button>
        ) : sessionId ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#34c759]/10 border border-[#34c759]/20 rounded-xl px-3 py-2.5 text-sm text-[#34c759] font-medium">
              训练进行中... {sessionId.slice(0, 8)}
            </div>
            <button
              onClick={handleCompleteSession}
              disabled={sessionLoading}
              className="px-4 py-2.5 bg-[#ff3b30] text-white text-sm font-semibold rounded-xl active:bg-[#e0342b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              style={{ boxShadow: "0 1px 3px rgba(255,59,48,0.3)" }}
            >
              {sessionLoading ? "生成中..." : "⏹ 结束"}
            </button>
          </div>
        ) : null}
        {sessionError && (
          <p className="text-[#ff3b30] text-xs mt-1.5 font-medium">{sessionError}</p>
        )}
      </div>

      {/* Ask panel with task context and session ID */}
      <AskPanel
        captureResult={captureResult}
        onAnswered={() => setRefreshKey((n) => n + 1)}
        currentTask={currentTask}
        currentStepIndex={currentStepIndex}
        sessionId={sessionId}
        accessToken={accessToken}
      />

      {/* Training report */}
      {sessionReport && (
        <div className="mx-4 mb-3 p-4 bg-white rounded-2xl" style={{ boxShadow: "0 0 0 1px var(--separator), 0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[15px] font-semibold text-[#1c1c1e]">训练报告</h3>
            <button
              onClick={() => setSessionReport(null)}
              className="text-[#8e8e93] active:text-[#636366] text-xs font-medium"
            >
              关闭
            </button>
          </div>
          <div className="text-sm text-[#3a3a3c] leading-relaxed whitespace-pre-wrap">
            {sessionReport}
          </div>
        </div>
      )}

      <div className="px-4 py-2 flex-1">
        <CaptureHistory refreshKey={refreshKey} accessToken={accessToken} />
      </div>

      {/* Privacy notice */}
      <p className="px-4 pb-4 text-[11px] text-[#aeaeb2] leading-relaxed text-center">
        图片只会在你点击 Ask 后上传。请勿上传敏感内容。
      </p>
    </div>
  );
}