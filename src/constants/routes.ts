/**
 * Canonical application route paths.
 */

export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  authCallback: "/auth/callback",
  dashboard: "/dashboard",
  library: "/dashboard/library",
  addContent: "/dashboard/add",
  listen: "/dashboard/listen",
  collections: "/dashboard/collections",
  history: "/dashboard/history",
  exports: "/dashboard/exports",
  voices: "/dashboard/voices",
  settings: "/dashboard/settings",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/** Page and API prefixes that require an authenticated session. */
export const PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/api/documents",
  "/api/user",
  "/api/billing",
  "/api/chat",
  "/api/tts",
  "/api/summarize",
] as const;

export function isProtectedPath(pathname: string): boolean {
  if (
    pathname === "/api/billing/webhook" ||
    pathname.startsWith("/api/billing/webhook/")
  ) {
    return false;
  }

  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthPagePath(pathname: string): boolean {
  return pathname === ROUTES.login || pathname === ROUTES.signup;
}

/** Build a reader URL for a storage path (preserves existing reader routing). */
export function readerPathForStorage(storagePath: string): string {
  return `/dashboard/reader/${storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}
