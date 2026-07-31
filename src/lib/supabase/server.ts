import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/config/env";

/**
 * Privileged Supabase client using the service role key.
 * Server-only. Bypasses Row Level Security — use with extreme care.
 */
export function createServiceClient() {
  return createSupabaseClient(
    publicEnv.supabaseUrl,
    serverEnv.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
