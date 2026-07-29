/**
 * Validate required environment variables at process startup.
 */

const REQUIRED_PUBLIC = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const REQUIRED_SERVER = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
] as const;

function isPresent(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function missingVars(names: readonly string[]): string[] {
  return names.filter((name) => !isPresent(process.env[name]));
}

function isProductionBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  );
}

/**
 * Assert all required env vars are set.
 * During `next build`, missing secrets warn instead of failing so CI can compile
 * without production credentials; runtime (dev/start) still fails hard.
 */
export function assertRequiredEnv(): void {
  const missing = [
    ...missingVars(REQUIRED_PUBLIC),
    ...missingVars(REQUIRED_SERVER),
  ];

  if (missing.length === 0) {
    return;
  }

  const message = `Missing required environment variable(s): ${missing.join(", ")}. Copy .env.example to .env.local and provide values.`;

  if (isProductionBuildPhase()) {
    console.warn(`[env] ${message}`);
    return;
  }

  throw new Error(message);
}

export const REQUIRED_ENV_VARS = [
  ...REQUIRED_PUBLIC,
  ...REQUIRED_SERVER,
] as const;
