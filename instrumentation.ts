/**
 * Next.js instrumentation — runs once when the Node server starts.
 * Validates required environment variables for public beta.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertRequiredEnv } = await import("./src/config/validate-env");
    assertRequiredEnv();
  }
}
