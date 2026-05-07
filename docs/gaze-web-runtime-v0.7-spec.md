# Gaze Web Runtime Protocol — v0.7 Specification

> **Status:** Draft  
> **Date:** 2026-05-07  
> **Supersedes:** v0.6.9 (implemented)  
> **Scope:** Web runtime (Next.js). Android Launcher & Hermes Adapter will reuse this protocol.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Full Pipeline: Voice → Agent Router → ToolPlan → PolicyGate → ToolExecutor → Verification](#2-full-pipeline)
3. [ScreenSnapshot Format](#3-screensnapshot-format)
4. [ToolCall / ToolPlan / ToolResult Format](#4-toolcall--toolplan--toolresult-format)
5. [RiskLevel Rules](#5-risklevel-rules)
6. [pendingConfirmation Flow](#6-pendingconfirmation-flow)
7. [ActionLog Fields](#7-actionlog-fields)
8. [Runtime Debug Panel](#8-runtime-debug-panel)
9. [Hermes Adapter Integration](#9-hermes-adapter-integration)
10. [Android Launcher Reuse](#10-android-launcher-reuse)

---

## 1. Architecture Overview

### 1.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Gaze Web Runtime                            │
│                                                                     │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │  Voice    │───▶│ Agent Router │───▶│  AI Planner  │              │
│  │  Input    │    │  (provider)  │    │  (GPT/local) │              │
│  └──────────┘    └──────────────┘    └──────┬───────┘              │
│                                             │                       │
│                                      ToolPlan (steps[])            │
│                                             │                       │
│                                    ┌────────▼────────┐             │
│                                    │  Policy Gate    │             │
│                                    │  (permission-   │             │
│                                    │   gate.ts)      │             │
│                                    └───┬────┬────┬───┘             │
│                                        │    │    │                  │
│                                     safe  confirm  blocked         │
│                                        │    │    │                  │
│                                        ▼    ▼    ▼                  │
│                                   Execute  Ask  Reject             │
│                                        │    User                   │
│                                   ┌────▼─────┐                     │
│                                   │  Tool    │                     │
│                                   │ Executor │                     │
│                                   └────┬─────┘                     │
│                                        │                            │
│                                   ┌────▼─────────┐                 │
│                                   │ Verification │                 │
│                                   │ (post-exec)  │                 │
│                                   └────┬─────────┘                 │
│                                        │                            │
│                                   ┌────▼─────┐                     │
│                                   │ ActionLog│                     │
│                                   │ (append) │                     │
│                                   └──────────┘                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Source File Map

| File | Role | Version |
|------|------|---------|
| `src/lib/agent/runtime-types.ts` | **Single source of truth** for all types | v0.6.9 |
| `src/lib/agent/permission-gate.ts` | Three-tier permission model (safe/confirm/blocked) | v0.6.9 |
| `src/lib/agent/page-adapter.ts` | Page adapter registry + backward-compat aliases | v0.6.9 |
| `src/lib/agent/dom-scanner.ts` | DOM scanner — generic fallback for any page | v0.6.8 |
| `src/lib/agent/global-tool-executor.ts` | Execute actions + post-execution verification | v0.6.8 |
| `src/components/agent/GlobalAgentProvider.tsx` | Global state + full pipeline orchestration | v0.6.9 |
| `src/components/agent/RuntimeDebugPanel.tsx` | Debug UI: state + action log | v0.6.9 |
| `src/app/api/agent/route.ts` | AI planner API endpoint | v0.6.6 |

### 1.3 Design Principles

1. **Single source of truth** — `runtime-types.ts` is the only file that defines types. All other files import from it.
2. **Backward compatibility** — `page-adapter.ts` exports aliases (`PageElement = ScreenElement`, `PageSnapshot = ScreenSnapshot`, etc.) so existing code works unchanged.
3. **Platform-agnostic types** — `ScreenSnapshot`, `ToolCall`, `ToolPlan`, `ToolResult` have NO browser/DOM dependencies. Android and Hermes can use them directly.
4. **Policy gate is mandatory** — No tool executes without passing through `permission-gate.ts`. This is a hard security boundary.
5. **Every execution produces an ActionLogEntry** — Full audit trail for debugging, replay, and compliance.

---

## 2. Full Pipeline

### 2.1 Pipeline Steps

```
Voice/Text Input
       │
       ▼
┌──────────────────────┐
│ Step 1: Basic Command │  tryBasicCommand() — hardcoded route map
│ (local, no AI)       │  e.g. "回到首页" → navigate("/")
└──────────┬───────────┘
           │ if no match
           ▼
┌──────────────────────┐
│ Step 2: Page Snapshot │  adapter.getSnapshot() or scanPageDOM()
│ (capture current UI) │  → ScreenSnapshot
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ Step 3: AI Planner   │  POST /api/agent with:
│ (GPT or local)       │  { message, context: { currentRoute, pageSnapshot, availableTools } }
│                      │  → { actions: PageAction[], needsConfirmation, clarification }
└──────────┬───────────┘
           │ if AI failed or returned empty
           ▼
┌──────────────────────┐
│ Step 3.5: Local Fallback │  parseLocalCommand() — regex route patterns
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ Step 4: Clarification │  if clarification && no actions → show question, stop
│ / Confirmation check  │  if needsConfirmation → show warning, stop
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ Step 5: Policy Gate   │  checkPlanPermissions(plan)
│ (permission-gate.ts)  │  → { overall, decisions[], hasBlocked, hasConfirm }
│                      │
│  if hasBlocked → 🚫 REJECT, show blocked reasons
│  if hasConfirm → ⚠️ STORE in pendingConfirmation, show warning
│  if all safe   → ✅ proceed
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ Step 6: Execute Plan  │  for each step in plan:
│ (step by step)        │
│  6a. snapshotBefore   │  = adapter.getSnapshot() or scanPageDOM()
│  6b. execute action   │  = adapter.executeAction() or executeGlobalAction()
│  6c. verify action    │  = verifyAction(action, snapshotBefore, route)
│  6d. log action       │  = ActionLogEntry → prepend to actionLog
│  6e. if failed → break│  show error, stop
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ Step 7: Final Report  │  snapshotAfter = current page snapshot
│                       │  show "✅ 完成 N 个步骤，已到达 {title}"
└──────────────────────┘
```

### 2.2 Code Reference

**Pipeline orchestrator:** `GlobalAgentProvider.tsx` → `executeCommand()` method (line 243–519)

```typescript
// Simplified flow in executeCommand(command: string):

// 1. Basic command
const basicResult = tryBasicCommand(command);
if (basicResult) { execute + return; }

// 2. Page snapshot
const snapshot = currentAdapter?.getSnapshot() ?? scanPageDOM(pathname);

// 3. AI planner
const res = await fetch("/api/agent", { ... });
let plan: PageAction[] = data?.actions ?? [];

// 3.5. Local fallback
if (plan.length === 0) plan = parseLocalCommand(command, pathname);

// 4. Clarification / confirmation
if (clarification && plan.length === 0) { show question; return; }
if (needsConfirmation) { show warning; return; }

// 5. Policy gate
const permissionResults = checkPlanPermissions(plan.map(...));
if (permissionResults.hasBlocked) { reject; return; }
if (permissionResults.hasConfirm) { store pendingConfirmation; return; }

// 6. Execute step by step
for (const action of plan) {
  const snapshotBefore = getSnapshot();
  const result = await execute(action, snapshotBefore, pathname);
  logToActionLog(result);
  if (!result.ok) break;
}

// 7. Final report
showFeedback(`✅ 完成 ${n} 个步骤`);
```

---

## 3. ScreenSnapshot Format

### 3.1 TypeScript Definition

```typescript
interface ScreenSnapshot {
  /** Current route, e.g. "/", "/glass-os", "/tasks" */
  route: string;
  /** Human-readable page/app title */
  title: string;
  /** All interactive elements visible on screen (max 50) */
  elements: ScreenElement[];
  /** Optional full text content of the page (max 1500 chars) */
  textContent?: string;
  /** Timestamp when snapshot was taken (Date.now()) */
  timestamp: number;
}

interface ScreenElement {
  id: string;           // stable, human-readable ID
  role: ElementRole;    // "button" | "link" | "input" | "text" | "card" | "app" | "form" | "image" | "icon"
  label: string;        // display text or placeholder
  enabled: boolean;     // interactive?
  dangerous?: boolean;  // contains delete/send/submit/pay keywords
  bounds?: { x: number; y: number; w: number; h: number };  // for gaze targeting
}
```

### 3.2 How Snapshots Are Produced

| Source | Function | When Used |
|--------|----------|-----------|
| **DOM Scanner** | `scanPageDOM(route?)` | Generic fallback for any web page |
| **Page Adapter** | `adapter.getSnapshot()` | When a page-specific adapter is registered (e.g. Glass OS, Tasks) |

**DOM Scanner strategy** (`dom-scanner.ts`):
1. Query all interactive elements: `button, a[href], input, textarea, select, [role=button], [role=link], [role=tab], [role=menuitem], [tabindex], [data-agent-id], details>summary`
2. Filter: visible, not disabled, has reasonable size
3. Generate ID: `id > data-agent-id > aria-label > text content > tag+index`
4. Max 50 elements returned

### 3.3 Example

```json
{
  "route": "/tasks",
  "title": "任务管理 - Gaze Studio",
  "elements": [
    { "id": "button-新建任务", "role": "button", "label": "新建任务", "enabled": true, "dangerous": false },
    { "id": "task-card-1", "role": "card", "label": "开发 Gaze Runtime v0.7", "enabled": true },
    { "id": "search-input", "role": "input", "label": "搜索任务...", "enabled": true }
  ],
  "textContent": "任务管理 | 本周任务 | 开发 Gaze Runtime v0.7 | 编写规格文档...",
  "timestamp": 1746604000000
}
```

### 3.4 Platform Notes

- **Web:** DOM-based, produced by `scanPageDOM()`
- **Android:** Will use `AccessibilityNodeInfo` tree → same `ScreenSnapshot` format
- **Hermes:** Will receive `ScreenSnapshot` from the host runtime (web or Android)

---

## 4. ToolCall / ToolPlan / ToolResult Format

### 4.1 ToolCall

```typescript
interface ToolCall {
  tool: ToolName;           // e.g. "navigate", "click_target", "send_message"
  args: ToolArgs;           // tool-specific arguments
  riskLevel?: RiskLevel;    // assigned by policy gate
  confirmReason?: string;   // if risk=confirm, reason for needing confirmation
}
```

### 4.2 ToolName (Complete List — 41 tools)

| Category | Tool Name | Risk | Description |
|----------|-----------|------|-------------|
| **Navigation** | `read_screen` | safe | Read current screen elements |
| | `navigate` | safe | Navigate to route/app |
| | `go_back` | safe | Go to previous page |
| | `open_app` | safe | Open app in Gaze OS |
| **Interaction** | `click_target` | safe | Click UI element by ID |
| | `type_text` | safe | Type text into input |
| | `scroll` | safe | Scroll view |
| **Camera/Vision** | `capture_frame` | safe | Capture camera frame |
| | `analyze_frame` | safe | Analyze frame with AI |
| | `summarize_screen` | safe | Summarize screen content |
| **Chat** | `draft_reply` | safe | Draft reply message |
| | `send_message` | **confirm** | Send message |
| **Form** | `submit_form` | **confirm** | Submit form |
| **Media** | `media_play` | safe | Play media |
| | `media_pause` | safe | Pause media |
| | `media_next` | safe | Next track |
| | `media_prev` | safe | Previous track |
| | `media_volume_up` | safe | Volume up |
| | `media_volume_down` | safe | Volume down |
| | `media_mute` | safe | Mute/unmute |
| **Reader** | `reader_next_page` | safe | Next page |
| | `reader_prev_page` | safe | Previous page |
| | `reader_toggle_tts` | safe | Toggle TTS |
| **Misc** | `tts_speak` | safe | Speak text |
| | `tts_stop` | safe | Stop speaking |
| | `ask_query` | safe | Ask AI question |
| **Confirm** | `upload_image` | **confirm** | Upload image |
| | `record_video` | **confirm** | Record video |
| | `delete_data` | **confirm** | Delete data |
| | `share_content` | **confirm** | Share content |
| | `change_system_setting` | **confirm** | Change settings |
| | `open_third_party_app` | **confirm** | Open 3rd-party app |
| **Blocked** | `bypass_login` | 🚫 blocked | Bypass auth |
| | `reverse_protocol` | 🚫 blocked | Reverse engineer |
| | `read_password` | 🚫 blocked | Read passwords |
| | `export_contacts` | 🚫 blocked | Export contacts |
| | `access_secret_tokens` | 🚫 blocked | Access secrets |
| | `disable_privacy_indicator` | 🚫 blocked | Disable privacy UI |
| | `background_recording` | 🚫 blocked | Silent recording |
| | `modify_security_core` | 🚫 blocked | Modify security |

### 4.3 ToolArgs (Per-Tool Parameters)

```typescript
// Navigation
ReadScreenArgs    { appId?: string }
NavigateArgs      { target: string; href?: string }
GoBackArgs        {}
OpenAppArgs       { appId: string }

// Interaction
ClickTargetArgs   { targetId: string }
TypeTextArgs      { targetId: string; text: string }
ScrollArgs        { direction: "up"|"down"|"left"|"right"; amount?: number }
SubmitFormArgs    { formId?: string }

// Camera/Vision
CaptureFrameArgs  { saveToHistory?: boolean }
AnalyzeFrameArgs  { question?: string; imageBase64?: string }
SummarizeScreenArgs {}

// Chat
DraftReplyArgs    { context?: string; tone?: "formal"|"casual"|"brief" }
SendMessageArgs   { targetId: string; text?: string }

// Misc
TTSSpeakArgs      { text: string; lang?: string }
AskQueryArgs      { text: string; imageBase64?: string }
```

### 4.4 ToolPlan

```typescript
interface ToolPlan {
  steps: ToolCall[];         // ordered list of tool calls
  confidence: number;        // AI confidence (0-1)
  label: string;             // human-readable label
  requiresConfirmation: boolean;  // whether whole plan needs confirmation
}
```

### 4.5 ToolResult

```typescript
interface ToolResult {
  ok: boolean;         // success/failure
  message: string;     // human-readable result description
  data?: unknown;      // optional payload (e.g. VerificationResult)
}
```

### 4.6 VerificationResult

```typescript
type VerificationType = "route_match" | "element_exists" | "element_text" | "snapshot_changed" | "none";

interface VerificationResult {
  passed: boolean;
  type: VerificationType;
  message: string;
  expected?: string;
  actual?: string;
}
```

**Verification strategy by action type:**

| Action | Verification Type | Logic |
|--------|-------------------|-------|
| `navigate` | `route_match` | `window.location.pathname === expected` |
| `click_target` | `snapshot_changed` | page content/elements changed |
| `type_text` | `element_text` | input value contains typed text |
| `submit_form` | `snapshot_changed` | page content changed after submit |
| `go_back` | `snapshot_changed` | page changed after back |
| other | `none` | no verification needed |

---

## 5. RiskLevel Rules

### 5.1 Three Tiers

```
┌─────────┬──────────────────────────────────────────────────────┐
│  Level  │  Behavior                                            │
├─────────┼──────────────────────────────────────────────────────┤
│  safe   │  Auto-execute immediately. No user interaction.      │
│         │  Examples: navigate, click, type, scroll, media      │
├─────────┼──────────────────────────────────────────────────────┤
│ confirm │  Requires explicit user confirmation before exec.    │
│         │  Stored in pendingConfirmation state.                │
│         │  Examples: send_message, submit_form, delete_data    │
├─────────┼──────────────────────────────────────────────────────┤
│ blocked │  Always rejected. Cannot be bypassed.                │
│         │  Logged as blocked action.                           │
│         │  Examples: read_password, bypass_login, export_contacts│
└─────────┴──────────────────────────────────────────────────────┘
```

### 5.2 Permission Check Order (in `checkPermission()`)

```
1. BLOCKED_KEYWORD_PATTERNS  →  /password/i, /seed.?phrase/i, /private.?key/i, ...
2. BLOCKED_TOOL_PATTERNS     →  bypass_login, reverse_protocol, read_password, ...
3. CONFIRM_TOOLS             →  send_message, submit_form
4. CONFIRM_ARG_PATTERNS      →  /upload.?image/i, /delete.?data/i, ...
5. SAFE_TOOLS                →  all 24 safe tools
6. Unknown tool              →  blocked (default)
```

### 5.3 Blocked Keyword Patterns (Applied to Tool Name AND Args)

```typescript
const BLOCKED_KEYWORD_PATTERNS = [
  /password/i,
  /seed.?phrase/i,
  /private.?key/i,
  /secret.?token/i,
  /reverse.?protocol/i,
  /bypass.?login/i,
  /exploit/i,
  /inject/i,
  /hook/i,
];
```

### 5.4 Plan-Level Permission

```typescript
function checkPlanPermissions(calls: ToolCall[]): {
  overall: RiskLevel;       // highest risk in the plan
  decisions: PolicyDecision[];  // per-step decision
  hasBlocked: boolean;      // any step blocked?
  hasConfirm: boolean;      // any step needs confirm?
}
```

**Rule:** If ANY step is blocked → entire plan is blocked. If ANY step is confirm → entire plan requires confirmation.

---

## 6. pendingConfirmation Flow

### 6.1 State Machine

```
User says "发送消息给小明"
         │
         ▼
   AI returns ToolPlan:
   [{ tool: "send_message", args: { targetId: "xiaoming", text: "你好" } }]
         │
         ▼
   Policy Gate: send_message → confirm
         │
         ▼
   ┌─────────────────────────────────────┐
   │ setPendingConfirmation(plan)        │
   │ setCurrentRisk("confirm")           │
   │ showFeedback("⚠️ 需要确认: ...")    │
   │ setIsProcessing(false)              │
   └─────────────────────────────────────┘
         │
         ▼
   User sees confirmation UI (future: overlay with Accept/Reject)
         │
    ┌────┴────┐
    │         │
  Accept    Reject
    │         │
    ▼         ▼
  Execute   setPendingConfirmation(null)
  plan      showFeedback("已取消")
```

### 6.2 Current Implementation

In v0.6.9, the `pendingConfirmation` state is set but **execution does not resume** after user confirmation. This is intentional — the UI for confirmation overlay is planned for v0.7.1.

```typescript
// In GlobalAgentProvider.tsx:
if (permissionResults.hasConfirm) {
  showFeedback(`⚠️ 需要确认: ${data?.clarification || "该操作需要用户确认"}`, 6000);
  setCurrentRisk("confirm");
  setPendingConfirmation(plan);  // stored for future use
  setIsProcessing(false);
  return;  // does NOT execute
}
```

### 6.3 Future: v0.7.1 Confirmation UI

```
┌─────────────────────────────────────────┐
│  ⚠️ 需要你的确认                         │
│                                         │
│  即将执行: 发送消息给 小明                 │
│  内容: "你好"                            │
│                                         │
│  [✅ 确认执行]    [❌ 取消]              │
└─────────────────────────────────────────┘
```

---

## 7. ActionLog Fields

### 7.1 ActionLogEntry

```typescript
interface ActionLogEntry {
  id: string;                    // unique ID: "log_{timestamp}_{counter}"
  timestamp: number;             // Date.now() when executed
  userCommand: string;           // original voice/text command
  beforeSnapshot: ScreenSnapshot; // screen state BEFORE execution
  toolPlan: ToolPlan;            // full AI-generated plan
  toolCall: ToolCall;            // specific tool being executed
  riskLevel: RiskLevel;          // safe | confirm | blocked
  toolResult: ToolResult;        // execution result { ok, message, data? }
  afterSnapshot?: ScreenSnapshot; // screen state AFTER execution (optional)
  verificationResult?: VerificationResult; // post-execution verification
  error?: string;                // error message if failed
}
```

### 7.2 Log Lifecycle

```
1. Created in GlobalAgentProvider.tsx after each tool execution
2. Prepended to actionLog state array
3. Max 50 entries retained (older entries discarded)
4. Displayed in RuntimeDebugPanel (most recent 10 shown)
```

### 7.3 Example Entry

```json
{
  "id": "log_1746604123456_1",
  "timestamp": 1746604123456,
  "userCommand": "打开任务管理",
  "beforeSnapshot": {
    "route": "/",
    "title": "首页",
    "elements": [...],
    "timestamp": 1746604123000
  },
  "toolPlan": {
    "steps": [{ "tool": "navigate", "args": { "target": "/tasks", "href": "/tasks" } }],
    "confidence": 0.95,
    "label": "执行 打开任务管理",
    "requiresConfirmation": false
  },
  "toolCall": { "tool": "navigate", "args": { "target": "/tasks", "href": "/tasks" } },
  "riskLevel": "safe",
  "toolResult": { "ok": true, "message": "正在前往 /tasks → 已到达 /tasks" },
  "verificationResult": {
    "passed": true,
    "type": "route_match",
    "message": "已到达 /tasks",
    "expected": "/tasks",
    "actual": "/tasks"
  }
}
```

---

## 8. Runtime Debug Panel

### 8.1 Location

`src/components/agent/RuntimeDebugPanel.tsx`

### 8.2 Displayed Sections

| Section | Content | Source |
|---------|---------|--------|
| **Runtime State** | currentRoute, currentApp, lastCommand, aiCalled | `runtimeState` |
| **Current Tool** | tool name + risk level badge (color-coded) | `runtimeState.currentTool`, `currentRisk` |
| **Last Result** | ok/fail + message | `runtimeState.lastResult` |
| **Last Verification** | passed/failed + type + expected/actual | `runtimeState.lastVerification` |
| **Pending Confirmation** | tool call awaiting user approval | `runtimeState.pendingConfirmation` |
| **Last Error** | error message if execution failed | `runtimeState.lastError` |
| **Action Log** | most recent 10 entries with tool, risk, result, time | `runtimeState.actionLog` |

### 8.3 Risk Level Color Coding

| Risk | Color | Badge |
|------|-------|-------|
| safe | 🟢 green | `bg-green-500` |
| confirm | 🟡 yellow | `bg-yellow-500` |
| blocked | 🔴 red | `bg-red-500` |

### 8.4 Action Log Display Format

```
┌──────────────────────────────────────────────────┐
│ 📋 Action Log (最近 10 条)                        │
├──────────────────────────────────────────────────┤
│ 🟢 navigate        → ✅ ok    2s ago             │
│    "正在前往 /tasks → 已到达 /tasks"               │
├──────────────────────────────────────────────────┤
│ 🟡 send_message    → ⏳ pending  5s ago          │
│    "需要用户确认: send_message"                    │
├──────────────────────────────────────────────────┤
│ 🔴 read_password   → ❌ blocked  8s ago          │
│    "工具被禁止: read_password"                     │
└──────────────────────────────────────────────────┘
```

---

## 9. Hermes Adapter Integration

### 9.1 What is Hermes?

Hermes is a small, fast language model that can run on-device (Android, edge devices). It will replace or supplement GPT-based AI planning for latency-sensitive scenarios.

### 9.2 Integration Architecture

```
┌─────────────────────────────────────────────┐
│              Gaze Runtime (Web/Android)       │
│                                               │
│  Voice Input                                  │
│       │                                       │
│       ▼                                       │
│  ┌─────────────┐    ┌──────────────────┐     │
│  │ Agent Router │───▶│ AI Planner       │     │
│  │             │    │ ┌──────────────┐ │     │
│  │             │    │ │ GPT (cloud)  │ │     │
│  │             │    │ ├──────────────┤ │     │
│  │             │    │ │ Hermes (on-device) │ │
│  │             │    │ └──────────────┘ │     │
│  └─────────────┘    └───────┬──────────┘     │
│                              │                │
│                         ToolPlan              │
│                              │                │
│                     Policy Gate (same!)       │
│                              │                │
│                     Tool Executor (same!)     │
└─────────────────────────────────────────────┘
```

### 9.3 Key Contract: Hermes Output Format

Hermes MUST output the same `ToolPlan` format that GPT produces:

```json
{
  "actions": [
    { "type": "navigate", "href": "/tasks" },
    { "type": "click_target", "targetId": "button-新建任务" }
  ],
  "needsConfirmation": false,
  "clarification": null,
  "confidence": 0.85
}
```

### 9.4 What Hermes Needs From Runtime

| Data | Format | Source |
|------|--------|--------|
| Screen snapshot | `ScreenSnapshot` | `adapter.getSnapshot()` or `scanPageDOM()` |
| Available tools | `ToolName[]` | `TOOL_REGISTRY` keys |
| Current route | `string` | `window.location.pathname` |
| User command | `string` | voice transcript or text input |

### 9.5 What Hermes Does NOT Need

- **DOM access** — Runtime handles all DOM interaction
- **Permission logic** — Policy Gate handles this
- **Verification** — Runtime handles post-exec verification
- **Action logging** — Runtime handles ActionLog

### 9.6 Adapter File (Planned)

```
src/lib/agent/hermes-adapter.ts
├── createHermesPrompt(snapshot, tools, command) → string
├── parseHermesResponse(raw) → ToolPlan
└── selectPlanner(command, config) → "gpt" | "hermes" | "auto"
```

### 9.7 Planner Selection Strategy

```typescript
function selectPlanner(command: string, config: PlannerConfig): "gpt" | "hermes" {
  // Simple commands → Hermes (fast, on-device)
  // Complex commands → GPT (cloud, more capable)
  // Offline mode → Hermes only
  // Cost-sensitive → Hermes preferred

  if (config.offlineMode) return "hermes";
  if (isSimpleCommand(command)) return "hermes";  // navigate, click, scroll
  if (config.costSensitive) return "hermes";
  return "gpt";  // default for complex multi-step plans
}
```

---

## 10. Android Launcher Reuse

### 10.1 Architecture: Same Protocol, Different Runtime

```
┌───────────────────────────────────────────────────────────┐
│                   Gaze Protocol (shared)                    │
│                                                            │
│  ScreenSnapshot / ToolCall / ToolPlan / ToolResult / etc. │
│                                                            │
│  ┌─────────────────────┐  ┌──────────────────────────┐   │
│  │   Web Runtime       │  │   Android Runtime        │   │
│  │   (Next.js)         │  │   (Kotlin/Compose)       │   │
│  │                     │  │                          │   │
│  │  scanPageDOM()      │  │  AccessibilityService    │   │
│  │  → ScreenSnapshot   │  │  → ScreenSnapshot        │   │
│  │                     │  │                          │   │
│  │  DOM manipulation   │  │  AccessibilityAction     │   │
│  │  → ToolResult       │  │  → ToolResult            │   │
│  │                     │  │                          │   │
│  │  Web Speech API     │  │  Android SpeechRecognizer│   │
│  │  → voice input      │  │  → voice input           │   │
│  └─────────────────────┘  └──────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

### 10.2 What Android Reuses Directly (No Changes)

| Component | Reuse Strategy |
|-----------|---------------|
| `runtime-types.ts` | **Direct copy** — pure TypeScript types, no DOM deps. Convert to Kotlin data classes. |
| `permission-gate.ts` | **Direct copy** — pure logic, no DOM. Convert to Kotlin. |
| `TOOL_REGISTRY` | **Direct copy** — static data. Convert to Kotlin enum/map. |
| `ActionLogEntry` | **Direct copy** — pure data structure. |
| `ToolPlan` | **Direct copy** — AI output format. |

### 10.3 What Android Must Implement Natively

| Component | Android Implementation |
|-----------|----------------------|
| `ScreenSnapshot` producer | `AccessibilityService.getRootInActiveWindow()` → traverse tree → `ScreenSnapshot` |
| `ToolExecutor` | `AccessibilityNodeInfo.performAction()` for click/type/scroll |
| `Voice Input` | `android.speech.SpeechRecognizer` |
| `Navigation` | `Intent` / `Activity.startActivity()` |
| `TTS` | `android.speech.tts.TextToSpeech` |

### 10.4 Android ScreenSnapshot Mapping

```
AccessibilityNodeInfo          →  ScreenElement
├── viewIdResourceName         →  id
├── className (Button/EditText)→  role
├── text / contentDescription  →  label
├── isEnabled                  →  enabled
├── getBoundsInScreen()        →  bounds
└── isClickable/isEditable     →  (implied by role)

AccessibilityWindowInfo        →  ScreenSnapshot
├── active window title        →  title
├── current activity name      →  route
├── all nodes                  →  elements
└── concatenated text          →  textContent
```

### 10.5 Shared Tool Name Contract

Both Web and Android MUST use the same `ToolName` values from `runtime-types.ts`. This ensures:

1. **AI planner is cross-platform** — same prompt works for both
2. **Policy gate is cross-platform** — same blocked/confirm rules
3. **ActionLog is cross-platform** — same format for debugging/replay
4. **Hermes model is cross-platform** — same input/output format

### 10.6 Future: Shared Kotlin/TypeScript Types

To prevent drift between Web and Android types, we plan to:

1. Define canonical types in a language-neutral schema (JSON Schema or Protobuf)
2. Generate TypeScript types and Kotlin data classes from the schema
3. CI validates both implementations match the schema

```
schemas/gaze-runtime-types.json
├──→ generate → src/lib/agent/runtime-types.ts
└──→ generate → android/.../GazeRuntimeTypes.kt
```

---

## Appendix A: File Change History

| Version | Date | Changes |
|---------|------|---------|
| v0.6.6 | — | Basic commands, voice input, page adapters |
| v0.6.7 | — | Clarification handling, needsConfirmation |
| v0.6.8 | — | Post-execution verification (route_match, snapshot_changed, etc.) |
| v0.6.9 | 2026-05-07 | Unified types (runtime-types.ts), Permission Gate, ActionLog, Debug Panel |
| v0.7.0 | 2026-05-07 | This specification document |

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **ScreenSnapshot** | A platform-agnostic description of the current UI state |
| **ToolCall** | A single tool invocation with name + args |
| **ToolPlan** | An ordered sequence of ToolCalls generated by AI |
| **RiskLevel** | Permission tier: safe / confirm / blocked |
| **PolicyGate** | The security boundary