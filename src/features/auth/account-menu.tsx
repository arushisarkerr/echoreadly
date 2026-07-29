"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { ROUTES } from "@/constants/routes";

import { useAuth } from "./use-auth";

function getUserInitial(email: string | undefined, name: string | undefined) {
  const source = name?.trim() || email?.trim() || "U";
  return source.charAt(0).toUpperCase();
}

/**
 * Avatar + account menu for authenticated chrome.
 * Shows Login / Create Account when signed out.
 */
export function AccountMenu() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (loading) {
    return (
      <div className="size-9 animate-pulse rounded-full border border-border bg-surface-muted" />
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href={ROUTES.login}
          className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          Login
        </Link>
        <Link
          href={ROUTES.signup}
          className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-3.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Create Account
        </Link>
      </div>
    );
  }

  const email = user.email ?? "";
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : undefined;
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata?.picture === "string"
        ? user.user_metadata.picture
        : null;
  const initial = getUserInitial(email, fullName);

  async function handleSignOut() {
    setSigningOut(true);
    const result = await signOut();
    setOpen(false);
    setSigningOut(false);

    if (result.error) {
      return;
    }

    router.replace(ROUTES.login);
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex size-9 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-xs font-semibold tracking-tight text-foreground transition-colors hover:bg-surface"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Account menu"
        onClick={() => setOpen((current) => !current)}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="size-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          initial
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border border-border bg-background shadow-md"
        >
          <div className="border-b border-border px-3 py-3">
            <p className="truncate text-sm font-medium text-foreground">
              {fullName || "Account"}
            </p>
            <p className="truncate text-xs text-muted">{email}</p>
          </div>
          <div className="p-1">
            <Link
              href={ROUTES.dashboard}
              role="menuitem"
              className="block rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-muted"
              onClick={() => setOpen(false)}
            >
              Dashboard
            </Link>
            <button
              type="button"
              role="menuitem"
              disabled={signingOut}
              className="flex w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-muted disabled:opacity-60"
              onClick={() => {
                void handleSignOut();
              }}
            >
              {signingOut ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
