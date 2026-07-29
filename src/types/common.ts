/**
 * Shared foundational types used across the application.
 *
 * Domain-specific types should live next to their feature
 * (for example: `features/reader/types.ts`).
 */

/** Standard async request lifecycle used by future client hooks and server calls. */
export type AsyncStatus = "idle" | "loading" | "success" | "error";

/** Discriminated result helper for service-layer return values. */
export type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E };
