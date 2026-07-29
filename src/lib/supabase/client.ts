import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/config/env";

/**
 * Browser Supabase client for Client Components.
 * Uses the public anon key and relies on RLS for authorization.
 */
export function createClient() {
  return createBrowserClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
  );
}
