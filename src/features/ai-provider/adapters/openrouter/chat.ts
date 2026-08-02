/**
 * OpenRouter chat/text adapter (OpenAI-compatible chat completions).
 * Provider HTTP may only live here — not in feature modules.
 * Serves chat, summary, and translation via generateText.
 */

import { mapProviderFailure } from "../../errors";
import type { AiTextResponse } from "../../responses";
import type { AiProviderAdapter, AdapterExecutionContext } from "../types";
import type { AiTextRequest } from "../../types";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

export function createOpenRouterChatAdapter(): AiProviderAdapter {
  return {
    providerId: "openrouter",

    async generateText(
      request: AiTextRequest,
      context: AdapterExecutionContext,
    ): Promise<Omit<AiTextResponse, "attempts">> {
      const started = Date.now();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${context.apiKey}`,
      };
      const referer =
        process.env.OPENROUTER_HTTP_REFERER?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim();
      if (referer) {
        headers["HTTP-Referer"] = referer;
      }
      const title = process.env.OPENROUTER_APP_TITLE?.trim();
      if (title) {
        headers["X-Title"] = title;
      }

      const response = await fetch(OPENROUTER_CHAT_URL, {
        method: "POST",
        headers,
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
          providerId: "openrouter",
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
          providerId: "openrouter",
          keyId: context.keyId,
          body: raw,
          cause,
        });
      }

      const text = payload.choices?.[0]?.message?.content?.trim() || "";
      if (!text) {
        throw mapProviderFailure({
          providerId: "openrouter",
          keyId: context.keyId,
          body: "OpenRouter returned empty chat text.",
        });
      }

      return {
        kind: "text",
        text,
        providerId: "openrouter",
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
