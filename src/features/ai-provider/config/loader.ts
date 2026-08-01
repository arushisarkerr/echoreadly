/**
 * Configuration loader for the AI Provider Layer.
 * Secrets stay in environment variables — never persisted to the database.
 *
 * Key env patterns (unlimited):
 *   OPENAI_KEY_1, OPENAI_KEY_2, ...
 *   GEMINI_KEY_1, ...
 *   MISTRAL_KEY_1, ...
 *   CLAUDE_KEY_1, ...
 *   GROK_KEY_1, ...
 *   KIMI_KEY_1, ...
 *
 * Compatibility aliases (treated as priority-1 keys when numbered keys absent):
 *   OPENAI_API_KEY, GEMINI_API_KEY, MISTRAL_API_KEY, ANTHROPIC_API_KEY
 *
 * Optional overrides:
 *   AI_PROVIDER                 default text provider id
 *   AI_FEATURE_ROUTING_JSON     JSON array of AiFeatureRouting
 *   AI_RETRY_MAX_ATTEMPTS, AI_RETRY_BASE_DELAY_MS, AI_RETRY_MAX_DELAY_MS
 */

import {
  buildEmptyLayerConfig,
  DEFAULT_FEATURE_ROUTING,
} from "./defaults";
import type {
  AiCapability,
  AiFeatureRouting,
  AiKeyRecord,
  AiProviderId,
  AiProviderLayerConfig,
} from "../types";

const NUMBERED_KEY_PATTERN =
  /^(OPENAI|GEMINI|MISTRAL|CLAUDE|GROK|KIMI|ANTHROPIC|XAI|TESSERACT)_KEY_(\d+)$/i;

const PROVIDER_ALIAS: Record<string, AiProviderId> = {
  OPENAI: "openai",
  GEMINI: "gemini",
  MISTRAL: "mistral",
  CLAUDE: "claude",
  ANTHROPIC: "claude",
  GROK: "grok",
  XAI: "grok",
  KIMI: "kimi",
  TESSERACT: "tesseract",
};

const LEGACY_SINGLE_KEYS: Array<{ env: string; providerId: AiProviderId }> = [
  { env: "OPENAI_API_KEY", providerId: "openai" },
  { env: "GEMINI_API_KEY", providerId: "gemini" },
  { env: "MISTRAL_API_KEY", providerId: "mistral" },
  { env: "ANTHROPIC_API_KEY", providerId: "claude" },
  { env: "CLAUDE_API_KEY", providerId: "claude" },
  { env: "GROK_API_KEY", providerId: "grok" },
  { env: "XAI_API_KEY", providerId: "grok" },
  { env: "KIMI_API_KEY", providerId: "kimi" },
];

function normalizeEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function loadNumberedKeys(env: NodeJS.ProcessEnv): AiKeyRecord[] {
  const keys: AiKeyRecord[] = [];

  for (const [name, raw] of Object.entries(env)) {
    const match = NUMBERED_KEY_PATTERN.exec(name);
    if (!match) {
      continue;
    }
    const secret = normalizeEnv(raw);
    if (!secret) {
      continue;
    }
    const prefix = match[1].toUpperCase();
    const index = Number.parseInt(match[2], 10);
    const providerId = PROVIDER_ALIAS[prefix];
    if (!providerId) {
      continue;
    }
    keys.push({
      id: `${providerId}:key_${index}`,
      providerId,
      secret,
      priority: index,
      weight: 1,
      enabled: true,
    });
  }

  return keys.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}

function loadLegacyKeys(
  env: NodeJS.ProcessEnv,
  existing: AiKeyRecord[],
): AiKeyRecord[] {
  const haveProvider = new Set(existing.map((key) => key.providerId));
  const extras: AiKeyRecord[] = [];

  for (const entry of LEGACY_SINGLE_KEYS) {
    if (haveProvider.has(entry.providerId)) {
      continue;
    }
    const secret = normalizeEnv(env[entry.env]);
    if (!secret) {
      continue;
    }
    extras.push({
      id: `${entry.providerId}:key_1`,
      providerId: entry.providerId,
      secret,
      priority: 1,
      weight: 1,
      enabled: true,
    });
    haveProvider.add(entry.providerId);
  }

  return [...existing, ...extras];
}

function parseFeatureRouting(raw: string | undefined): AiFeatureRouting[] | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }
    const out: AiFeatureRouting[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") {
        continue;
      }
      const feature = (row as { feature?: unknown }).feature;
      const providers = (row as { providers?: unknown }).providers;
      if (typeof feature !== "string" || !Array.isArray(providers)) {
        continue;
      }
      out.push({
        feature: feature as AiCapability,
        providers: providers.filter((id): id is string => typeof id === "string"),
        models:
          typeof (row as { models?: unknown }).models === "object" &&
          (row as { models?: unknown }).models != null
            ? ((row as { models: AiFeatureRouting["models"] }).models ?? undefined)
            : undefined,
      });
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Load Provider Layer config from process.env (or an injected env map for tests).
 * Does not mutate global state; callers wire registries from the result.
 */
export function loadAiProviderConfig(
  env: NodeJS.ProcessEnv = process.env,
): AiProviderLayerConfig {
  const base = buildEmptyLayerConfig();
  const numbered = loadNumberedKeys(env);
  const keys = loadLegacyKeys(env, numbered);

  const defaultTextProvider =
    normalizeEnv(env.AI_PROVIDER)?.toLowerCase() === "google"
      ? "gemini"
      : normalizeEnv(env.AI_PROVIDER)?.toLowerCase() || base.defaultTextProvider;

  const featureRouting =
    parseFeatureRouting(env.AI_FEATURE_ROUTING_JSON) ?? DEFAULT_FEATURE_ROUTING;

  return {
    ...base,
    defaultTextProvider,
    featureRouting,
    keys,
    retry: {
      maxAttempts: parsePositiveInt(
        env.AI_RETRY_MAX_ATTEMPTS,
        base.retry.maxAttempts,
      ),
      baseDelayMs: parsePositiveInt(
        env.AI_RETRY_BASE_DELAY_MS,
        base.retry.baseDelayMs,
      ),
      maxDelayMs: parsePositiveInt(
        env.AI_RETRY_MAX_DELAY_MS,
        base.retry.maxDelayMs,
      ),
      jitter: env.AI_RETRY_JITTER === "0" ? false : base.retry.jitter,
    },
  };
}
