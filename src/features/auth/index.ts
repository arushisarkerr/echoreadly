/**
 * Authentication feature module (sign-in, sign-up, session UX).
 */

/**
 * Authentication feature module (sign-in, sign-up, session UX).
 *
 * Server-only ownership helpers live in `./ownership` and must be imported
 * directly from that path (not this barrel) to avoid shipping `next/headers`
 * into Client Components.
 */

export { AccountMenu } from "./account-menu";
export { AuthGuard } from "./auth-guard";
export { AuthProvider, useAuthContext } from "./auth-provider";
export { LoginForm } from "./login-form";
export { SignupForm } from "./signup-form";
export { useAuth } from "./use-auth";
