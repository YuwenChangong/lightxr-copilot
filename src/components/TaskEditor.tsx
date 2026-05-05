"use client";

import { useState } from "react";

interface Step {
  title: string;
  instruction: string;
  successCriteria: string;
}

interface TaskEditorProps {
  initialName?: string;
  initialDescription?: string;
  initialSteps?: Step[];
  onSave: (data: { name: string; description: string; steps: Step[] }) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

const emptyStep: Step = { title: "", instruction: "", successCriteria: "" };

export default function TaskEditor({
  initialName = "",
  initialDescription = "",
  initialSteps = [],
  onSave,
  onCancel,
  saving = false,
}: TaskEditorProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [steps, setSteps] = useState<Step[]>(
    initialSteps.length > 0 ? initialSteps : [{ ...emptyStep }]
  );
  const [error, setError] = useState("");

  const addStep = () => setSteps([...steps, { ...emptyStep }]);

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof Step, value: string) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const updated = [...steps];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setSteps(updated);
  };

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) {
      setError("Please enter a task name.");
      return;
    }
    const validSteps = steps.filter((s) => s.title.trim() && s.instruction.trim());
    if (validSteps.length === 0) {
      setError("Please add at least one step with a title and instruction.");
      return;
    }
    // Fill successCriteria with default if empty
    const finalSteps = validSteps.map((s) => ({
      ...s,
      successCriteria: s.successCriteria.trim() || "The step objective has been visually confirmed.",
    }));
    await onSave({ name: name.trim(), description: description.trim(), steps: finalSteps });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && (
        <div
          style={{
            background: "#7f1d1d",
            border: "1px solid #991b1b",
            borderRadius: 12,
            padding: "10px 16px",
            color: "#fca5a5",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Task Name */}
      <div>
        <label style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4, display: "block" }}>
          Task Name *
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Chemistry Lab Safety Check"
          style={{
            width: "100%",
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: 12,
            padding: "10px 14px",
            color: "#e2e8f0",
            fontSize: 14,
            outline: "none",
          }}
        />
      </div>

      {/* Description */}
      <div>
        <label style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4, display: "block" }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this training workflow..."
          rows={2}
          style={{
            width: "100%",
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: 12,
            padding: "10px 14px",
            color: "#e2e8f0",
            fontSize: 13,
            outline: "none",
            resize: "vertical",
          }}
        />
      </div>

      {/* Steps */}
      <div>
        <label style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8, display: "block" }}>
          Steps ({steps.length})
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {steps.map((step, i) => (
            <div
              key={i}
              style={{
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 12,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                  Step {i + 1}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => moveStep(i, -1)}
                    disabled={i === 0}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: i === 0 ? "#334155" : "#64748b",
                      cursor: i === 0 ? "default" : "pointer",
                      fontSize: 14,
                      padding: "2px 6px",
                    }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveStep(i, 1)}
                    disabled={i === steps.length - 1}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: i === steps.length - 1 ? "#334155" : "#64748b",
                      cursor: i === steps.length - 1 ? "default" : "pointer",
                      fontSize: 14,
                      padding: "2px 6px",
                    }}
                  >
                    ↓
                  </button>
                  {steps.length > 1 && (
                    <button
                      onClick={() => removeStep(i)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: 14,
                        padding: "2px 6px",
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <input
                value={step.title}
                onChange={(e) => updateStep(i, "title", e.target.value)}
                placeholder="Step title (e.g. Check protective equipment)"
                style={{
                  width: "100%",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: "8px 10px",
                  color: "#e2e8f0",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <textarea
                value={step.instruction}
                onChange={(e) => updateStep(i, "instruction", e.target.value)}
                placeholder="Instruction: what should the user do or look for?"
                rows={2}
                style={{
                  width: "100%",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: "8px 10px",
                  color: "#e2e8f0",
                  fontSize: 12,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
              <input
                value={step.successCriteria}
                onChange={(e) => updateStep(i, "successCriteria", e.target.value)}
                placeholder="Success criteria (optional — AI default if empty)"
                style={{
                  width: "100%",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: "8px 10px",
                  color: "#94a3b8",
                  fontSize: 12,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ))}
        </div>
        <button
          onClick={addStep}
          style={{
            marginTop: 8,
            background: "transparent",
            border: "1px dashed #334155",
            borderRadius: 12,
            padding: "10px",
            color: "#3b82f6",
            fontSize: 13,
            cursor: "pointer",
            width: "100%",
          }}
        >
          + Add Step
        </button>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 12,
            padding: "12px",
            color: "#94a3b8",
            fontSize: 14,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            flex: 2,
            background: saving ? "#1e293b" : "#3b82f6",
            border: "none",
            borderRadius: 12,
            padding: "12px",
            color: saving ? "#64748b" : "#ffffff",
            fontSize: 14,
            cursor: saving ? "default" : "pointer",
            fontWeight: 600,
          }}
        >
          {saving ? "Saving..." : "Save Task"}
        </button>
      </div>
    </div>
  );
}