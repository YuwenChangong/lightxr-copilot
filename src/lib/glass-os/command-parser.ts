// Voice Command → AgentAction parser
import { createAction, type AgentAction, type AppId } from "./gaze-types";

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
  play: "music",
  音乐: "music",
  camera: "camera",
  photo: "camera",
  拍照: "camera",
  相机: "camera",
  ask: "ask",
  ai: "ask",
  问: "ask",
  setting: "settings",
  config: "settings",
  设置: "settings",
};

const NAV_KEYWORDS = [
  "back",
  "home",
  "return",
  "返回",
  "回去",
  "回到桌面",
  "go back",
];

export function parseVoiceCommand(text: string): AgentAction {
  const lower = text.toLowerCase().trim();

  // Navigation commands
  if (NAV_KEYWORDS.some((k) => lower.includes(k))) {
    return createAction("close_app", undefined, "voice");
  }

  // App open commands: "打开X", "open X"
  for (const [keyword, appId] of Object.entries(APP_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return createAction("open_app", { appId }, "voice");
    }
  }

  // Reader commands
  if (lower.includes("next page") || lower.includes("下一页")) {
    return createAction("reader_next_page", undefined, "voice");
  }
  if (lower.includes("previous page") || lower.includes("上一页")) {
    return createAction("reader_prev_page", undefined, "voice");
  }
  if (lower.includes("summarize") || lower.includes("总结")) {
    return createAction("reader_summarize", undefined, "voice");
  }
  if (lower.includes("font bigger") || lower.includes("调大字体") || lower.includes("larger font")) {
    return createAction("reader_font_increase", undefined, "voice");
  }
  if (lower.includes("font smaller") || lower.includes("调小字体") || lower.includes("smaller font")) {
    return createAction("reader_font_decrease", undefined, "voice");
  }

  // Chat commands
  if (lower.includes("read latest") || lower.includes("读最新") || lower.includes("最新消息")) {
    return createAction("chat_read_latest", undefined, "voice");
  }
  if (lower.includes("send") || lower.includes("发送") || lower.includes("确认")) {
    return createAction("chat_send", undefined, "voice");
  }
  if (lower.includes("cancel") || lower.includes("取消")) {
    return createAction("chat_cancel", undefined, "voice");
  }
  // "帮我回复他说..." / "reply ..."
  const replyMatch = lower.match(/(?:reply|帮我回复|回复)[\s:：]*(.+)/);
  if (replyMatch) {
    return createAction("chat_reply", { text: replyMatch[1].trim() }, "voice");
  }

  // Camera commands — must check BEFORE generic media
  if (lower.includes("take photo") || lower.includes("capture") || lower.includes("拍照") || lower.includes("拍一张")) {
    return createAction("camera_capture", undefined, "voice");
  }
  if (lower.includes("flip camera") || lower.includes("switch camera") || lower.includes("切换摄像头") || lower.includes("切换相机")) {
    return createAction("camera_switch", undefined, "voice");
  }

  // Media commands
  if (lower.includes("pause") || lower.includes("暂停")) {
    return createAction("media_pause", undefined, "voice");
  }
  if (lower.includes("resume") || lower.includes("play") || lower.includes("播放") || lower.includes("继续")) {
    return createAction("media_play", undefined, "voice");
  }
  if (lower.includes("next episode") || lower.includes("下一集")) {
    return createAction("media_next", undefined, "voice");
  }
  if (lower.includes("next song") || lower.includes("next track") || lower.includes("下一首")) {
    return createAction("media_next", undefined, "voice");
  }
  if (lower.includes("next") || lower.includes("下一")) {
    return createAction("media_next", undefined, "voice");
  }
  if (lower.includes("previous") || lower.includes("上一")) {
    return createAction("media_prev", undefined, "voice");
  }

  // Ask AI commands
  if (lower.includes("analyze") || lower.includes("分析") || lower.includes("分析当前画面") || lower.includes("analyze this")) {
    return createAction("ask_analyze", undefined, "voice");
  }
  const askMatch = lower.match(/(?:ask|提问|请问|问题)[\s:：]*(.+)/);
  if (askMatch) {
    return createAction("ask_query", { text: askMatch[1].trim() }, "voice");
  }
  // Fallback: if text starts with question words and no other match, treat as ask_query
  if (/^(what|how|why|when|where|who|which|什么|怎么|为什么|哪里|谁)/.test(lower)) {
    return createAction("ask_query", { text: lower }, "voice");
  }

  return createAction("unknown", { text }, "voice");
}