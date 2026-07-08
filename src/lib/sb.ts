/**
 * Shared Supabase browser client (single instance — auth, data, realtime).
 * Returns null on the server or when Supabase isn't configured, so every
 * caller degrades gracefully.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./config";

let client: SupabaseClient | null = null;

export function sb(): SupabaseClient | null {
  if (typeof window === "undefined" || !supabaseConfigured()) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // picks up confirmation/recovery links
      },
    });
  }
  return client;
}
