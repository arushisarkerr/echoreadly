/**
 * OpenAI chat/text adapter.
 * Provider SDK/HTTP may only live here — not in feature modules.
 */

import { mapProviderFailure } from "../../errors";
import type { AiTextResponse } from "../../responses";
import type { AiProviderAdapter, AdapterExecutionContext } from "../types";
import type { AiTextRequest } from "../../types";

export function createOpenAiChatAdapter(): AiProviderAdapter {
  return {
    providerId: "openai",

    async generateText(
      request: AiTextRequest,
      context: AdapterExecutionContext,
    ): Promise<Omit<AiTextResponse, "attempts">> {
      const started = Date.now();
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${context.apiKey}`,
        },
        body: JSON.stringify({
          model: context.modelId,
          temperature: request.temperature ?? 0.3,
          ...(typeof request.maxOutputTokens === "number"
            ? { max_tokens: request.maxOutputTokens }
            : {}),
          messages: [
            ...(request.system
              ? [{ role: "system" as const, content: request.system }]
              : []),
            { role: "user" as const, content: request.input },
          ],
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
        choices?: Array<{ message?: { content?: string } }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
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

      const text = payload.choices?.[0]?.message?.content?.trim() || "";
      if (!text) {
        throw mapProviderFailure({
          providerId: "openai",
          keyId: context.keyId,
          body: "OpenAI returned empty chat text.",
        });
      }

      return {
        kind: "text",
        text,
        providerId: "openai",
        modelId: context.modelId,
        keyId: context.keyId,
        capability: request.feature,
        usage: {
          inputTokens: payload.usage?.prompt_tokens ?? null,
          outputTokens: payload.usage?.completion_tokens ?? null,
          totalTokens: payload.usage?.total_tokens ?? null,
          latencyMs: Date.now() - started,
          estimatedCostUsd: null,
        },
      };
    },
  };
}
