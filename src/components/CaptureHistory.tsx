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

  return (
    <section className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-[#8e8e93] uppercase tracking-wide">Recent Captures</h2>
        {loading && <span className="text-xs text-[#aeaeb2]">Loading...</span>}
      </div>

      <div className="space-y-2.5">
        {captures.map((capture) => (
          <div
            key={capture.id}
            className="bg-white rounded-2xl p-3.5"
            style={{ boxShadow: "0 0 0 1px var(--separator), 0 1px 3px rgba(0,0,0,0.04)" }}
          >
            {capture.image_url && (
              <img
                src={capture.image_url}
                alt="Capture"
                className="mb-2.5 w-full rounded-xl object-cover"
                style={{ maxHeight: 200 }}
              />
            )}

            <p className="text-[11px] text-[#aeaeb2] font-medium">
              {new Date(capture.created_at).toLocaleString()}
            </p>

            {capture.task_name && (
              <p className="mt-1 text-xs text-[#5856d6] font-medium">
                {capture.task_name}
                {capture.step_index !== null ? ` · Step ${capture.step_index + 1}` : ""}
                {capture.step_title ? ` · ${capture.step_title}` : ""}
              </p>
            )}

            <p className="mt-2 text-[15px] font-semibold text-[#1c1c1e] leading-snug">Q: {capture.question}</p>
            <p className="mt-1 text-sm text-[#636366] leading-relaxed">A: {capture.answer}</p>
          </div>
        ))}

        {!loading && captures.length === 0 && (
          <p className="text-xs text-[#aeaeb2] text-center py-4">No captures yet.</p>
        )}
      </div>
    </section>
  );
}
