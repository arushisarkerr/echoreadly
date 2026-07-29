/**
 * Supabase client entry points.
 *
 * - `client`  — browser / Client Components
 * - `server`  — Server Components, Route Handlers, Server Actions
 * - `middleware` — request proxy session helper (auth deferred)
 */

export { createClient as createBrowserClient } from "./client";
export { createClient as createServerClient, createServiceClient } from "./server";
export { updateSession } from "./middleware";
