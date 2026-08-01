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
      throw new AiProviderError({
        code: "provider_unavailable",
        message: `No usable AI provider for capability "${capability}".`,
        retryable: true,
      });
    }
    return candidates;
  }
}
