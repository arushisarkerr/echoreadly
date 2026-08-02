/**
 * Provider adapter contracts.
 * SDKs may only be imported inside concrete adapter modules (later phases).
 */

import type {
  AiEmbeddingResponse,
  AiOcrResponse,
  AiTextResponse,
  AiTtsResponse,
} from "../responses";
import type {
  AiAttemptContext,
  AiEmbeddingRequest,
  AiOcrRequest,
  AiProviderId,
  AiTextRequest,
  AiTtsRequest,
} from "../types";

export type AdapterExecutionContext = AiAttemptContext & {
  apiKey: string;
};

export interface AiProviderAdapter {
  readonly providerId: AiProviderId;
  generateText?(
    request: AiTextRequest,
    context: AdapterExecutionContext,
  ): Promise<Omit<AiTextResponse, "attempts">>;
  synthesizeSpeech?(
    request: AiTtsRequest,
    context: AdapterExecutionContext,
  ): Promise<Omit<AiTtsResponse, "attempts">>;
  embed?(
    request: AiEmbeddingRequest,
    context: AdapterExecutionContext,
  ): Promise<Omit<AiEmbeddingResponse, "attempts">>;
  ocr?(
    request: AiOcrRequest,
    context: AdapterExecutionContext,
  ): Promise<Omit<AiOcrResponse, "attempts">>;
}

export class AdapterRegistry {
  private readonly adapters = new Map<AiProviderId, AiProviderAdapter>();

  /**
   * Register (or merge) an adapter by provider id.
   * Later phases can register TTS/embed methods onto the same provider
   * without wiping earlier text methods.
   */
  register(adapter: AiProviderAdapter): void {
    const existing = this.adapters.get(adapter.providerId);
    if (!existing) {
      this.adapters.set(adapter.providerId, adapter);
      return;
    }
    this.adapters.set(adapter.providerId, {
      providerId: adapter.providerId,
      generateText: adapter.generateText ?? existing.generateText,
      synthesizeSpeech: adapter.synthesizeSpeech ?? existing.synthesizeSpeech,
      embed: adapter.embed ?? existing.embed,
      ocr: adapter.ocr ?? existing.ocr,
    });
  }

  unregister(providerId: AiProviderId): void {
    this.adapters.delete(providerId);
  }

  get(providerId: AiProviderId): AiProviderAdapter | null {
    return this.adapters.get(providerId) ?? null;
  }

  list(): AiProviderAdapter[] {
    return [...this.adapters.values()];
  }

  has(providerId: AiProviderId): boolean {
    return this.adapters.has(providerId);
  }
}
