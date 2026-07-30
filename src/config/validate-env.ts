/**
 * Validate required environment variables at process startup.
 */

const REQUIRED_PUBLIC = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

/** Required for production metadata, OAuth redirects, and absolute links. */
const REQUIRED_PUBLIC_PRODUCTION = ["NEXT_PUBLIC_APP_URL"] as const;

const REQUIRED_SERVER = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
] as const;

/** Auth vars required to gate protected routes (Supabase browser/SSR client). */
export const REQUIRED_AUTH_PUBLIC_ENV = REQUIRED_PUBLIC;

function isPresent(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function missingVars(names: readonly string[]): string[] {
  return names.filter((name) => !isPresent(process.env[name]));
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isProductionBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  );
}

/**
 * True when the Node/Edge process is running a production deployment.
 * Build-time compilation is excluded so CI can assemble without secrets.
 */
export function isProductionRuntime(): boolean {
  if (isProductionBuildPhase()) {
    return false;
  }
  return process.env.NODE_ENV === "production";
}

export type AuthPublicEnvStatus =
  | { configured: true; supabaseUrl: string; supabaseAnonKey: string }
  | { configured: false; missing: string[]; invalid: string[] };

/**
 * Detect missing or invalid Supabase public auth configuration.
 * Does not throw — callers decide fail-closed vs fail-open policy.
 */
export function getAuthPublicEnvStatus(): AuthPublicEnvStatus {
  const urlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const keyRaw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const missing: string[] = [];
  const invalid: string[] = [];

  if (!isPresent(urlRaw)) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  } else if (!isValidHttpUrl(urlRaw!)) {
    invalid.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!isPresent(keyRaw)) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (missing.length > 0 || invalid.length > 0) {
    return { configured: false, missing, invalid };
  }

  return {
    configured: true,
    supabaseUrl: urlRaw!.trim(),
    supabaseAnonKey: keyRaw!.trim(),
  };
}

export function isAuthPublicEnvConfigured(): boolean {
  return getAuthPublicEnvStatus().configured;
}

/**
 * Assert all required env vars are set.
 * During `next build`, missing secrets warn instead of failing so CI can compile
 * without production credentials; runtime (dev/start) still fails hard.
 */
export function assertRequiredEnv(): void {
  const productionRuntime = isProductionRuntime();
  const missing = [
    ...missingVars(REQUIRED_PUBLIC),
    ...missingVars(REQUIRED_SERVER),
    ...(productionRuntime ? missingVars(REQUIRED_PUBLIC_PRODUCTION) : []),
  ];
  const authStatus = getAuthPublicEnvStatus();
  const invalid =
    authStatus.configured === false ? [...authStatus.invalid] : [];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (isPresent(appUrl) && !isValidHttpUrl(appUrl!)) {
    invalid.push("NEXT_PUBLIC_APP_URL");
  } else if (
    productionRuntime &&
    isPresent(appUrl) &&
    !appUrl!.trim().toLowerCase().startsWith("https://")
  ) {
    invalid.push("NEXT_PUBLIC_APP_URL (must be https in production)");
  }

  if (
    productionRuntime &&
    isPresent(process.env.BILLING_FORCE_PLAN)
  ) {
    console.error(
      "[env] BILLING_FORCE_PLAN is set in production and will be ignored.",
    );
  }

  if (missing.length === 0 && invalid.length === 0) {
    return;
  }

  const parts: string[] = [];
  if (missing.length > 0) {
    parts.push(`Missing required environment variable(s): ${missing.join(", ")}`);
  }
  if (invalid.length > 0) {
    parts.push(`Invalid environment variable(s): ${invalid.join(", ")}`);
  }
  const message = `${parts.join(". ")}. Copy .env.example to .env.local and provide values.`;

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
