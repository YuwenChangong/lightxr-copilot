import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Graceful fallback: if env vars are missing, create a mock client
// so the app doesn't crash with a white screen
function createSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "⚠️ Supabase environment variables missing. " +
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your deployment. " +
      "Running in offline mode — auth and database features are disabled."
    );
    // Return a client pointing to a dummy URL — API calls will fail gracefully
    return createClient(
      "https://placeholder.supabase.co",
      "placeholder-anon-key"
    );
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabaseClient = createSupabaseClient();

/** Whether Supabase is properly configured (works on both client and server) */
export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
