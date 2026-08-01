/**
 * AI Provider Layer — Phase 1 infrastructure public surface.
 *
 * Features must not import provider SDKs.
 * Feature migration happens in later phases; existing OpenAI/Gemini paths remain active.
 */

export type {
  AiCapability,
  AiProviderId,
  AiProviderStatus,
  AiKeyStatus,
  AiModelModality,
  AiProviderDefinition,
  AiModelDefinition,
  AiKeyRecord,
  AiFeatureRouting,
  AiRetryConfig,
  AiCooldownConfig,
  AiCircuitBreakerConfig,
  AiProviderLayerConfig,
  AiRequestMeta,
  AiTextRequest,
  AiTtsRequest,
  AiEmbeddingRequest,
  AiOcrRequest,
  AiOrchestratorRequest,
  AiAttemptContext,
  AiQueueJob,
  AiQueueJobStatus,
} from "./types";

export {
  AiProviderError,
  isAiProviderError,
  mapProviderFailure,
  type AiErrorCode,
} from "./errors";

export type {
  AiUsageStats,
  AiTextResponse,
  AiTtsResponse,
  AiEmbeddingResponse,
  AiOcrResponse,
  AiOrchestratorResponse,
  AiStreamChunk,
} from "./responses";

export { loadAiProviderConfig } from "./config/loader";
export {
  ALL_CAPABILITIES,
  DEFAULT_PROVIDERS,
  DEFAULT_MODELS,
  DEFAULT_FEATURE_ROUTING,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_COOLDOWN_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  buildEmptyLayerConfig,
} from "./config/defaults";

export { ProviderRegistry } from "./registry/provider-registry";
export { ModelRegistry } from "./registry/model-registry";
export { CapabilityRegistry } from "./registry/capability-registry";
export { ProviderPool } from "./pool/provider-pool";
export { KeyManager } from "./keys/key-manager";
export { HealthManager } from "./health/health-manager";
export { CooldownManager } from "./cooldown/cooldown-manager";
export { CircuitBreaker } from "./circuit/circuit-breaker";
export { RetryManager } from "./retry/retry-manager";
export { ProviderRouter } from "./router/provider-router";
export { QueueManager } from "./queue/queue-manager";
export { AiOrchestrator } from "./orchestrator";
export {
  AdapterRegistry,
  type AiProviderAdapter,
  type AdapterExecutionContext,
} from "./adapters/types";
export {
  createAiProviderLayer,
  getAiProviderLayer,
  resetAiProviderLayerForTests,
  type AiProviderLayer,
} from "./create-layer";
