"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase-client";

interface TaskStep {
  id: string;
  step_order: number;
  title: string;
  instruction: string;
  success_criteria: string;
}

interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  task_steps: TaskStep[];
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string>("");

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
    if (!accessToken) return;
    fetchTasks();
  }, [accessToken]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error("Failed to fetch tasks:", e);
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setTasks(tasks.filter((t) => t.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete task:", e);
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/"
              style={{
                color: "#64748b",
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              ← Back
            </Link>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
              Task Builder
            </h1>
          </div>
          <Link
            href="/tasks/new"
            style={{
              background: "#3b82f6",
              border: "none",
              borderRadius: 10,
              padding: "8px 16px",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            + Create Task
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading tasks...</div>
        )}

        {/* Empty state */}
        {!loading && tasks.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "#111827",
              borderRadius: 16,
              border: "1px solid #1e293b",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
            <p style={{ fontSize: 16, color: "#e2e8f0", fontWeight: 600, marginBottom: 8 }}>
              No tasks yet
            </p>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>
              Create your first training workflow to get started.
            </p>
            <Link
              href="/tasks/new"
              style={{
                display: "inline-block",
                background: "#3b82f6",
                border: "none",
                borderRadius: 10,
                padding: "10px 24px",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              + Create Your First Task
            </Link>
          </div>
        )}

        {/* Task list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                background: "#111827",
                border: "1px solid #1e293b",
                borderRadius: 14,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#f1f5f9",
                      margin: 0,
                      marginBottom: 4,
                    }}
                  >
                    {task.name}
                  </h3>
                  {task.description && (
                    <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{task.description}</p>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: "#3b82f6",
                    background: "#172554",
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {task.task_steps.length} steps
                </span>
              </div>

              {/* Steps preview */}
              <div style={{ marginBottom: 12 }}>
                {task.task_steps.slice(0, 3).map((step, i) => (
                  <div
                    key={step.id}
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      padding: "2px 0",
                    }}
                  >
                    {i + 1}. {step.title}
                  </div>
                ))}
                {task.task_steps.length > 3 && (
                  <div style={{ fontSize: 11, color: "#64748b", padding: "2px 0" }}>
                    ... +{task.task_steps.length - 3} more steps
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8 }}>
                <Link
                  href={`/tasks/${task.id}/edit`}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: "8px",
                    color: "#94a3b8",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Edit
                </Link>
                <button
                  onClick={() => deleteTask(task.id)}
                  style={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "#ef4444",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}