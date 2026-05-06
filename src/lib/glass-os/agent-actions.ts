// Agent Action Log — tracks action history for feedback display
import type { AgentAction } from "./gaze-types";

export type ActionResult = "pending" | "ok" | "failed" | "blocked";

export interface ActionLogEntry {
  id: string;
  action: AgentAction;
  label: string;
  timestamp: number;
  rawCommand?: string;
  targetApp?: string;
  result: ActionResult;
  error?: string;
}

let _log: ActionLogEntry[] = [];
let _listeners: Array<(log: ActionLogEntry[]) => void> = [];
let _counter = 0;

function notify() {
  for (const fn of _listeners) fn([..._log]);
}

export function logAction(
  action: AgentAction,
  label: string,
  rawCommand?: string
): ActionLogEntry {
  const entry: ActionLogEntry = {
    id: `action-${++_counter}`,
    action,
    label,
    timestamp: Date.now(),
    rawCommand,
    targetApp: resolveTargetApp(action),
    result: "pending",
  };
  _log = [entry, ..._log].slice(0, 30); // keep last 30
  notify();
  return entry;
}

export function updateLogResult(
  entryId: string,
  result: ActionResult,
  error?: string
): void {
  const idx = _log.findIndex((e) => e.id === entryId);
  if (idx >= 0) {
    _log[idx] = { ..._log[idx], result, error };
    notify();
  }
}

function resolveTargetApp(action: AgentAction): string {
  const t = action.type;
  if (t.startsWith("reader_")) return "reader";
  if (t.startsWith("chat_")) return "chat";
  if (t.startsWith("media_")) return "media";
  if (t.startsWith("camera_")) return "camera";
  if (t.startsWith("ask_")) return "ask";
  if (t.startsWith("tts_")) return "tts";
  if (t === "open_app" || t === "close_app") return "system";
  return "unknown";
}

export function getActionLog(): ActionLogEntry[] {
  return [..._log];
}

export function clearActionLog(): void {
  _log = [];
  notify();
}

export function subscribeActionLog(
  fn: (log: ActionLogEntry[]) => void
): () => void {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((l) => l !== fn);
  };
}

// Format action into human-readable label
export function formatActionLabel(action: AgentAction): string {
  switch (action.type) {
    case "open_app":
      return `Opening ${action.payload?.appId ?? "app"}...`;
    case "close_app":
      return "Returning to Home...";
    case "reader_next_page":
      return "Next page";
    case "reader_prev_page":
      return "Previous page";
    case "reader_summarize":
      return "Summarizing page...";
    case "reader_font_increase":
      return "Font size increased";
    case "reader_font_decrease":
      return "Font size decreased";
    case "chat_read_latest":
      return "Reading latest message...";
    case "chat_reply":
      return `Drafting reply: "${action.payload?.text ?? ""}"`;
    case "chat_send":
      return "Message sent ✓";
    case "chat_cancel":
      return "Reply cancelled";
    case "media_play":
      return "Playing ▶";
    case "media_pause":
      return "Paused ⏸";
    case "media_next":
      return "Next track";
    case "media_prev":
      return "Previous track";
    case "camera_capture":
      return "Photo captured 📸";
    case "camera_switch":
      return "Switching camera...";
    case "ask_query":
      return `Asking: "${action.payload?.text ?? ""}"`;
    case "ask_analyze":
      return "Analyzing current view...";
    case "tts_speak":
      return "Speaking...";
    case "tts_stop":
      return "Stopped speaking";
    case "unknown":
      return `Unknown: "${action.payload?.text ?? ""}"`;
    default:
      return action.type;
  }
}