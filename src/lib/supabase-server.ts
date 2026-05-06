import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseServerConfigured = !!(supabaseUrl && serviceRoleKey);

function createServerClient(): SupabaseClient {
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "⚠️ Server Supabase env vars missing. API routes that need database/storage will fail gracefully."
    );
    return createClient(
      "https://placeholder.supabase.co",
      "placeholder-service-role-key"
    );
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

export const supabaseServer = createServerClient();

/** Whether unauthenticated demo mode is explicitly allowed */
export const allowUnauthenticatedDemo =
  process.env.ALLOW_UNAUTHENTICATED_DEMO === "true";

/**
 * Whether we should allow the app to run in degraded mode:
 * - Supabase is not configured
 * - AND either we're in development OR ALLOW_UNAUTHENTICATED_DEMO=true
 */
export const isDemoMode =
  !supabaseServerConfigured &&
  (process.env.NODE_ENV === "development" || allowUnauthenticatedDemo);
