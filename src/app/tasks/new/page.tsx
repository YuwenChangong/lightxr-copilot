"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAnonymousUser } from "@/hooks/useAnonymousUser";
import TaskEditor from "@/components/TaskEditor";

export default function NewTaskPage() {
  const router = useRouter();
  const { accessToken, loading: authLoading } = useAnonymousUser();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (taskData: {
    name: string;
    description: string;
    steps: { title: string; instruction: string; successCriteria: string }[];
  }) => {
    if (!accessToken) {
      setError("Authentication not ready. Please wait and try again.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(taskData),
      });
      if (res.ok) {
        router.push("/tasks");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create task");
      }
    } catch (e) {
      console.error("Create task error:", e);
      setError("Failed to create task. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0a0f1a",
        color: "#e2e8f0",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "20px 16px",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => router.push("/tasks")}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              fontSize: 14,
              cursor: "pointer",
              padding: 0,
              marginBottom: 8,
            }}
          >
            ← Back to Tasks
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
            Create New Task
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            Build your custom training workflow step by step.
          </p>
        </div>

        {error && (
          <div style={{
            background: "#7f1d1d",
            border: "1px solid #dc2626",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 16,
            color: "#fca5a5",
            fontSize: 13,
          }}>
            ❌ {error}
          </div>
        )}

        {authLoading ? (
          <p style={{ color: "#64748b", fontSize: 14 }}>Loading authentication...</p>
        ) : !accessToken ? (
          <div style={{
            background: "#78350f",
            border: "1px solid #d97706",
            borderRadius: 8,
            padding: "12px 16px",
            color: "#fcd34d",
            fontSize: 13,
          }}>
            ⚠️ Authentication failed. Please refresh the page.
          </div>
        ) : (
          <TaskEditor
            onSave={handleSave}
            onCancel={() => router.push("/tasks")}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}