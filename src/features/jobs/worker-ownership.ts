/**
 * Build an OwnershipContext for background workers (service role + explicit user).
 * Always scope queries by job.user_id — never trust payload user ids alone.
 */

import type { User } from "@supabase/supabase-js";

import type { OwnershipContext } from "@/features/auth/ownership";
import { createServiceClient } from "@/lib/supabase/server";

export function buildWorkerOwnership(userId: string): OwnershipContext {
  const stubUser = {
    id: userId,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date(0).toISOString(),
  } as User;

  return {
    userId,
    user: stubUser,
    client: createServiceClient(),
  };
}
