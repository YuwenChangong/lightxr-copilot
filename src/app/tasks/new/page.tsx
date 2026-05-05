"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";
import TaskEditor from "@/components/TaskEditor";

export default function NewTaskPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (data.session?.access_token) {
        setAccessToken(data.session.access_token);
      }
    };
    getSession();
  }, []);

  const handleSave = async (taskData: {
    name: string;
    description: string;
    steps: { title: string; instruction: string; successCriteria: string }[];
  }) => {
    setSaving(true);
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
        alert(data.error || "Failed to create task");
      }
    } catch (e) {
      console.error("Create task error:", e);
      alert("Failed to create task. Please try again.");
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

        <TaskEditor
          onSave={handleSave}
          onCancel={() => router.push("/tasks")}
          saving={saving}
        />
      </div>
    </div>
  );
}