// Voice Command → AgentAction parser (v2: context-aware with aliases)
import { createAction, type AgentAction, type AppId } from "./gaze-types";

// ─── Parse Context ───
export interface ParseContext {
  text: string;
  currentApp?: AppId | null;
  hasDraft?: boolean;
}

// ─── App keyword → open_app mapping (only used on launcher) ───
const APP_KEYWORDS: Record<string, AppId> = {
  chat: "chat",
  message: "chat",
  消息: "chat",
  聊天: "chat",
  video: "video",
  watch: "video",
  视频: "video",
  reader: "reader",
  read: "reader",
  book: "reader",
  阅读: "reader",
  music: "music",
  音乐: "music",
  camera: "camera",
  photo: "camera",
  相机: "camera",
  ask: "ask",
  ai: "ask",
  问ai: "ask",
  setting: "settings",
  config: "settings",
  设置: "settings",
};

// ─── Navigation keywords (always available) ───
const NAV_KEYWORDS = [
  "back",
  "home",
  "return",
  "返回",
  "回去",
  "回到桌面",
  "go back",
  "退出",
];

// ─── COMMAND_ALIASES: many variations → canonical action ───
const ALIASES: Array<{ patterns: string[]; action: string; extractText?: boolean }> = [
  // Reader
  { patterns: ["下一页", "翻页", "往后", "next page", "翻到下一页", "往后翻"], action: "reader_next_page" },
  { patterns: ["上一页", "往前", "previous page", "翻到上一页", "往前翻"], action: "reader_prev_page" },
  { patterns: ["总结", "总结这一页", "summarize", "总结一下", "概括"], action: "reader_summarize" },
  { patterns: ["调大字体", "字体大一点", "bigger font", "larger font", "放大字体", "字号调大"], action: "reader_font_increase" },
  { patterns: ["调小字体", "字体小一点", "smaller font", "缩小字体", "字号调小"], action: "reader_font_decrease" },

  // Chat
  { patterns: ["读最新消息", "read latest", "最新消息", "读一下最新", "最新一条"], action: "chat_read_latest" },
  { patterns: ["确认发送", "发送", "send", "confirm", "确认", "发出去"], action: "chat_send" },
  { patterns: ["取消发送", "取消", "cancel", "不要发了", "算了"], action: "chat_cancel" },

  // Camera
  { patterns: ["拍照", "拍一张", "capture", "take photo", "拍个照", "照相"], action: "camera_capture" },
  { patterns: ["切换摄像头", "切换相机", "switch camera", "flip camera", "翻转相机", "换个摄像头"], action: "camera_switch" },

  // Media (shared between video & music)
  { patterns: ["播放", "play", "继续播放", "继续", "resume"], action: "media_play" },
  { patterns: ["暂停", "pause", "停一下", "暂停播放"], action: "media_pause" },
  { patterns: ["下一集", "next episode", "下一章"], action: "media_next" },
  { patterns: ["下一首", "next song", "next track", "换一首", "切歌"], action: "media_next" },
  { patterns: ["上一首", "previous song", "上一集", "previous"], action: "media_prev" },

  // Ask AI
  { patterns: ["分析", "分析当前画面", "analyze", "看看这个", "分析一下"], action: "ask_analyze" },
];

// ─── Regex patterns for parameterized commands ───
const PARAM_PATTERNS: Array<{ regex: RegExp; action: string; groupIndex: number }> = [
  // Chat reply
  { regex: /(?:reply|帮我回复|回复|他说|回他)[\s:：]*(.+)/i, action: "chat_reply", groupIndex: 1 },
  // Ask query
  { regex: /(?:ask|提问|请问|问题|问一下|帮我问)[\s:：]*(.+)/i, action: "ask_query", groupIndex: 1 },
  // TTS speak
  { regex: /(?:说|speak|朗读|read out|念)[\s:：]*(.+)/i, action: "tts_speak", groupIndex: 1 },
];

// ─── App-specific action prefixes ───
const APP_ACTION_PREFIXES: Record<string, string[]> = {
  reader: ["reader_"],
  chat: ["chat_"],
  video: ["media_"],
  music: ["media_"],
  camera: ["camera_"],
  ask: ["ask_"],
};

// ─── Match an alias to an action type ───
function matchAlias(lower: string, filterPrefixes?: string[]): string | null {
  for (const entry of ALIASES) {
    // If filtering by app, skip aliases whose action doesn't match the app's prefixes
    if (filterPrefixes && !filterPrefixes.some((p) => entry.action.startsWith(p))) continue;
    if (entry.patterns.some((p) => lower.includes(p) || lower === p)) {
      return entry.action;
    }
  }
  return null;
}

// ─── Match parameterized patterns ───
function matchParam(lower: string, filterPrefixes?: string[]): { action: string; text: string } | null {
  for (const entry of PARAM_PATTERNS) {
    if (filterPrefixes && !filterPrefixes.some((p) => entry.action.startsWith(p))) continue;
    const m = lower.match(entry.regex);
    if (m && m[entry.groupIndex]) {
      return { action: entry.action, text: m[entry.groupIndex].trim() };
    }
  }
  return null;
}

// ─── Main parser (v2) ───
export function parseCommand(ctx: ParseContext): AgentAction {
  const { text, currentApp, hasDraft } = ctx;
  const lower = text.toLowerCase().trim();

  // 1. Navigation — always available
  if (NAV_KEYWORDS.some((k) => lower.includes(k))) {
    return createAction("close_app", undefined, "voice");
  }

  // 2. Stop TTS — always available
  if (lower.includes("stop") || lower.includes("闭嘴") || lower.includes("停")) {
    return createAction("tts_stop", undefined, "voice");
  }

  // 3. If inside an app, try app-specific commands FIRST
  if (currentApp) {
    const prefixes = APP_ACTION_PREFIXES[currentApp];

    // 3a. Alias match
    const aliasAction = matchAlias(lower, prefixes);
    if (aliasAction) {
      return createAction(aliasAction as any, undefined, "voice");
    }

    // 3b. Parameterized match
    const paramResult = matchParam(lower, prefixes);
    if (paramResult) {
      return createAction(paramResult.action as any, { text: paramResult.text }, "voice");
    }

    // 3c. Chat: if hasDraft and user says affirmative → send
    if (currentApp === "chat" && hasDraft) {
      if (/^(好|ok|yes|yeah|对|嗯|行|发吧|发)$/.test(lower)) {
        return createAction("chat_send", undefined, "voice");
      }
    }

    // 3d. Ask AI: question words while in ask app → treat as query
    if (currentApp === "ask") {
      if (/^(什么|怎么|为什么|哪里|谁|哪个|how|what|why|where|who|which)/.test(lower)) {
        return createAction("ask_query", { text: lower }, "voice");
      }
    }
  }

  // 4. Global: try parameterized patterns (reply, ask, speak) regardless of app
  const globalParam = matchParam(lower);
  if (globalParam) {
    return createAction(globalParam.action as any, { text: globalParam.text }, "voice");
  }

  // 5. Open app — only when not inside an app, or explicitly saying "open/打开"
  if (!currentApp || lower.includes("open") || lower.includes("打开")) {
    for (const [keyword, appId] of Object.entries(APP_KEYWORDS)) {
      if (lower.includes(keyword)) {
        return createAction("open_app", { appId }, "voice");
      }
    }
  }

  // 6. If not inside an app, try ALL aliases as fallback
  if (!currentApp) {
    const aliasAction = matchAlias(lower);
    if (aliasAction) {
      return createAction(aliasAction as any, undefined, "voice");
    }
  }

  // 7. Fallback: question words → ask_query
  if (/^(what|how|why|when|where|who|which|什么|怎么|为什么|哪里|谁)/.test(lower)) {
    return createAction("ask_query", { text: lower }, "voice");
  }

  return createAction("unknown", { text }, "voice");
}

// ─── Backward-compatible wrapper ───
export function parseVoiceCommand(text: string): AgentAction {
  return parseCommand({ text });
}

// ─── Voice hint strings per app ───
export const VOICE_HINTS: Record<string, string[]> = {
  reader: [
    "下一页 · 上一页",
    "总结 · 调大字体 · 调小字体",
    "返回",
  ],
  chat: [
    "读最新消息 · 确认发送 · 取消",
    "回复他说xxx",
    "返回",
  ],
  video: [
    "播放 · 暂停 · 下一集",
    "返回",
  ],
  music: [
    "播放 · 暂停 · 下一首 · 上一首",
    "返回",
  ],
  camera: [
    "拍照 · 切换摄像头",
    "返回",
  ],
  ask: [
    "问xxx · 分析当前画面",
    "返回",
  ],
  _launcher: [
    "打开阅读 · 打开音乐 · 打开相机",
    "打开聊天 · 打开视频 · 打开AI",
  ],
};