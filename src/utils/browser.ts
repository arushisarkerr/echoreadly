/**
 * Browser-only runtime helpers.
 * Import these only from Client Components or other browser-bound modules.
 */

/** True when executing in a browser environment. */
export function isBrowserRuntime(): boolean {
  return typeof window !== "undefined";
}

/**
 * Guard for browser-only modules. Throws if evaluated on the server.
 */
export function assertBrowserRuntime(context = "This module"): void {
  if (!isBrowserRuntime()) {
    throw new Error(`${context} can only run in the browser.`);
  }
}
