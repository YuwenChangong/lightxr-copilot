// Action Executor — dispatches AgentActions to registered handlers
// The GlassDesktop component registers handlers; this module routes actions to them.
import type { AgentAction } from "./gaze-types";
import { logAction, formatActionLabel, updateLogResult } from "./agent-actions";
import type { ActionLogEntry } from "./agent-actions";

export type ActionHandler = (action: AgentAction) => void;

// Global handler registry
let _handlers: Map<string, ActionHandler> = new Map();
let _dispatchFeedback: ((label: string) => void) | null = null;
let _lastLogEntry: ActionLogEntry | null = null;

export function setDispatchFeedback(fn: (label: string) => void) {
  _dispatchFeedback = fn;
}

export function registerHandler(key: string, handler: ActionHandler): () => void {
  _handlers.set(key, handler);
  return () => {
    _handlers.delete(key);
  };
}

// Safe actions that can be auto-executed by dwell/hover
const SAFE_AUTO_ACTIONS = new Set([
  "open_app",
  "close_app",
  "reader_next_page",
  "reader_prev_page",
  "reader_font_increase",
  "reader_font_decrease",
  "reader_summarize",
  "media_play",
  "media_pause",
  "media_next",
  "media_prev",
  "tts_speak",
  "tts_stop",
]);

// Dangerous actions that require explicit confirmation (voice "send", Enter, click)
const DANGEROUS_ACTIONS = new Set([
  "chat_send",       // sends a message
  "camera_capture",  // takes a photo
  "ask_query",       // uploads to AI
  "ask_analyze",     // captures + uploads
]);

// Source tracking: 'voice' = voice command, 'click' = user click, 'gaze' = dwell/auto
export function executeAction(action: AgentAction, source: "voice" | "click" | "gaze" = "voice"): void {
  const label = formatActionLabel(action);
  const rawCommand = action.payload?.text as string | undefined;

  // Block dangerous actions from auto-gaze execution
  if (source === "gaze" && DANGEROUS_ACTIONS.has(action.type)) {
    const entry = logAction(action, label + " [BLOCKED: needs confirmation]", rawCommand);
    updateEntry(entry.id, "blocked", "Dangerous action requires explicit confirmation");
    if (_dispatchFeedback) {
      _dispatchFeedback(`⚠ ${label} — needs voice/click confirmation`);
    }
    speak(`Action needs confirmation. Say the command or press enter.`);
    return;
  }

  // Log the action
  const entry = logAction(action, label, rawCommand);
  _lastLogEntry = entry;

  // Show feedback toast
  if (_dispatchFeedback) {
    _dispatchFeedback(label);
  }

  // Dispatch to registered handlers
  const globalHandler = _handlers.get("global");
  if (globalHandler) {
    try {
      globalHandler(action);
    } catch (e) {
      updateEntry(entry.id, "failed", String(e));
      return;
    }
  }

  // App-specific handlers
  let handlerKey: string | null = null;
  if (action.type.startsWith("reader_")) handlerKey = "reader";
  else if (action.type.startsWith("chat_")) handlerKey = "chat";
  else if (action.type.startsWith("media_")) {
    // Both video and music handle media; active one responds
    const videoH = _handlers.get("video");
    const musicH = _handlers.get("music");
    if (videoH) { try { videoH(action); } catch (e) { updateEntry(entry.id, "failed", String(e)); return; } }
    if (musicH) { try { musicH(action); } catch (e) { updateEntry(entry.id, "failed", String(e)); return; } }
    updateEntry(entry.id, "ok");
    return;
  }
  else if (action.type.startsWith("camera_")) handlerKey = "camera";
  else if (action.type.startsWith("ask_")) handlerKey = "ask";
  else if (action.type === "tts_speak" || action.type === "tts_stop") handlerKey = "tts";

  if (handlerKey) {
    const h = _handlers.get(handlerKey);
    if (h) {
      try {
        h(action);
        updateEntry(entry.id, "ok");
      } catch (e) {
        const errMsg = String(e);
        updateEntry(entry.id, "failed", errMsg);
        if (_dispatchFeedback) _dispatchFeedback(`❌ ${label} failed: ${errMsg}`);
        speak(`Action failed.`);
      }
    } else {
      updateEntry(entry.id, "failed", `No handler for ${handlerKey}`);
      if (_dispatchFeedback) _dispatchFeedback(`⚠ No handler for ${handlerKey}`);
    }
  } else {
    // Unknown action type — still mark ok
    updateEntry(entry.id, "ok");
  }
}

function updateEntry(id: string, result: "ok" | "failed" | "blocked", error?: string) {
  updateLogResult(id, result, error);
}

// TTS utility — optimized with zh-CN voice preference
let _utterance: SpeechSynthesisUtterance | null = null;
let _zhVoice: SpeechSynthesisVoice | null = null;
let _voicesLoaded = false;

function loadVoices(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  if (_voicesLoaded) return;
  _voicesLoaded = true;

  const pickVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;
    // Prefer zh-CN voices
    _zhVoice =
      voices.find((v) => v.lang === "zh-CN" && v.localService) ??
      voices.find((v) => v.lang === "zh-CN") ??
      voices.find((v) => v.lang.startsWith("zh")) ??
      null;
  };
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}
loadVoices();

export function speak(text: string, lang = "zh-CN"): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  stop();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  // Use zh-CN voice if available and requesting Chinese
  if (lang.startsWith("zh") && _zhVoice) {
    u.voice = _zhVoice;
  }
  // Slightly slower rate + lower pitch for clarity (especially on AR glasses)
  u.rate = 0.95;
  u.pitch = 1.05;
  u.volume = 1.0;
  window.speechSynthesis.speak(u);
  _utterance = u;
}

export function stop(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  _utterance = null;
}