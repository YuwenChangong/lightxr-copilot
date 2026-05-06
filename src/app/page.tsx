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

  // Session state
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
    <div className="flex flex-col min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Header />

      <main className="flex-1 max-w-screen-sm mx-auto w-full px-4 pb-8">
        {/* Hero section */}
        <section className="pt-5 pb-4 animate-fade-in">
          <h2 className="text-title-1 text-[var(--label)] mb-1">LightXR Copilot</h2>
          <p className="text-subhead text-[var(--secondary-label)]">
            第一视角 AI 问答助手
          </p>
        </section>

        {/* Quick Actions — iOS style grid */}
        <section className="mb-5 animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <p className="text-footnote text-[var(--tertiary-label)] font-semibold uppercase tracking-wider mb-2 px-1">
            快速入口
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/glass"
              className="card-elevated flex flex-col items-center gap-2 py-5 px-3 no-underline text-[var(--label)] active:bg-[var(--fill4)] transition-all"
            >
              <div className="w-11 h-11 rounded-[var(--radius-lg)] bg-[#007aff]/10 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              </div>
              <span className="text-subhead font-semibold">Glass Mode</span>
              <span className="text-caption-1 text-[var(--tertiary-label)]">Tap to Ask</span>
            </Link>
            <Link
              href="/glass-os"
              className="card-elevated flex flex-col items-center gap-2 py-5 px-3 no-underline text-[var(--label)] active:bg-[var(--fill4)] transition-all"
            >
              <div className="w-11 h-11 rounded-[var(--radius-lg)] bg-[#5856d6]/10 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5856d6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2"/>
                  <path d="M8 21h8M12 17v4"/>
                </svg>
              </div>
              <span className="text-subhead font-semibold">Gaze OS</span>
              <span className="text-caption-1 text-[var(--tertiary-label)]">Launcher</span>
            </Link>
          </div>
        </section>

        {/* Camera Section */}
        <section className="mb-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <p className="text-footnote text-[var(--tertiary-label)] font-semibold uppercase tracking-wider mb-2 px-1">
            拍摄
          </p>
          <div className="card-elevated overflow-hidden">
            <CameraCapture onCapture={handleCapture} />
          </div>
        </section>

        {/* Ask Panel */}
        <section className="mb-4 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <AskPanel
            captureResult={captureResult}
            onAnswered={() => setRefreshKey((n) => n + 1)}
            currentTask={currentTask}
            currentStepIndex={currentStepIndex}
            sessionId={sessionId}
            accessToken={accessToken}
          />
        </section>

        {/* Recent Captures */}
        <section className="mb-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <CaptureHistory refreshKey={refreshKey} accessToken={accessToken} />
        </section>

        {/* Advanced Section */}
        <section className="mb-4 animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <p className="text-footnote text-[var(--tertiary-label)] font-semibold uppercase tracking-wider mb-2 px-1">
            Advanced
          </p>

          {/* Workflow Builder Link */}
          <Link
            href="/tasks"
            className="card list-item no-underline text-[var(--label)] mb-3 active:bg-[var(--fill4)]"
          >
            <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[#ff9500]/10 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff9500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-subhead font-semibold truncate">Workflow Builder</p>
              <p className="text-caption-1 text-[var(--tertiary-label)]">创建和管理工作流</p>
            </div>
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="text-[var(--system-gray3)] flex-shrink-0">
              <path d="M1 1L7 7L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          {/* Task Panel */}
          <div className="card p-4 mb-3">
            <TaskPanel
              currentTask={currentTask}
              currentStepIndex={currentStepIndex}
              onTaskChange={setCurrentTask}
              onStepChange={setCurrentStepIndex}
              accessToken={accessToken || undefined}
            />
          </div>

          {/* Session Control */}
          <div className="card p-4">
            {!sessionId && !sessionReport ? (
              <button
                onClick={handleStartSession}
                disabled={sessionLoading}
                className="btn-primary w-full"
                style={{ background: "var(--system-green)" }}
              >
                {sessionLoading ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" opacity="0.3"/>
                      <path d="M12 2a10 10 0 0 1 10 10"/>
                    </svg>
                    创建中...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21"/>
                    </svg>
                    开始引导训练
                  </>
                )}
              </button>
            ) : sessionId ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 bg-[var(--system-green)]/10 rounded-[var(--radius-md)] px-3 py-2.5">
                  <div className="w-2 h-2 rounded-full bg-[var(--system-green)] animate-pulse" />
                  <span className="text-subhead text-[var(--system-green)] font-medium">
                    训练中 {sessionId.slice(0, 8)}
                  </span>
                </div>
                <button
                  onClick={handleCompleteSession}
                  disabled={sessionLoading}
                  className="btn-primary flex-shrink-0"
                  style={{ background: "var(--system-red)", padding: "10px 16px" }}
                >
                  {sessionLoading ? "生成中..." : "结束"}
                </button>
              </div>
            ) : null}
            {sessionError && (
              <p className="text-caption-1 mt-2 font-medium" style={{ color: "var(--system-red)" }}>
                {sessionError}
              </p>
            )}
          </div>

          {/* Training Report */}
          {sessionReport && (
            <div className="card-elevated p-4 mt-3 animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-headline text-[var(--label)]">训练报告</h3>
                <button
                  onClick={() => setSessionReport(null)}
                  className="btn-secondary"
                  style={{ padding: "6px 12px", fontSize: "13px" }}
                >
                  关闭
                </button>
              </div>
              <div className="text-subhead text-[var(--secondary-label)] leading-relaxed whitespace-pre-wrap">
                {sessionReport}
              </div>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="pt-2 pb-4 text-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <p className="text-caption-2 text-[var(--system-gray2)]">
            图片仅在点击 Ask 后上传 · 请勿上传敏感内容
          </p>
        </footer>
      </main>
    </div>
  );
}