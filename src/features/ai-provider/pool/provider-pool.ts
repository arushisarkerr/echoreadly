import type { AiProviderDefinition, AiProviderId } from "../types";
import type { ProviderRegistry } from "../registry/provider-registry";

export type PooledProvider = {
  definition: AiProviderDefinition;
  adapterRegistered: boolean;
};

/**
 * Runtime pool of providers available to the router.
 * Adapters register separately; pool tracks which have an adapter wired.
 */
export class ProviderPool {
  private readonly adapterIds = new Set<AiProviderId>();

  constructor(private readonly providers: ProviderRegistry) {}

  markAdapterRegistered(providerId: AiProviderId, registered = true): void {
    if (registered) {
      this.adapterIds.add(providerId);
    } else {
      this.adapterIds.delete(providerId);
    }
  }

  hasAdapter(providerId: AiProviderId): boolean {
    return this.adapterIds.has(providerId);
  }

  list(options?: {
    enabledOnly?: boolean;
    requireAdapter?: boolean;
  }): PooledProvider[] {
    return this.providers.list({ enabledOnly: options?.enabledOnly }).map((definition) => ({
      definition,
      adapterRegistered: this.adapterIds.has(definition.id),
    })).filter((entry) =>
      options?.requireAdapter ? entry.adapterRegistered : true,
    );
  }

  get(providerId: AiProviderId): PooledProvider | null {
    const definition = this.providers.get(providerId);
    if (!definition) {
      return null;
    }
    return {
      definition,
      adapterRegistered: this.adapterIds.has(providerId),
    };
  }
}
