"use client";

import { useState, useEffect } from "react";
import { taskTemplates, type TaskTemplate } from "@/lib/task-templates";

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

  // Merge: default templates first, then custom tasks
  const allTasks: TaskTemplate[] = [...taskTemplates, ...customTasks];

  const currentStep = currentTask?.steps[currentStepIndex];

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
      {/* Task selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-zinc-500 shrink-0">Task:</span>
            <select
            value={currentTask?.id || ""}
            onChange={(e) => {
              const task = allTasks.find((t) => t.id === e.target.value);
              onTaskChange(task || null);
              onStepChange(0);
            }}
            className="flex-1 min-w-0 bg-zinc-800 text-white text-sm px-2 py-1 rounded border border-zinc-700 focus:outline-none focus:border-blue-500"
          >
            <option value="">-- Free Ask --</option>
            {taskTemplates.length > 0 && (
              <optgroup label="Default Tasks">
                {taskTemplates.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </optgroup>
            )}
            {customTasks.length > 0 && (
              <optgroup label="My Custom Tasks">
                {customTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </optgroup>
            )}
            {taskTemplates.length === 0 && customTasks.length === 0 && taskTemplates.map((task) => (
              <option key={task.id} value={task.id}>
                {task.name}
              </option>
            ))}
          </select>
        </div>
        {currentTask && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {expanded ? "Hide" : "Details"}
          </button>
        )}
      </div>

      {/* Step display */}
      {currentTask && currentStep && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
              disabled={currentStepIndex === 0}
              className="px-2 py-1 text-xs bg-zinc-800 text-zinc-300 rounded border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>

            <span className="text-xs text-purple-400 font-medium">
              Step {currentStepIndex + 1} / {currentTask.steps.length}
            </span>

            <button
              onClick={() =>
                onStepChange(
                  Math.min(currentTask.steps.length - 1, currentStepIndex + 1)
                )
              }
              disabled={currentStepIndex === currentTask.steps.length - 1}
              className="px-2 py-1 text-xs bg-zinc-800 text-zinc-300 rounded border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>

          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-sm font-medium text-white">
              {currentStep.title}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              {currentStep.instruction}
            </p>

            {expanded && (
              <p className="text-xs text-zinc-500 mt-2 border-t border-zinc-700 pt-2">
                <span className="text-zinc-400">Success criteria: </span>
                {currentStep.successCriteria}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}