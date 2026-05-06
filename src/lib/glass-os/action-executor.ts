// Action Executor — dispatches AgentActions to registered handlers
// The GlassDesktop component registers handlers; this module routes actions to them.
import type { AgentAction, AppId } from "./gaze-types";
import { logAction, formatActionLabel } from "./agent-actions";

export type ActionHandler = (action: AgentAction) => void;

// Global handler registry
let _handlers: Map<string, ActionHandler> = new Map();
let _dispatchFeedback: ((label: string) => void) | null = null;

export function setDispatchFeedback(fn: (label: string) => void) {
  _dispatchFeedback = fn;
}

export function registerHandler(key: string, handler: ActionHandler): () => void {
  _handlers.set(key, handler);
  return () => {
    _handlers.delete(key);
  };
}

export function executeAction(action: AgentAction): void {
  // Log the action
  const label = formatActionLabel(action);
  logAction(action, label);

  // Show feedback toast
  if (_dispatchFeedback) {
    _dispatchFeedback(label);
  }

  // Dispatch to registered handlers
  // "global" handler runs for all actions
  const globalHandler = _handlers.get("global");
  if (globalHandler) globalHandler(action);

  // App-specific handlers
  if (action.type.startsWith("reader_")) {
    const h = _handlers.get("reader");
    if (h) h(action);
  } else if (action.type.startsWith("chat_")) {
    const h = _handlers.get("chat");
    if (h) h(action);
  } else if (action.type.startsWith("media_")) {
    // Determine video or music based on current context
    const videoH = _handlers.get("video");
    const musicH = _handlers.get("music");
    // Both handle media actions; the active one will respond
    if (videoH) videoH(action);
    if (musicH) musicH(action);
  } else if (action.type === "tts_speak" || action.type === "tts_stop") {
    const h = _handlers.get("tts");
    if (h) h(action);
  }
}

// TTS utility
let _utterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, lang = "en-US"): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  stop();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 1.0;
  window.speechSynthesis.speak(u);
  _utterance = u;
}

export function stop(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  _utterance = null;
}