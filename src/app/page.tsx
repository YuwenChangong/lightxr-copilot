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
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white">
      <Header />
      <CameraCapture onCapture={handleCapture} />

      {/* Task Builder entry */}
      <div className="px-4 pt-2">
        <Link
          href="/tasks"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: "#111827",
            border: "1px solid #1e293b",
            borderRadius: 12,
            padding: "10px",
            color: "#3b82f6",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          🛠 Task Builder — Create Custom Workflows
        </Link>
      </div>

      {/* Task selector + step navigator */}
      <TaskPanel
        currentTask={currentTask}
        currentStepIndex={currentStepIndex}
        onTaskChange={setCurrentTask}
        onStepChange={setCurrentStepIndex}
      />

      {/* Session control bar */}
      <div className="px-4 py-2">
        {!sessionId && !sessionReport ? (
          <button
            onClick={handleStartSession}
            disabled={sessionLoading}
            className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sessionLoading ? "创建中..." : "▶ 开始训练"}
          </button>
        ) : sessionId ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-green-900/30 border border-green-700 rounded-lg px-3 py-2 text-sm text-green-300">
              训练进行中... 会话ID: {sessionId.slice(0, 8)}
            </div>
            <button
              onClick={handleCompleteSession}
              disabled={sessionLoading}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {sessionLoading ? "生成报告中..." : "⏹ 结束训练"}
            </button>
          </div>
        ) : null}
        {sessionError && (
          <p className="text-red-400 text-xs mt-1">{sessionError}</p>
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
        <div className="mx-4 mb-3 p-4 bg-zinc-900 border border-zinc-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-zinc-200">训练报告</h3>
            <button
              onClick={() => setSessionReport(null)}
              className="text-zinc-500 hover:text-zinc-300 text-xs"
            >
              关闭
            </button>
          </div>
          <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {sessionReport}
          </div>
        </div>
      )}

      <div className="px-4 py-3 flex-1">
        <CaptureHistory refreshKey={refreshKey} accessToken={accessToken} />
      </div>

      {/* Privacy notice */}
      <p className="px-4 pb-3 text-[11px] text-zinc-600 leading-relaxed">
        图片只会在你点击 Ask 后上传。请不要上传身份证、银行卡、私人聊天、他人隐私画面等敏感内容。
        <br />
        Images are uploaded only when you press Ask. Do not upload sensitive personal information.
      </p>
    </div>
  );
}