import type { AiCapability, AiProviderDefinition, AiProviderId } from "../types";
import type { ProviderRegistry } from "./provider-registry";

/**
 * Capability advertisements derived from the provider registry.
 * Router must never pick a provider that does not advertise the capability.
 */
export class CapabilityRegistry {
  constructor(private readonly providers: ProviderRegistry) {}

  providersFor(capability: AiCapability): AiProviderId[] {
    return this.providers.listForCapability(capability).map((provider) => provider.id);
  }

  advertises(providerId: AiProviderId, capability: AiCapability): boolean {
    return this.providers.supports(providerId, capability);
  }

  capabilitiesOf(providerId: AiProviderId): AiCapability[] {
    const provider = this.providers.get(providerId);
    return provider?.capabilities.slice() ?? [];
  }

  snapshot(): Array<{
    providerId: AiProviderId;
    displayName: string;
    enabled: boolean;
    capabilities: AiCapability[];
  }> {
    return this.providers.list().map((provider: AiProviderDefinition) => ({
      providerId: provider.id,
      displayName: provider.displayName,
      enabled: provider.enabled,
      capabilities: provider.capabilities.slice(),
    }));
  }
}
