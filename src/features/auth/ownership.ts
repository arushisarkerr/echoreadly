/**
 * Ownership helpers for user-scoped data access.
 * User-scoped queries must use the authenticated SSR client — never the service role.
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/server/auth/get-user";

export type OwnershipContext = {
  userId: string;
  user: User;
  /** Cookie-aware Supabase client bound to the signed-in user (RLS enforced). */
  client: SupabaseClient;
};

export type OwnershipResult =
  | { ok: true; data: OwnershipContext }
  | { ok: false; error: string };

/**
 * Resolve the authenticated user and a user-scoped Supabase client.
 */
export async function requireOwnershipContext(): Promise<OwnershipResult> {
  const auth = await getUser();

  if (!auth.ok || !auth.user) {
    return {
      ok: false,
      error: "Authentication required.",
    };
  }

  const client = await createClient();

  return {
    ok: true,
    data: {
      userId: auth.user.id,
      user: auth.user,
      client,
    },
  };
}

/**
 * True when a persisted row belongs to the given user.
 */
export function isOwnedByUser(
  rowUserId: string | null | undefined,
  userId: string,
): boolean {
  return Boolean(rowUserId) && rowUserId === userId;
}

/**
 * Attach the authenticated user id to an insert/upsert payload.
 */
export function withOwnerId<T extends Record<string, unknown>>(
  payload: T,
  userId: string,
): T & { user_id: string } {
  return {
    ...payload,
    user_id: userId,
  };
}
