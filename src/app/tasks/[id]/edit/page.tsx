"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";
import TaskEditor from "@/components/TaskEditor";

interface Step {
  title: string;
  instruction: string;
  successCriteria: string;
}

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskSteps, setTaskSteps] = useState<Step[]>([]);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (data.session?.access_token) {
        setAccessToken(data.session.access_token);
      }
    };
    getSession();
  }, []);

  useEffect(() => {
    if (!accessToken || !taskId) return;
    fetchTask();
  }, [accessToken, taskId]);

  const fetchTask = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const t = data.task;
        setTaskName(t.name);
        setTaskDescription(t.description || "");
        setTaskSteps(
          (t.task_steps || []).map((s: { title: string; instruction: string; success_criteria: string }) => ({
            title: s.title,
            instruction: s.instruction,
            successCriteria: s.success_criteria,
          }))
        );
      } else {
        alert("Task not found");
        router.push("/tasks");
      }
    } catch (e) {
      console.error("Fetch task error:", e);
      alert("Failed to load task");
      router.push("/tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (taskData: {
    name: string;
    description: string;
    steps: Step[];
  }) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
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
        alert(data.error || "Failed to update task");
      }
    } catch (e) {
      console.error("Update task error:", e);
      alert("Failed to update task. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "#0a0f1a",
          color: "#e2e8f0",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#64748b" }}>Loading task...</div>
      </div>
    );
  }

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
            Edit Task
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            Modify your training workflow.
          </p>
        </div>

        <TaskEditor
          initialName={taskName}
          initialDescription={taskDescription}
          initialSteps={taskSteps}
          onSave={handleSave}
          onCancel={() => router.push("/tasks")}
          saving={saving}
        />
      </div>
    </div>
  );
}