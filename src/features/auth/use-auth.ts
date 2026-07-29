"use client";

import { useAuthContext } from "./auth-provider";

/**
 * Convenience hook for the current auth session.
 */
export function useAuth() {
  return useAuthContext();
}
