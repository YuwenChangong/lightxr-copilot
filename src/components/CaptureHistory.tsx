"use client";

import { useEffect, useState } from "react";

type Capture = {
  id: string;
  created_at: string;
  image_url: string | null;
  question: string;
  answer: string;
  task_name: string | null;
  step_index: number | null;
  step_title: string | null;
};

interface CaptureHistoryProps {
  refreshKey: number;
  accessToken?: string | null;
}

export function CaptureHistory({ refreshKey, accessToken = null }: CaptureHistoryProps) {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadCaptures(token?: string | null) {
    setLoading(true);

    try {
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/captures", { headers });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load captures");
      }

      setCaptures(data.captures || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCaptures(accessToken);
  }, [refreshKey, accessToken]);

  if (!loading && captures.length === 0) {
    return (
      <div>
        <p className="text-footnote text-[var(--tertiary-label)] font-semibold uppercase tracking-wider mb-2 px-1">
          Recent Captures
        </p>
        <div className="card p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--system-gray6)] flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--system-gray3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
          <p className="text-subhead text-[var(--tertiary-label)]">暂无记录</p>
          <p className="text-caption-1 text-[var(--system-gray2)] mt-1">拍照并提问后，记录将显示在这里</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-footnote text-[var(--tertiary-label)] font-semibold uppercase tracking-wider">
          Recent Captures
        </p>
        {loading && (
          <div className="flex items-center gap-1.5">
            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--system-gray2)" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" opacity="0.3"/>
              <path d="M12 2a10 10 0 0 1 10 10"/>
            </svg>
            <span className="text-caption-1 text-[var(--system-gray2)]">加载中</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {captures.map((capture, index) => (
          <div
            key={capture.id}
            className="card-elevated overflow-hidden animate-fade-in"
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            {/* Image */}
            {capture.image_url && (
              <img
                src={capture.image_url}
                alt="Capture"
                className="w-full object-cover"
                style={{ maxHeight: 200 }}
              />
            )}

            <div className="p-4">
              {/* Timestamp & task info */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-caption-2 text-[var(--system-gray)] font-medium">
                  {new Date(capture.created_at).toLocaleString()}
                </span>
                {capture.task_name && (
                  <>
                    <span className="text-[var(--system-gray4)]">·</span>
                    <span className="text-caption-2 font-medium" style={{ color: "var(--system-indigo)" }}>
                      {capture.task_name}
                      {capture.step_index !== null ? ` · Step ${capture.step_index + 1}` : ""}
                    </span>
                  </>
                )}
              </div>

              {/* Question */}
              <div className="flex items-start gap-2.5 mb-2">
                <div className="w-5 h-5 rounded-full bg-[var(--system-blue)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--system-blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <circle cx="12" cy="17" r="0.5" fill="var(--system-blue)"/>
                  </svg>
                </div>
                <p className="text-subhead font-medium text-[var(--label)] leading-snug flex-1">
                  {capture.question}
                </p>
              </div>

              {/* Answer */}
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[var(--system-blue)] to-[var(--system-purple)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  </svg>
                </div>
                <p className="text-callout text-[var(--secondary-label)] leading-relaxed flex-1">
                  {capture.answer}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}