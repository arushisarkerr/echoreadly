/**
 * Server-only runtime helpers.
 * Import these only from Server Components, Route Handlers, Server Actions, or `src/server`.
 */

/** True when executing in a Node / Edge server runtime (not the browser). */
export function isServerRuntime(): boolean {
  return typeof window === "undefined";
}

/**
 * Guard for server-only modules. Throws if imported into a browser bundle path.
 */
export function assertServerRuntime(context = "This module"): void {
  if (!isServerRuntime()) {
    throw new Error(`${context} can only run on the server.`);
  }
}
