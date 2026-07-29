"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/constants/routes";

import { useAuth } from "./use-auth";

type AuthGuardProps = {
  children: ReactNode;
  /**
   * Where to send unauthenticated users.
   * Defaults to /login.
   */
  redirectTo?: string;
};

/**
 * Client-side guard for authenticated UI trees.
 * The request proxy remains the primary gate for /dashboard and APIs.
 */
export function AuthGuard({
  children,
  redirectTo = ROUTES.login,
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace(redirectTo);
    }
  }, [loading, redirectTo, router, user]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-6">
        <p className="text-sm text-muted">Checking your session…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return children;
}
