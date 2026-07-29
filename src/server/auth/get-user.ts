/**
 * Read the current authenticated user from the Supabase SSR session.
 */

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type AuthUserResult =
  | { ok: true; user: User }
  | { ok: false; user: null; error: string | null };

/**
 * Returns the signed-in user, or null when unauthenticated.
 * Prefer this for optional auth checks.
 */
export async function getUser(): Promise<AuthUserResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return { ok: false, user: null, error: error.message };
    }

    if (!data.user) {
      return { ok: false, user: null, error: null };
    }

    return { ok: true, user: data.user };
  } catch (error) {
    return {
      ok: false,
      user: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to read authentication session.",
    };
  }
}
