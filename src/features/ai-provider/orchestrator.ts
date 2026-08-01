import { AiProviderError, isAiProviderError } from "./errors";
import type {
  AiOrchestratorResponse,
  AiTextResponse,
  AiTtsResponse,
  AiEmbeddingResponse,
  AiOcrResponse,
} from "./responses";
import type { AdapterRegistry } from "./adapters/types";
import type { CircuitBreaker } from "./circuit/circuit-breaker";
import type { HealthManager } from "./health/health-manager";
import type { KeyManager } from "./keys/key-manager";
import type { ProviderRouter } from "./router/provider-router";
import type { RetryManager } from "./retry/retry-manager";
import type { QueueManager } from "./queue/queue-manager";
import type {
  AiCapability,
  AiEmbeddingRequest,
  AiOcrRequest,
  AiOrchestratorRequest,
  AiTextRequest,
  AiTtsRequest,
} from "./types";

/**
 * Single public entry point for all AI capabilities (Phase 1 infrastructure).
 * Features are not wired yet — adapters must be registered in later phases.
 */
export class AiOrchestrator {
  constructor(
    private readonly router: ProviderRouter,
    private readonly keys: KeyManager,
    private readonly health: HealthManager,
    private readonly circuit: CircuitBreaker,
    private readonly retry: RetryManager,
    private readonly adapters: AdapterRegistry,
    private readonly queue: QueueManager,
  ) {}

  /** Expose queue for future long-running jobs without leaking other internals. */
  get jobs(): QueueManager {
    return this.queue;
  }

  async execute(request: AiOrchestratorRequest): Promise<AiOrchestratorResponse> {
    this.validate(request);

    const candidates = this.router.requireRoute(request.feature, {
      preferredProviderId: request.preferredProviderId,
      preferredModelId: request.preferredModelId,
      requireAdapter: true,
    });

    let lastError: AiProviderError | null = null;
    let attempts = 0;

    for (const candidate of candidates) {
      if (!this.circuit.canRequest(candidate.providerId)) {
        continue;
      }

      const adapter = this.adapters.get(candidate.providerId);
      if (!adapter) {
        continue;
      }

      const keySelection = this.keys.selectKey(candidate.providerId);
      if (!keySelection) {
        lastError = new AiProviderError({
          code: "no_healthy_key",
          message: `No healthy API key for provider "${candidate.providerId}".`,
          providerId: candidate.providerId,
          retryable: true,
        });
        continue;
      }

      for (let attempt = 1; attempt <= this.retry.maxAttempts; attempt += 1) {
        attempts += 1;
        const started = Date.now();
        try {
          const result = await this.dispatch(request, {
            providerId: candidate.providerId,
            keyId: keySelection.key.id,
            modelId: candidate.model.id,
            attempt,
            capability: request.feature,
            apiKey: keySelection.key.secret,
            adapter,
          });

          const latencyMs = Date.now() - started;
          this.keys.recordSuccess(keySelection.key.id);
          this.health.recordSuccess(candidate.providerId, latencyMs);
          this.circuit.recordSuccess(candidate.providerId);

          return {
            ...result,
            attempts,
            usage: { ...result.usage, latencyMs },
          } as AiOrchestratorResponse;
        } catch (cause) {
          const mapped = isAiProviderError(cause)
            ? cause
            : new AiProviderError({
                code: "internal",
                message: "AI provider adapter failed.",
                providerId: candidate.providerId,
                keyId: keySelection.key.id,
                retryable: true,
                cause,
              });

          lastError = mapped;
          this.recordFailure(candidate.providerId, keySelection.key.id, mapped);

          const decision = this.retry.decide({
            attempt,
            retryable: mapped.retryable,
          });
          if (decision.retry) {
            await this.retry.wait(decision.delayMs);
            continue;
          }
          break;
        }
      }
      // try next provider (fallback)
    }

    throw (
      lastError ??
      new AiProviderError({
        code: "retry_exhausted",
        message: `AI request failed for capability "${request.feature}".`,
        retryable: false,
      })
    );
  }

  /**
   * Phase 1 helper: plan a route without executing (for diagnostics / future UI).
   */
  plan(capability: AiCapability, preferredProviderId?: string) {
    return this.router.route(capability, {
      preferredProviderId,
      requireAdapter: false,
    });
  }

  private validate(request: AiOrchestratorRequest): void {
    if (!request.feature) {
      throw new AiProviderError({
        code: "validation_failed",
        message: "AI request is missing a feature/capability.",
      });
    }

    if (request.feature === "tts") {
      if (!request.text?.trim()) {
        throw new AiProviderError({
          code: "validation_failed",
          message: "TTS request requires non-empty text.",
        });
      }
      return;
    }

    if (request.feature === "embedding") {
      const input = request.input;
      const empty =
        typeof input === "string"
          ? !input.trim()
          : !Array.isArray(input) || input.length === 0;
      if (empty) {
        throw new AiProviderError({
          code: "validation_failed",
          message: "Embedding request requires input.",
        });
      }
      return;
    }

    if (request.feature === "ocr") {
      if (!request.bytes || request.bytes.byteLength === 0) {
        throw new AiProviderError({
          code: "validation_failed",
          message: "OCR request requires image/document bytes.",
        });
      }
      return;
    }

    if (!("input" in request) || !request.input?.trim()) {
      throw new AiProviderError({
        code: "validation_failed",
        message: "Text AI request requires non-empty input.",
      });
    }
  }

  private async dispatch(
    request: AiOrchestratorRequest,
    context: {
      providerId: string;
      keyId: string;
      modelId: string;
      attempt: number;
      capability: AiCapability;
      apiKey: string;
      adapter: NonNullable<ReturnType<AdapterRegistry["get"]>>;
    },
  ): Promise<Omit<AiOrchestratorResponse, "attempts">> {
    const attemptContext = {
      providerId: context.providerId,
      keyId: context.keyId,
      modelId: context.modelId,
      attempt: context.attempt,
      capability: context.capability,
      apiKey: context.apiKey,
    };

    if (
      request.feature === "chat" ||
      request.feature === "summary" ||
      request.feature === "translation" ||
      request.feature === "streaming"
    ) {
      if (!context.adapter.generateText) {
        throw new AiProviderError({
          code: "unsupported_capability",
          message: `Provider "${context.providerId}" has no text adapter.`,
          providerId: context.providerId,
        });
      }
      const result = await context.adapter.generateText(
        request as AiTextRequest,
        attemptContext,
      );
      return result as AiTextResponse;
    }

    if (request.feature === "tts") {
      if (!context.adapter.synthesizeSpeech) {
        throw new AiProviderError({
          code: "unsupported_capability",
          message: `Provider "${context.providerId}" has no TTS adapter.`,
          providerId: context.providerId,
        });
      }
      return (await context.adapter.synthesizeSpeech(
        request as AiTtsRequest,
        attemptContext,
      )) as AiTtsResponse;
    }

    if (request.feature === "embedding") {
      if (!context.adapter.embed) {
        throw new AiProviderError({
          code: "unsupported_capability",
          message: `Provider "${context.providerId}" has no embedding adapter.`,
          providerId: context.providerId,
        });
      }
      return (await context.adapter.embed(
        request as AiEmbeddingRequest,
        attemptContext,
      )) as AiEmbeddingResponse;
    }

    if (request.feature === "ocr") {
      if (!context.adapter.ocr) {
        throw new AiProviderError({
          code: "unsupported_capability",
          message: `Provider "${context.providerId}" has no OCR adapter.`,
          providerId: context.providerId,
        });
      }
      return (await context.adapter.ocr(
        request as AiOcrRequest,
        attemptContext,
      )) as AiOcrResponse;
    }

    throw new AiProviderError({
      code: "not_implemented",
      message: `Capability "${(request as AiOrchestratorRequest).feature}" is not implemented in the orchestrator yet.`,
    });
  }

  private recordFailure(
    providerId: string,
    keyId: string,
    error: AiProviderError,
  ): void {
    if (error.code === "rate_limited") {
      this.keys.recordFailure(keyId, "rate_limit");
      this.health.recordFailure(providerId, "rate_limited", error.message);
    } else if (error.code === "quota_exceeded") {
      this.keys.recordFailure(keyId, "quota");
      this.health.recordFailure(providerId, "quota_exceeded", error.message);
    } else if (error.code === "auth_failed") {
      this.keys.recordFailure(keyId, "auth");
      this.health.recordFailure(providerId, "auth_failed", error.message);
    } else if (error.code === "timeout") {
      this.keys.recordFailure(keyId, "generic");
      this.health.recordFailure(providerId, "timeout", error.message);
    } else {
      this.keys.recordFailure(keyId, "generic");
      this.health.recordFailure(providerId, "unavailable", error.message);
    }
    this.circuit.recordFailure(providerId);
    if (!this.circuit.canRequest(providerId)) {
      this.health.markCircuitOpen(providerId);
    }
  }
}
