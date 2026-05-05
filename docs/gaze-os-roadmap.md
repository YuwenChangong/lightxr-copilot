# Gaze OS Roadmap

## Vision

Gaze OS is an Android XR-based smart glasses operating system built around:
- **Eye tracking** — gaze-based interaction
- **Voice commands** — natural speech input
- **Side-button confirmation** — tactile confirm without touch
- **AI agents** — contextual understanding and action execution

Gaze Prototype is the early web-based proving ground for these ideas.

---

## Gaze Prototype — Current Responsibilities

Gaze Prototype serves three roles today:

### 1. Gaze AI Backend
- Image capture and upload
- AI visual question answering (`/api/analyze`)
- Voice transcription (`/api/transcribe`)
- Text-to-speech output
- Per-user capture history (Supabase)
- Session tracking (start / complete)
- Anonymous user isolation

### 2. Gaze Companion (Web)
- Camera capture and image upload
- Voice input with Web Speech API
- AI-powered Q&A with image context
- Private capture history
- Session management
- Training reports

### 3. Gaze Studio (Advanced Workflow Builder)
- Task templates (Battery Assembly, PC Assembly, Lab Safety)
- Step-by-step guided training
- AI-generated training reports
- Workflow creation and editing
- Prompt / Action Schema debugging

> Gaze Studio is **not** in the main flow. It lives under Advanced / Developer Tools.

---

## What Stays (Core Assets)

These are the foundation of Gaze OS and will not be removed:

- `/api/analyze` — AI vision endpoint
- `/api/transcribe` — voice transcription
- `/api/captures` — capture history CRUD
- `/api/sessions/start` and `/api/sessions/complete` — session lifecycle
- Supabase schema and storage
- Anonymous auth + user isolation
- Vercel deployment pipeline

---

## What Gets Renamed

| Before | After |
|--------|-------|
| LightXR Copilot | Gaze Prototype |
| LightXR Copilot v0.1 | Gaze Prototype v0.1 |
| Task Builder | Gaze Studio / Workflow Builder |
| AskPanel | Gaze Ask |
| CaptureHistory | Gaze Memory / Activity Log |
| Training Mode | Guided Training (Advanced) |

---

## What Gets Demoted (Advanced Only)

These features are valuable but not the main entry point:

- Task Builder → Gaze Studio (Advanced menu)
- Training Reports → Gaze Studio
- Guided Training → Gaze Studio
- Fixed templates → Gaze Studio

The **default homepage experience** is Free Ask / Ask AI.

---

## Next Stage: Gaze OS Web Prototype

### `/glass` — Glasses Mode
A minimal full-screen interface designed for smart glasses:
- Hold to talk (voice input)
- Auto-capture camera frame
- Auto-answer via AI
- Large text display
- TTS readout

### `/glass-os` — Gaze OS Simulator
A web-based simulator for the full Gaze OS experience:
- **Gaze Launcher** — home screen with app grid
- **Demo Apps** — Chat, Reader, Video, Music
- **Gaze Module** — camera + AI vision
- **Voice Module** — command recognition
- **Agent Action System** — structured action execution

### Key Features to Build
- Voice command recognition system
- Agent Action Schema (JSON-based action definitions)
- App framework for demo apps
- Launcher UI with clock, status, app shortcuts
- Side-button simulation (Enter key / tap)

---

## Future: Android Launcher

### Phase 1: Foundation
- Kotlin + Jetpack Compose project
- Gaze Launcher native UI
- Camera integration
- Basic voice input

### Phase 2: Gaze Integration
- Native AI vision pipeline
- TTS engine integration
- Voice command system
- Side-button handling

### Phase 3: Agent System
- Agent Action Schema (shared with web)
- Native app framework
- Demo apps (Chat, Reader, Video, Music)
- Settings and configuration

### Phase 4: Gaze OS
- Full operating system shell
- Eye tracking integration
- Multi-modal input fusion
- App marketplace / sideloading

---

## Development Principles

1. **Don't waste existing work** — everything built so far is a Gaze asset
2. **One file at a time** — small, focused changes
3. **Don't increase complexity prematurely** — no monorepo migration yet
4. **Backend first** — API routes are the stable foundation
5. **Web prototype validates before native** — test ideas in browser first
6. **Gaze Studio stays but doesn't lead** — Free Ask is the main experience