# Gaze Prototype

Gaze Prototype is the early web prototype, AI backend, and companion interface for **Gaze OS**.

**Gaze OS** is an Android XR-based smart glasses operating system built around eye tracking, voice commands, side-button confirmation, and AI agents.

## What This Prototype Validates

- First-person AI visual question answering
- Voice input and text-to-speech output
- Private per-user capture history
- Session-based interaction logs
- Web-based companion controls
- Early workflow and report generation

## Gaze Prototype Roles

| Role | Description |
|------|-------------|
| **Gaze AI Backend** | `/api/analyze`, image upload, AI Q&A, voice APIs, history, user isolation — future Android Launcher & Gaze OS will call these |
| **Gaze Companion** | Account, history, privacy settings, model config, device binding, shortcut commands, data deletion, logs |
| **Gaze Studio** | Advanced workflow builder — create shortcuts, workflows, configure agent behavior, edit demo scenes, debug prompts |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database & Storage | Supabase (PostgreSQL + Storage) |
| Vision AI | MiMo V2 Omni |
| Report AI | MiMo V2 Flash |
| Deployment | Vercel |

## Demo Flow

```
Start Training → Select Task → Capture Image → Ask Question (voice/text)
→ AI Guidance → Next Step → Repeat → Complete Training → View Report
```

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- An AI API key (MiMo V2 compatible endpoint)

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/YOUR_USERNAME/gaze-prototype.git
   cd gaze-prototype
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp env.example .env.local
   ```

4. Fill in `.env.local`:
   ```
   AI_API_KEY=your_api_key
   AI_API_BASE_URL=your_api_base_url
   AI_MODEL=mimo-v2-omni

   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

5. Set up the database:
   - Go to Supabase Dashboard → SQL Editor
   - Run the contents of `supabase-schema.sql` (for fresh installs)
   - If upgrading from a previous version, run `supabase-migration-user-id.sql` instead
   - Create a Storage bucket named `captures` (set to Public for MVP)
   - **Important**: Enable Anonymous Sign-In in Supabase Dashboard → Authentication → Settings

6. Run the dev server:
   ```bash
   npm run dev
   ```

7. Open http://localhost:3000

### Deploy to Vercel

1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add the same environment variables in Vercel project settings
4. Deploy — HTTPS enables camera access on mobile

## Development Roadmap

See [docs/gaze-os-roadmap.md](docs/gaze-os-roadmap.md) for the full roadmap.

### Current Stage: Gaze Prototype

- ✅ AI visual Q&A
- ✅ Voice input / TTS output
- ✅ Supabase storage + user isolation
- ✅ Session tracking
- ✅ Gaze Studio (workflow builder)
- ✅ Vercel deployment

### Next Stage: Gaze OS Web Prototype

- `/glass` — Glasses mode: hold to talk, auto-capture, auto-answer
- `/glass-os` — Gaze OS simulator: Launcher + Gaze + Voice + Agent Action
- Gaze Launcher web preview
- Demo apps (Chat, Reader, Video, Music)
- Voice command system
- Agent Action System

### Future: Android Launcher

- Kotlin + Jetpack Compose
- Gaze Launcher native version
- Voice commands + TTS
- Demo apps native
- Agent Action native

## Security Notes

- Anonymous authentication ensures each device gets a unique user ID — data is isolated per user
- Images are uploaded **only** when the user presses "Ask"
- Image size limited to 3MB; only JPEG/PNG/WebP accepted
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only, never exposed to the browser
- All API routes require a valid JWT token (anonymous or authenticated)
- For production, switch Supabase Storage to private buckets with signed URLs

## License

MIT