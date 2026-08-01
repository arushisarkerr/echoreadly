/**
 * Gemini chat/text adapter (fallback-ready for Chat).
 * Provider HTTP may only live here — not in feature modules.
 */

import { mapProviderFailure } from "../../errors";
import type { AiTextResponse } from "../../responses";
import type { AiProviderAdapter, AdapterExecutionContext } from "../types";
import type { AiTextRequest } from "../../types";

export function createGeminiChatAdapter(): AiProviderAdapter {
  return {
    providerId: "gemini",

    async generateText(
      request: AiTextRequest,
      context: AdapterExecutionContext,
    ): Promise<Omit<AiTextResponse, "attempts">> {
      const started = Date.now();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(context.modelId)}:generateContent?key=${encodeURIComponent(context.apiKey)}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(request.system
            ? {
                systemInstruction: {
                  parts: [{ text: request.system }],
                },
              }
            : {}),
          contents: [
            {
              role: "user",
              parts: [{ text: request.input }],
            },
          ],
          generationConfig: {
            temperature: request.temperature ?? 0.3,
            ...(typeof request.maxOutputTokens === "number"
              ? { maxOutputTokens: request.maxOutputTokens }
              : {}),
          },
        }),
      });

      const raw = await response.text();
      if (!response.ok) {
        throw mapProviderFailure({
          providerId: "gemini",
          keyId: context.keyId,
          status: response.status,
          body: raw,
        });
      }

      let payload: {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        };
      };
      try {
        payload = JSON.parse(raw) as typeof payload;
      } catch (cause) {
        throw mapProviderFailure({
          providerId: "gemini",
          keyId: context.keyId,
          body: raw,
          cause,
        });
      }

      const text = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim();

      if (!text) {
        throw mapProviderFailure({
          providerId: "gemini",
          keyId: context.keyId,
          body: "Gemini returned empty chat text.",
        });
      }

      return {
        kind: "text",
        text,
        providerId: "gemini",
        modelId: context.modelId,
        keyId: context.keyId,
        capability: request.feature,
        usage: {
          inputTokens: payload.usageMetadata?.promptTokenCount ?? null,
          outputTokens: payload.usageMetadata?.candidatesTokenCount ?? null,
          totalTokens: payload.usageMetadata?.totalTokenCount ?? null,
          latencyMs: Date.now() - started,
          estimatedCostUsd: null,
        },
      };
    },
  };
}
