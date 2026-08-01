/**
 * Factory that wires the full AI Provider Layer (Phase 1 infrastructure).
 * Does not migrate or replace existing feature provider calls.
 */

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
  /** Register a provider adapter (Phase 2+). Syncs the provider pool. */
  registerAdapter: (adapter: AiProviderAdapter) => void;
};

let singleton: AiProviderLayer | null = null;

export function createAiProviderLayer(
  config: AiProviderLayerConfig = loadAiProviderConfig(),
): AiProviderLayer {
  const providers = new ProviderRegistry(config.providers);
  const models = new ModelRegistry(config.models);
  const capabilities = new CapabilityRegistry(providers);
  const pool = new ProviderPool(providers);
  const cooldown = new CooldownManager();
  const keys = new KeyManager(config.keys, cooldown, config.cooldown);
  const health = new HealthManager();
  const circuit = new CircuitBreaker(config.circuitBreaker);
  const retry = new RetryManager(config.retry);
  const adapters = new AdapterRegistry();
  const queue = new QueueManager();
  const router = new ProviderRouter(
    config.featureRouting,
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
    config,
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

  return layer;
}

/**
 * Process-wide singleton for future feature migration.
 * Phase 1: safe to import; features must not call it for production paths yet.
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
