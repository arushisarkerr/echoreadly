/**
 * Durable rate-limit counter store (Supabase / Postgres).
 * Used in production so limits are shared across instances.
 */

import { createServiceClient } from "@/lib/supabase/server";

export type DurableConsumeInput = {
  userKey: string;
  userLimit: number;
  ipKey: string;
  ipLimit: number;
  windowMs: number;
};

export type DurableConsumeResult =
  | {
      ok: true;
      remaining: number;
      resetAt: number;
    }
  | {
      ok: false;
      retryAfterSeconds: number;
      resetAt: number;
      limitedBy: "user" | "ip";
    };

type ConsumeRpcRow = {
  ok?: boolean;
  remaining?: number;
  reset_at?: number;
  retry_after_seconds?: number;
  limited_by?: "user" | "ip";
};

/**
 * Atomically consume one request against the shared user+IP counters.
 */
export async function consumeDurableRateLimit(
  input: DurableConsumeInput,
): Promise<DurableConsumeResult> {
  const client = createServiceClient();

  const { data, error } = await client.rpc("consume_rate_limit_pair", {
    p_user_key: input.userKey,
    p_user_limit: input.userLimit,
    p_ip_key: input.ipKey,
    p_ip_limit: input.ipLimit,
    p_window_ms: input.windowMs,
  });

  if (error) {
    throw new Error(
      `Durable rate limit RPC failed: ${error.message || "unknown error"}`,
    );
  }

  const row = (data ?? {}) as ConsumeRpcRow;

  if (row.ok === true) {
    return {
      ok: true,
      remaining: typeof row.remaining === "number" ? row.remaining : 0,
      resetAt:
        typeof row.reset_at === "number"
          ? row.reset_at
          : Date.now() + input.windowMs,
    };
  }

  if (row.ok === false && (row.limited_by === "user" || row.limited_by === "ip")) {
    return {
      ok: false,
      limitedBy: row.limited_by,
      resetAt:
        typeof row.reset_at === "number"
          ? row.reset_at
          : Date.now() + input.windowMs,
      retryAfterSeconds:
        typeof row.retry_after_seconds === "number" &&
        row.retry_after_seconds >= 1
          ? row.retry_after_seconds
          : 1,
    };
  }

  throw new Error("Durable rate limit RPC returned an unexpected payload.");
}
