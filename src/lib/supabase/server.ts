import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { publicEnv, serverEnv } from "@/config/env";

/**
 * Cookie-aware Supabase client for Server Components, Route Handlers, and Server Actions.
 * Create a new instance per request — do not share across requests.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where cookies cannot be set.
          // Session refresh will be handled by the request proxy once auth ships.
        }
      },
    },
  });
}

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
