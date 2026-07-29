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
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/** Page and API prefixes that require an authenticated session. */
export const PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/api/documents",
  "/api/chat",
  "/api/tts",
  "/api/summarize",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthPagePath(pathname: string): boolean {
  return pathname === ROUTES.login || pathname === ROUTES.signup;
}
