"use client";

import { supabaseConfigured } from "@/lib/supabase-client";

/**
 * Shows a warning banner when Supabase is not configured.
 * Storage and history features are disabled in this mode.
 */
export default function DegradationBanner() {
  // Only show when Supabase is NOT configured
  if (supabaseConfigured) return null;

  return (
    <div
      className="bg-[#ff9500]/15 border-b border-[#ff9500]/30 px-4 py-2 text-center"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      <p className="text-[#c77c00] text-xs font-medium leading-relaxed">
        ⚠️ Degraded Mode — Supabase is not configured. Storage, history, and
        user isolation are disabled. The app can still be used for camera preview
        and AI analysis.
      </p>
    </div>
  );
}