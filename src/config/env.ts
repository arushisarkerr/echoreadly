import { APP_DEFAULT_URL } from "@/constants";

/**
 * Typed environment access for EchoReadly.
 *
 * Public values may be read from Client Components.
 * Server-only secrets must never be imported into browser bundles.
 *
 * Important: Next.js only inlines `NEXT_PUBLIC_*` values into the client bundle
 * when they are referenced as static property accesses
 * (`process.env.NEXT_PUBLIC_FOO`). Dynamic lookup via `process.env[name]` is
 * always undefined in the browser.
 */

function normalizeEnv(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

function requireEnv(name: string, value: string | undefined): string {
  const normalized = normalizeEnv(value);

  if (!normalized) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env.local and provide a value.`,
    );
  }

  return normalized;
}

/** Public application configuration safe for browser and server. */
export const publicEnv = {
  /** Absolute app origin used for metadata and absolute URLs. */
  get appUrl(): string {
    return normalizeEnv(process.env.NEXT_PUBLIC_APP_URL) ?? APP_DEFAULT_URL;
  },

  /** Supabase project URL. */
  get supabaseUrl(): string {
    return requireEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
  },

  /** Supabase anon / publishable key (browser-safe). */
  get supabaseAnonKey(): string {
    return requireEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  },
} as const;

/** Server-only secrets. Import only from Server Components, Route Handlers, or server utilities. */
export const serverEnv = {
  /** Supabase service role key — bypasses RLS. Never ship to the client. */
  get supabaseServiceRoleKey(): string {
    return requireEnv(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  },

  /** OpenAI API key for server-side AI / TTS features. Required at runtime. */
  get openAiApiKey(): string {
    return requireEnv("OPENAI_API_KEY", process.env.OPENAI_API_KEY);
  },

  /**
   * Mistral API key for OCR fallback (optional until OCR is wired).
   * Required when calling MistralOcrProvider.extractPdf.
   */
  get mistralApiKey(): string | undefined {
    return normalizeEnv(process.env.MISTRAL_API_KEY);
  },

  /** Gemini API key for summarization fallback when OpenAI is rate-limited. */
  get geminiApiKey(): string | undefined {
    return normalizeEnv(process.env.GEMINI_API_KEY);
  },
} as const;

export type PublicEnv = typeof publicEnv;
export type ServerEnv = typeof serverEnv;
