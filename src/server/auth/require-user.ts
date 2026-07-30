/**
 * Require an authenticated user for server routes and layouts.
 */

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

import { getUser } from "./get-user";

export type RequireUserResult =
  | { ok: true; user: User }
  | { ok: false; error: string; status: 401 };

/**
 * API-friendly auth gate. Returns 401 payload when the session is missing.
 */
export async function requireUser(): Promise<RequireUserResult> {
  const result = await getUser();

  if (!result.ok || !result.user) {
    return {
      ok: false,
      error: "Authentication required.",
      status: 401,
    };
  }

  return { ok: true, user: result.user };
}

/**
 * Server Component / page gate. Redirects unauthenticated visitors to login.
 */
export async function requireUserOrRedirect(
  nextPath = ROUTES.library,
): Promise<User> {
  const result = await getUser();

  if (!result.ok || !result.user) {
    const search = new URLSearchParams({ next: nextPath });
    redirect(`${ROUTES.login}?${search.toString()}`);
  }

  return result.user;
}
