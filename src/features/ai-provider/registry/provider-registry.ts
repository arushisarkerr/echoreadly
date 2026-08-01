import type { AiCapability, AiProviderDefinition, AiProviderId } from "../types";

/**
 * Registry of known AI providers (metadata only — no SDKs).
 */
export class ProviderRegistry {
  private readonly byId = new Map<AiProviderId, AiProviderDefinition>();

  constructor(providers: AiProviderDefinition[] = []) {
    this.replaceAll(providers);
  }

  replaceAll(providers: AiProviderDefinition[]): void {
    this.byId.clear();
    for (const provider of providers) {
      this.byId.set(provider.id, { ...provider });
    }
  }

  register(provider: AiProviderDefinition): void {
    this.byId.set(provider.id, { ...provider });
  }

  get(providerId: AiProviderId): AiProviderDefinition | null {
    return this.byId.get(providerId) ?? null;
  }

  list(options?: { enabledOnly?: boolean }): AiProviderDefinition[] {
    const all = [...this.byId.values()];
    const filtered = options?.enabledOnly
      ? all.filter((provider) => provider.enabled)
      : all;
    return filtered.sort(
      (a, b) => a.defaultPriority - b.defaultPriority || a.id.localeCompare(b.id),
    );
  }

  supports(providerId: AiProviderId, capability: AiCapability): boolean {
    const provider = this.get(providerId);
    if (!provider || !provider.enabled) {
      return false;
    }
    return provider.capabilities.includes(capability);
  }

  listForCapability(capability: AiCapability): AiProviderDefinition[] {
    return this.list({ enabledOnly: true }).filter((provider) =>
      provider.capabilities.includes(capability),
    );
  }
}
