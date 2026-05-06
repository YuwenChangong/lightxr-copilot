"use client";

import { useEffect, useState } from "react";
import { supabaseClient, supabaseConfigured } from "@/lib/supabase-client";

export function useAnonymousUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      setLoading(true);

      // If Supabase is not configured, skip auth entirely
      // so the page can still render
      if (!supabaseConfigured) {
        console.warn("Supabase not configured — running without auth");
        setLoading(false);
        return;
      }

      try {
        // Check if already signed in
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();

        if (session?.user) {
          setUserId(session.user.id);
          setAccessToken(session.access_token);
          setLoading(false);
          return;
        }

        // Sign in anonymously
        const { data, error } = await supabaseClient.auth.signInAnonymously();

        if (error) {
          console.error("Anonymous sign-in failed:", error);
          setLoading(false);
          return;
        }

        setUserId(data.user?.id ?? null);
        setAccessToken(data.session?.access_token ?? null);
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  return { userId, accessToken, loading };
}
