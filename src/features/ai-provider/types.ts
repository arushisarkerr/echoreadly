/**
 * Shared AI Provider Layer types (Phase 1 infrastructure).
 * Features must not import provider SDKs; they will call the Orchestrator in later phases.
 */

/** Logical AI capabilities the router can select for. */
export type AiCapability =
  | "chat"
  | "summary"
  | "translation"
  | "tts"
  | "embedding"
  | "ocr"
  | "streaming"
  | "vision"
  | "audio";

/** Built-in + future provider ids. Extensible via config. */
export type AiProviderId = string;

export type AiProviderStatus =
  | "healthy"
  | "degraded"
  | "unavailable"
  | "rate_limited"
  | "quota_exceeded"
  | "auth_failed"
  | "timeout"
  | "circuit_open";

export type AiKeyStatus =
  | "healthy"
  | "cooldown"
  | "disabled"
  | "quota_exceeded"
  | "auth_failed";

export type AiModelModality = "text" | "audio" | "image" | "embedding" | "speech";

export type AiProviderDefinition = {
  id: AiProviderId;
  displayName: string;
  enabled: boolean;
  /** Lower number = higher priority when feature config is silent. */
  defaultPriority: number;
  capabilities: AiCapability[];
};

export type AiModelDefinition = {
  id: string;
  providerId: AiProviderId;
  capabilities: AiCapability[];
  modality: AiModelModality;
  displayName?: string;
  enabled?: boolean;
};

export type AiKeyRecord = {
  id: string;
  providerId: AiProviderId;
  /** Raw secret — never log. */
  secret: string;
  priority: number;
  weight: number;
  enabled: boolean;
};

export type AiFeatureRouting = {
  feature: AiCapability;
  /** Ordered provider ids (highest priority first). */
  providers: AiProviderId[];
  /** Optional preferred model per provider. */
  models?: Partial<Record<AiProviderId, string>>;
};

export type AiRetryConfig = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
};

export type AiCooldownConfig = {
  rateLimitMs: number;
  quotaMs: number;
  authFailureMs: number;
  genericFailureMs: number;
};

export type AiCircuitBreakerConfig = {
  failureThreshold: number;
  successThreshold: number;
  openMs: number;
};

export type AiProviderLayerConfig = {
  defaultTextProvider: AiProviderId;
  providers: AiProviderDefinition[];
  models: AiModelDefinition[];
  featureRouting: AiFeatureRouting[];
  keys: AiKeyRecord[];
  retry: AiRetryConfig;
  cooldown: AiCooldownConfig;
  circuitBreaker: AiCircuitBreakerConfig;
};

export type AiRequestMeta = {
  requestId?: string;
  documentId?: string;
  guestId?: string;
  feature: AiCapability;
  /** Optional override; normally chosen by router/model registry. */
  preferredProviderId?: AiProviderId;
  preferredModelId?: string;
  stream?: boolean;
};

export type AiTextRequest = AiRequestMeta & {
  feature: Extract<
    AiCapability,
    "chat" | "summary" | "translation" | "streaming"
  >;
  system?: string;
  input: string;
  temperature?: number;
  maxOutputTokens?: number;
};

export type AiTtsRequest = AiRequestMeta & {
  feature: "tts";
  text: string;
  voice?: string;
  format?: "mp3" | "wav" | "opus";
};

export type AiEmbeddingRequest = AiRequestMeta & {
  feature: "embedding";
  input: string | string[];
};

export type AiOcrRequest = AiRequestMeta & {
  feature: "ocr";
  bytes: Uint8Array;
  mimeType?: string;
  filename?: string;
};

export type AiOrchestratorRequest =
  | AiTextRequest
  | AiTtsRequest
  | AiEmbeddingRequest
  | AiOcrRequest;

export type AiAttemptContext = {
  providerId: AiProviderId;
  keyId: string;
  modelId: string;
  attempt: number;
  capability: AiCapability;
};

/** Future queue integration hook (Phase 1: interface + in-memory stub). */
export type AiQueueJobStatus =
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export type AiQueueJob = {
  id: string;
  capability: AiCapability;
  status: AiQueueJobStatus;
  priority: number;
  checkpoint?: Record<string, unknown> | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};
