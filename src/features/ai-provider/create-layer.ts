/**
 * Factory that wires the AI Provider Layer.
 * Phase 2 registers Chat adapters (OpenAI + Gemini).
 */

import { createPhase2ChatAdapters } from "./adapters/register-chat";
import { AdapterRegistry } from "./adapters/types";
import { CircuitBreaker } from "./circuit/circuit-breaker";
import { loadAiProviderConfig } from "./config/loader";
import { CooldownManager } from "./cooldown/cooldown-manager";
import { HealthManager } from "./health/health-manager";
import { KeyManager } from "./keys/key-manager";
import { AiOrchestrator } from "./orchestrator";
import { ProviderPool } from "./pool/provider-pool";
import { QueueManager } from "./queue/queue-manager";
import { CapabilityRegistry } from "./registry/capability-registry";
import { ModelRegistry } from "./registry/model-registry";
import { ProviderRegistry } from "./registry/provider-registry";
import { RetryManager } from "./retry/retry-manager";
import { ProviderRouter } from "./router/provider-router";
import type { AiProviderAdapter } from "./adapters/types";
import type { AiProviderLayerConfig } from "./types";

export type AiProviderLayer = {
  config: AiProviderLayerConfig;
  orchestrator: AiOrchestrator;
  providers: ProviderRegistry;
  models: ModelRegistry;
  capabilities: CapabilityRegistry;
  pool: ProviderPool;
  keys: KeyManager;
  health: HealthManager;
  cooldown: CooldownManager;
  circuit: CircuitBreaker;
  retry: RetryManager;
  router: ProviderRouter;
  adapters: AdapterRegistry;
  queue: QueueManager;
  /** Register a provider adapter. Syncs the provider pool. */
  registerAdapter: (adapter: AiProviderAdapter) => void;
};

let singleton: AiProviderLayer | null = null;

function applyTextModelEnvOverrides(
  config: AiProviderLayerConfig,
  env: NodeJS.ProcessEnv = process.env,
): AiProviderLayerConfig {
  const openaiTextModel = env.OPENAI_AI_MODEL?.trim() || env.OPENAI_MODEL?.trim();
  const geminiTextModel =
    env.GEMINI_CHAT_MODEL?.trim() ||
    env.GEMINI_SUMMARY_MODEL?.trim() ||
    env.GEMINI_MODEL?.trim();

  const featureRouting = config.featureRouting.map((row) => {
    if (row.feature !== "chat" && row.feature !== "summary") {
      return row;
    }
    return {
      ...row,
      models: {
        ...row.models,
        ...(openaiTextModel ? { openai: openaiTextModel } : {}),
        ...(geminiTextModel ? { gemini: geminiTextModel } : {}),
      },
    };
  });

  const models = [...config.models];
  if (
    openaiTextModel &&
    !models.some(
      (model) => model.providerId === "openai" && model.id === openaiTextModel,
    )
  ) {
    models.push({
      id: openaiTextModel,
      providerId: "openai",
      capabilities: ["chat", "summary", "translation", "streaming"],
      modality: "text",
      displayName: openaiTextModel,
    });
  }
  if (
    geminiTextModel &&
    !models.some(
      (model) => model.providerId === "gemini" && model.id === geminiTextModel,
    )
  ) {
    models.push({
      id: geminiTextModel,
      providerId: "gemini",
      capabilities: ["chat", "summary", "translation", "streaming", "vision"],
      modality: "text",
      displayName: geminiTextModel,
    });
  }

  return { ...config, featureRouting, models };
}

export function createAiProviderLayer(
  config: AiProviderLayerConfig = loadAiProviderConfig(),
): AiProviderLayer {
  const resolved = applyTextModelEnvOverrides(config);
  const providers = new ProviderRegistry(resolved.providers);
  const models = new ModelRegistry(resolved.models);
  const capabilities = new CapabilityRegistry(providers);
  const pool = new ProviderPool(providers);
  const cooldown = new CooldownManager();
  const keys = new KeyManager(resolved.keys, cooldown, resolved.cooldown);
  const health = new HealthManager();
  const circuit = new CircuitBreaker(resolved.circuitBreaker);
  const retry = new RetryManager(resolved.retry);
  const adapters = new AdapterRegistry();
  const queue = new QueueManager();
  const router = new ProviderRouter(
    resolved.featureRouting,
    providers,
    models,
    capabilities,
    health,
    circuit,
    pool,
  );
  const orchestrator = new AiOrchestrator(
    router,
    keys,
    health,
    circuit,
    retry,
    adapters,
    queue,
  );

  const layer: AiProviderLayer = {
    config: resolved,
    orchestrator,
    providers,
    models,
    capabilities,
    pool,
    keys,
    health,
    cooldown,
    circuit,
    retry,
    router,
    adapters,
    queue,
    registerAdapter(adapter) {
      adapters.register(adapter);
      pool.markAdapterRegistered(adapter.providerId, true);
    },
  };

  for (const adapter of createPhase2ChatAdapters()) {
    layer.registerAdapter(adapter);
  }

  return layer;
}

/**
 * Process-wide singleton used by migrated features (Chat in Phase 2).
 */
export function getAiProviderLayer(): AiProviderLayer {
  if (!singleton) {
    singleton = createAiProviderLayer();
  }
  return singleton;
}

/** Test helper — reset singleton between tests. */
export function resetAiProviderLayerForTests(): void {
  singleton = null;
}
