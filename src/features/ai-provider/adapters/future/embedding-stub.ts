/**
 * Future embedding provider adapter contract placeholder.
 *
 * Phase 7 ships OpenAI embeddings only. Additional providers implement
 * `embed` on AiProviderAdapter, register via the layer, and are selected by
 * config routing — no feature code changes.
 *
 * Example (later):
 *   layer.registerAdapter(createFutureEmbeddingAdapter("gemini"));
 *   // and add provider id + model to featureRouting.embedding
 */

import type { AiProviderAdapter } from "../types";

/**
 * Not registered by default. Documents that multi-provider embeddings
 * are supported by the adapter interface.
 */
export function createFutureEmbeddingAdapterStub(
  providerId: string,
): AiProviderAdapter {
  return {
    providerId,
    async embed() {
      throw new Error(
        `Embedding provider "${providerId}" is not configured. Register a real adapter before enabling it in routing.`,
      );
    },
  };
}
