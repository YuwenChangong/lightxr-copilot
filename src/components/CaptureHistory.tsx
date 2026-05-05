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
        <h2 className="text-sm font-semibold text-zinc-400">Recent Captures</h2>
        {loading && <span className="text-xs text-zinc-600">Loading...</span>}
      </div>

      <div className="space-y-3">
        {captures.map((capture) => (
          <div
            key={capture.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-3"
          >
            {capture.image_url && (
              <img
                src={capture.image_url}
                alt="Capture"
                className="mb-2 w-full rounded-lg object-cover"
              />
            )}

            <p className="text-xs text-zinc-600">
              {new Date(capture.created_at).toLocaleString()}
            </p>

            {capture.task_name && (
              <p className="mt-1 text-xs text-purple-400">
                {capture.task_name}
                {capture.step_index !== null ? ` · Step ${capture.step_index + 1}` : ""}
                {capture.step_title ? ` · ${capture.step_title}` : ""}
              </p>
            )}

            <p className="mt-2 text-sm font-medium text-zinc-300">Q: {capture.question}</p>
            <p className="mt-1 text-sm text-zinc-400">A: {capture.answer}</p>
          </div>
        ))}

        {!loading && captures.length === 0 && (
          <p className="text-xs text-zinc-600">No captures yet.</p>
        )}
      </div>
    </section>
  );
}
