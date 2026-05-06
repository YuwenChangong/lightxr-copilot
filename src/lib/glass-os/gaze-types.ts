// Gaze OS Core Types

export type AppId = "chat" | "video" | "reader" | "music" | "camera" | "ask" | "settings";

export interface AppMeta {
  id: AppId;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export const APP_REGISTRY: AppMeta[] = [
  { id: "chat", name: "Chat", icon: "💬", color: "#3b82f6", description: "Messages & conversations" },
  { id: "video", name: "Video", icon: "🎬", color: "#ef4444", description: "Watch & record" },
  { id: "reader", name: "Reader", icon: "📖", color: "#22c55e", description: "Documents & articles" },
  { id: "music", name: "Music", icon: "🎵", color: "#a855f7", description: "Play & discover" },
  { id: "camera", name: "Camera", icon: "📷", color: "#f59e0b", description: "Capture moments" },
  { id: "ask", name: "Ask AI", icon: "🧠", color: "#06b6d4", description: "Ask anything" },
  { id: "settings", name: "Settings", icon: "⚙️", color: "#64748b", description: "Preferences" },
];

export type OSView = "launcher" | "app";

export interface LauncherState {
  view: OSView;
  focusedIndex: number;
  activeApp: AppId | null;
}

// ─── Action System ───

export type ActionType =
  | "open_app"
  | "close_app"
  | "navigate"
  | "reader_next_page"
  | "reader_prev_page"
  | "reader_summarize"
  | "reader_font_increase"
  | "reader_font_decrease"
  | "chat_read_latest"
  | "chat_reply"
  | "chat_send"
  | "chat_cancel"
  | "media_play"
  | "media_pause"
  | "media_next"
  | "media_prev"
  | "camera_capture"
  | "camera_switch"
  | "ask_query"
  | "ask_analyze"
  | "tts_speak"
  | "tts_stop"
  | "unknown";

export interface AgentAction {
  type: ActionType;
  payload?: Record<string, unknown>;
  source: "voice" | "gaze" | "system";
  timestamp: number;
}

export function createAction(
  type: ActionType,
  payload?: Record<string, unknown>,
  source: AgentAction["source"] = "system"
): AgentAction {
  return { type, payload, source, timestamp: Date.now() };
}