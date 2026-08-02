import { AiProviderError } from "../errors";
import type { CapabilityRegistry } from "../registry/capability-registry";
import type { ModelRegistry } from "../registry/model-registry";
import type { ProviderRegistry } from "../registry/provider-registry";
import type { CircuitBreaker } from "../circuit/circuit-breaker";
import type { HealthManager } from "../health/health-manager";
import type { ProviderPool } from "../pool/provider-pool";
import type {
  AiCapability,
  AiFeatureRouting,
  AiModelDefinition,
  AiProviderId,
} from "../types";

export type RouteCandidate = {
  providerId: AiProviderId;
  model: AiModelDefinition;
  priorityIndex: number;
};

/**
 * Selects ordered provider/model candidates for a capability from configuration.
 */
export class ProviderRouter {
  private routing: AiFeatureRouting[];

  constructor(
    routing: AiFeatureRouting[],
    private readonly providers: ProviderRegistry,
    private readonly models: ModelRegistry,
    private readonly capabilities: CapabilityRegistry,
    private readonly health: HealthManager,
    private readonly circuit: CircuitBreaker,
    private readonly pool: ProviderPool,
  ) {
    this.routing = routing.map((row) => ({
      ...row,
      providers: row.providers.slice(),
      models: row.models ? { ...row.models } : undefined,
    }));
  }

  updateRouting(routing: AiFeatureRouting[]): void {
    this.routing = routing.map((row) => ({
      ...row,
      providers: row.providers.slice(),
      models: row.models ? { ...row.models } : undefined,
    }));
  }

  /** Configured provider ids for a capability (routing table or capability fallback). */
  configuredProviders(capability: AiCapability): AiProviderId[] {
    return (
      this.routing.find((row) => row.feature === capability)?.providers.slice() ??
      this.capabilities.providersFor(capability)
    );
  }

  /**
   * TEMPORARY debug probe — mirrors route() skip checks without changing selection.
   */
  probeProvider(
    providerId: AiProviderId,
    capability: AiCapability,
    options: {
      preferredModelId?: string;
      requireAdapter?: boolean;
      hasApiKey: boolean;
      hasTtsAdapter: boolean;
    },
  ): {
    provider: AiProviderId;
    capability: AiCapability;
    enabled: boolean;
    healthy: boolean;
    hasApiKey: boolean;
    hasTtsAdapter: boolean;
    model: string | null;
    skipReason: string | null;
  } {
    const requireAdapter = options.requireAdapter ?? false;
    const provider = this.providers.get(providerId);
    const enabled = Boolean(provider?.enabled);
    const advertises = this.capabilities.advertises(providerId, capability);
    const healthy = this.health.isUsable(providerId);
    const circuitOk = this.circuit.canRequest(providerId);
    const hasPoolAdapter = this.pool.hasAdapter(providerId);
    const preferredModel =
      options.preferredModelId ||
      this.routing.find((row) => row.feature === capability)?.models?.[
        providerId
      ];
    const model = this.models.resolve(providerId, capability, preferredModel);

    // Exact same skip order as route() — do not invent new selection rules.
    let skipReason: string | null = null;
    if (!advertises) {
      skipReason = enabled
        ? `does not advertise capability "${capability}"`
        : `disabled or missing (advertises()=false; check OPENAI_ENABLED)`;
    } else if (!enabled) {
      skipReason = "provider.enabled=false";
    } else if (requireAdapter && !hasPoolAdapter) {
      skipReason = "no adapter registered in provider pool";
    } else if (!circuitOk) {
      skipReason = "circuit breaker open";
    } else if (!healthy) {
      skipReason = `unhealthy (status=${this.health.getStatus(providerId)})`;
    } else if (!model) {
      skipReason = `no model for capability "${capability}" (preferred=${preferredModel ?? "none"})`;
    } else if (!options.hasApiKey) {
      skipReason =
        "passes route() but no enabled API key loaded for provider";
    } else if (capability === "tts" && !options.hasTtsAdapter) {
      skipReason =
        "passes route() but adapter has no synthesizeSpeech method";
    }

    return {
      provider: providerId,
      capability,
      enabled,
      healthy,
      hasApiKey: options.hasApiKey,
      hasTtsAdapter: options.hasTtsAdapter,
      model: model?.id ?? null,
      skipReason,
    };
  }

  /**
   * Return usable candidates in priority order.
   * Skips disabled providers, unsupported capability, open circuits, unhealthy providers.
   * When requireAdapter is true, skips providers without a registered adapter (Phase 1 default for execute).
   */
  route(
    capability: AiCapability,
    options?: {
      preferredProviderId?: AiProviderId;
      preferredModelId?: string;
      requireAdapter?: boolean;
    },
  ): RouteCandidate[] {
    const requireAdapter = options?.requireAdapter ?? false;
    const configured =
      this.routing.find((row) => row.feature === capability)?.providers ??
      this.capabilities.providersFor(capability);

    const preferredFirst = options?.preferredProviderId
      ? [
          options.preferredProviderId,
          ...configured.filter((id) => id !== options.preferredProviderId),
        ]
      : configured;

    const candidates: RouteCandidate[] = [];

    preferredFirst.forEach((providerId, priorityIndex) => {
      if (!this.capabilities.advertises(providerId, capability)) {
        return;
      }
      const provider = this.providers.get(providerId);
      if (!provider?.enabled) {
        return;
      }
      if (requireAdapter && !this.pool.hasAdapter(providerId)) {
        return;
      }
      if (!this.circuit.canRequest(providerId)) {
        return;
      }
      if (!this.health.isUsable(providerId)) {
        return;
      }

      const preferredModel =
        options?.preferredModelId ||
        this.routing.find((row) => row.feature === capability)?.models?.[
          providerId
        ];

      const model = this.models.resolve(providerId, capability, preferredModel);
      if (!model) {
        return;
      }

      candidates.push({ providerId, model, priorityIndex });
    });

    return candidates;
  }

  requireRoute(
    capability: AiCapability,
    options?: {
      preferredProviderId?: AiProviderId;
      preferredModelId?: string;
      requireAdapter?: boolean;
    },
  ): RouteCandidate[] {
    const candidates = this.route(capability, options);
    if (candidates.length === 0) {
      const configured =
        this.routing.find((row) => row.feature === capability)?.providers ??
        this.capabilities.providersFor(capability);
      const details = configured.map((providerId) => {
        if (!this.capabilities.advertises(providerId, capability)) {
          return `${providerId}: does not advertise "${capability}" (or disabled)`;
        }
        if (!this.providers.get(providerId)?.enabled) {
          return `${providerId}: disabled`;
        }
        if (options?.requireAdapter && !this.pool.hasAdapter(providerId)) {
          return `${providerId}: no adapter registered`;
        }
        if (!this.circuit.canRequest(providerId)) {
          return `${providerId}: circuit open`;
        }
        if (!this.health.isUsable(providerId)) {
          return `${providerId}: unhealthy`;
        }
        const preferredModel =
          options?.preferredModelId ||
          this.routing.find((row) => row.feature === capability)?.models?.[
            providerId
          ];
        if (!this.models.resolve(providerId, capability, preferredModel)) {
          return `${providerId}: no model for "${capability}" (preferred=${preferredModel ?? "none"})`;
        }
        return `${providerId}: skipped`;
      });
      throw new AiProviderError({
        code: "provider_unavailable",
        message:
          `No usable AI provider for capability "${capability}". ` +
          `Configured=[${configured.join(", ") || "(none)"}]. ` +
          `Details: ${details.join("; ") || "no providers configured"}.`,
        retryable: true,
      });
    }
    return candidates;
  }
}
