/**
 * OpenAI embeddings adapter.
 * Provider HTTP for embeddings may only live here — not in feature modules.
 */

import { mapProviderFailure } from "../../errors";
import type { AiEmbeddingResponse } from "../../responses";
import type { AiProviderAdapter, AdapterExecutionContext } from "../types";
import type { AiEmbeddingRequest } from "../../types";

export function createOpenAiEmbeddingAdapter(): AiProviderAdapter {
  return {
    providerId: "openai",

    async embed(
      request: AiEmbeddingRequest,
      context: AdapterExecutionContext,
    ): Promise<Omit<AiEmbeddingResponse, "attempts">> {
      const started = Date.now();
      const input = request.input;

      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${context.apiKey}`,
        },
        body: JSON.stringify({
          model: context.modelId,
          input,
        }),
      });

      const raw = await response.text();
      if (!response.ok) {
        throw mapProviderFailure({
          providerId: "openai",
          keyId: context.keyId,
          status: response.status,
          body: raw,
        });
      }

      let payload: {
        data?: Array<{ embedding?: number[]; index?: number }>;
        usage?: {
          prompt_tokens?: number;
          total_tokens?: number;
        };
      };
      try {
        payload = JSON.parse(raw) as typeof payload;
      } catch (cause) {
        throw mapProviderFailure({
          providerId: "openai",
          keyId: context.keyId,
          body: raw,
          cause,
        });
      }

      const rows = [...(payload.data ?? [])].sort(
        (a, b) => (a.index ?? 0) - (b.index ?? 0),
      );
      const vectors = rows
        .map((row) => row.embedding)
        .filter((vector): vector is number[] => Array.isArray(vector));

      if (vectors.length === 0) {
        throw mapProviderFailure({
          providerId: "openai",
          keyId: context.keyId,
          body: "OpenAI embeddings returned no vectors.",
        });
      }

      const dimensions = vectors[0]?.length ?? 0;
      if (dimensions <= 0 || vectors.some((vector) => vector.length !== dimensions)) {
        throw mapProviderFailure({
          providerId: "openai",
          keyId: context.keyId,
          body: "OpenAI embeddings returned inconsistent vector dimensions.",
        });
      }

      return {
        kind: "embedding",
        vectors,
        dimensions,
        providerId: "openai",
        modelId: context.modelId,
        keyId: context.keyId,
        capability: "embedding",
        usage: {
          inputTokens: payload.usage?.prompt_tokens ?? null,
          outputTokens: null,
          totalTokens: payload.usage?.total_tokens ?? null,
          latencyMs: Date.now() - started,
          estimatedCostUsd: null,
        },
      };
    },
  };
}
