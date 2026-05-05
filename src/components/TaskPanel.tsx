"use client";

import { useState, useEffect } from "react";
import { type TaskTemplate } from "@/lib/task-templates";

interface TaskPanelProps {
  currentTask: TaskTemplate | null;
  currentStepIndex: number;
  onTaskChange: (task: TaskTemplate | null) => void;
  onStepChange: (index: number) => void;
  accessToken?: string;
}

/** Convert a DB task (snake_case) to local TaskTemplate (camelCase) */
function dbTaskToTemplate(dbTask: {
  id: string;
  name: string;
  description: string | null;
  task_steps: {
    id: string;
    step_order: number;
    title: string;
    instruction: string;
    success_criteria: string;
  }[];
}): TaskTemplate {
  return {
    id: dbTask.id,
    name: dbTask.name,
    description: dbTask.description || "",
    steps: (dbTask.task_steps || [])
      .sort((a, b) => a.step_order - b.step_order)
      .map((s, i) => ({
        id: i + 1,
        title: s.title,
        instruction: s.instruction,
        successCriteria: s.success_criteria,
      })),
  };
}

export default function TaskPanel({
  currentTask,
  currentStepIndex,
  onTaskChange,
  onStepChange,
  accessToken,
}: TaskPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [customTasks, setCustomTasks] = useState<TaskTemplate[]>([]);

  // Load custom tasks from API
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/tasks", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          const converted = (data.tasks || []).map(dbTaskToTemplate);
          setCustomTasks(converted);
        }
      } catch (e) {
        console.error("Failed to load custom tasks:", e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [accessToken]);

  // Only custom tasks (no default templates)
  const allTasks: TaskTemplate[] = [...customTasks];

  const [duplicating, setDuplicating] = useState(false);

  const handleDuplicate = async () => {
    if (!accessToken || !currentTask) return;
    try {
      setDuplicating(true);
      const payload = {
        name: `${currentTask.name} (Custom)`,
        description: currentTask.description || null,
        steps: currentTask.steps.map((s, idx) => ({
          title: s.title,
          instruction: s.instruction,
          successCriteria: s.successCriteria,
        })),
      };
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        const converted = dbTaskToTemplate(data.task);
        setCustomTasks((prev) => [converted, ...prev]);
        onTaskChange(converted);
        onStepChange(0);
      }
    } catch (e) {
      console.error("Duplicate task failed:", e);
    } finally {
      setDuplicating(false);
    }
  };

  const currentStep = currentTask?.steps[currentStepIndex];

  return (
    <div className="bg-white rounded-2xl mx-3 mt-3 px-4 py-3" style={{ boxShadow: "0 0 0 1px var(--separator), 0 1px 3px rgba(0,0,0,0.04)" }}>
      {/* Task selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-[#8e8e93] shrink-0 font-medium">Task</span>
          <select
            value={currentTask?.id || ""}
            onChange={(e) => {
              const task = allTasks.find((t) => t.id === e.target.value);
              onTaskChange(task || null);
              onStepChange(0);
            }}
            className="flex-1 min-w-0 bg-[#f2f2f7] text-[#1c1c1e] text-sm px-2.5 py-1.5 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-[#007aff]/30"
          >
            <option value="">-- Free Ask --</option>
            {customTasks.length > 0 && (
              <optgroup label="Task Builder">
                {customTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        {currentTask && (
          <div className="ml-2 flex items-center gap-2">
            <button
              onClick={handleDuplicate}
              disabled={!accessToken || duplicating}
              className="text-[11px] text-[#007aff] active:text-[#0066d6] font-medium disabled:opacity-40 transition-colors"
            >
              {duplicating ? "Copying..." : "Copy"}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[11px] text-[#8e8e93] active:text-[#636366] font-medium transition-colors"
            >
              {expanded ? "Hide" : "Details"}
            </button>
          </div>
        )}
      </div>

      {/* Step display */}
      {currentTask && currentStep && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
              disabled={currentStepIndex === 0}
              className="px-3 py-1.5 text-xs bg-[#f2f2f7] text-[#007aff] font-medium rounded-lg active:bg-[#e5e5ea] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>

            <span className="text-xs text-[#8e8e93] font-semibold">
              {currentStepIndex + 1} / {currentTask.steps.length}
            </span>

            <button
              onClick={() =>
                onStepChange(
                  Math.min(currentTask.steps.length - 1, currentStepIndex + 1)
                )
              }
              disabled={currentStepIndex === currentTask.steps.length - 1}
              className="px-3 py-1.5 text-xs bg-[#f2f2f7] text-[#007aff] font-medium rounded-lg active:bg-[#e5e5ea] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>

          <div className="bg-[#f2f2f7] rounded-xl p-3">
            <p className="text-[15px] font-semibold text-[#1c1c1e]">
              {currentStep.title}
            </p>
            <p className="text-xs text-[#636366] mt-1 leading-relaxed">
              {currentStep.instruction}
            </p>

            {expanded && (
              <p className="text-xs text-[#8e8e93] mt-2 border-t border-[var(--separator)] pt-2 leading-relaxed">
                <span className="text-[#636366] font-medium">Success criteria: </span>
                {currentStep.successCriteria}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}