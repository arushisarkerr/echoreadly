import type {
  AiCapability,
  AiModelDefinition,
  AiProviderId,
} from "../types";

/**
 * Maps provider → capability → model without feature-level hardcoding.
 */
export class ModelRegistry {
  private readonly byId = new Map<string, AiModelDefinition>();

  constructor(models: AiModelDefinition[] = []) {
    this.replaceAll(models);
  }

  replaceAll(models: AiModelDefinition[]): void {
    this.byId.clear();
    for (const model of models) {
      this.byId.set(this.key(model.providerId, model.id), { ...model });
    }
  }

  register(model: AiModelDefinition): void {
    this.byId.set(this.key(model.providerId, model.id), { ...model });
  }

  get(providerId: AiProviderId, modelId: string): AiModelDefinition | null {
    return this.byId.get(this.key(providerId, modelId)) ?? null;
  }

  listForProvider(providerId: AiProviderId): AiModelDefinition[] {
    return [...this.byId.values()].filter(
      (model) => model.providerId === providerId && model.enabled !== false,
    );
  }

  listForCapability(
    providerId: AiProviderId,
    capability: AiCapability,
  ): AiModelDefinition[] {
    return this.listForProvider(providerId).filter((model) =>
      model.capabilities.includes(capability),
    );
  }

  /**
   * Resolve a model for provider+capability.
   * Prefer explicit preferredId when valid; otherwise first matching model.
   */
  resolve(
    providerId: AiProviderId,
    capability: AiCapability,
    preferredId?: string,
  ): AiModelDefinition | null {
    const candidates = this.listForCapability(providerId, capability);
    if (candidates.length === 0) {
      return null;
    }
    if (preferredId) {
      const preferred = candidates.find((model) => model.id === preferredId);
      if (preferred) {
        return preferred;
      }
    }
    return candidates[0] ?? null;
  }

  private key(providerId: AiProviderId, modelId: string): string {
    return `${providerId}::${modelId}`;
  }
}
