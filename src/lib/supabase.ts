import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Public-safe fallbacks. Supabase is designed for the anon key + project URL
// to ship in client code; row-level security is what protects data, not key
// secrecy. The service-role key is the only one that stays server-side.
const FALLBACK_URL = "https://dhmnruuskqbobfgbgqej.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRobW5ydXVza3Fib2JmZ2JncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDU1MzQsImV4cCI6MjA5Mjg4MTUzNH0.TKK_b1qAMJp-bo87DW58N44m8nDEj6nGCeHviup0-x0";

const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || FALLBACK_URL;
const anonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  FALLBACK_ANON_KEY;

export const supabaseEnabled = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error("Supabase config missing. Should be impossible with fallbacks.");
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

export type { SupabaseClient };
