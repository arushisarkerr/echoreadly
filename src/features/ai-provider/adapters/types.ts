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

  register(adapter: AiProviderAdapter): void {
    this.adapters.set(adapter.providerId, adapter);
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
