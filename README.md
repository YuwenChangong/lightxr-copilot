# LightXR Copilot

A first-person AI task assistant prototype for lightweight XR glasses.

## What It Is

LightXR Copilot explores a lightweight glasses-first interaction model. It uses a phone camera as first-person view input and provides visual understanding, voice interaction, task guidance, persistent memory, and AI-generated training reports.

## Why It Matters

Current XR headsets are heavy and expensive. LightXR Copilot demonstrates that a software-only prototype — running on a phone browser — can deliver meaningful first-person AI assistance for industrial training, assembly tasks, and guided procedures.

## Features

- **Camera Capture / Image Upload** — Snap a photo or upload an image of what you're looking at
- **Voice Input** — Speak your question naturally
- **AI Visual Understanding** — Multi-modal AI analyzes your view and answers questions
- **Text-to-Speech Response** — AI answers read aloud for hands-free use
- **Task Mode** — Step-by-step guidance with task templates (Battery Assembly, PC Assembly, Lab Safety)
- **Persistent Memory** — All captures saved to Supabase with full history
- **Training Sessions** — Start / complete training with tracked question count
- **AI Training Reports** — MiMo V2 Flash generates concise training summaries

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
   git clone https://github.com/YOUR_USERNAME/lightxr-copilot.git
   cd lightxr-copilot
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
   - Run the contents of `supabase-schema.sql`
   - Create a Storage bucket named `captures` (set to Public for MVP)

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

## Security Notes

- Images are uploaded **only** when the user presses "Ask"
- Image size limited to 3MB; only JPEG/PNG/WebP accepted
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only, never exposed to the browser
- For production, switch Supabase Storage to private buckets with signed URLs

## License

MIT