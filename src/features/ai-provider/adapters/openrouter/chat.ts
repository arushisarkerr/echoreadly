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
const TIMING_PREFIX = "[OpenRouter HTTP timing]";

function logTiming(step: string, details?: Record<string, unknown>): void {
  if (details && Object.keys(details).length > 0) {
    console.info(TIMING_PREFIX, step, details);
    return;
  }
  console.info(TIMING_PREFIX, step);
}

function timeoutReasonFrom(cause: unknown): string | null {
  if (cause == null) {
    return null;
  }
  if (cause instanceof Error) {
    const name = cause.name;
    const message = cause.message;
    const code =
      "code" in cause && typeof (cause as { code?: unknown }).code === "string"
        ? (cause as { code: string }).code
        : null;
    if (
      name === "AbortError" ||
      name === "TimeoutError" ||
      code === "ETIMEDOUT" ||
      code === "UND_ERR_CONNECT_TIMEOUT" ||
      code === "UND_ERR_HEADERS_TIMEOUT" ||
      code === "UND_ERR_BODY_TIMEOUT" ||
      /timeout/i.test(message)
    ) {
      return [name, code, message].filter(Boolean).join(": ");
    }
    return null;
  }
  if (typeof cause === "string" && /timeout/i.test(cause)) {
    return cause;
  }
  return null;
}

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

      logTiming("before HTTP request", {
        feature: request.feature,
        model: context.modelId,
        url: OPENROUTER_CHAT_URL,
        t0Ms: started,
      });

      let response: Response;
      try {
        response = await fetch(OPENROUTER_CHAT_URL, {
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
      } catch (cause) {
        const timeoutReason = timeoutReasonFrom(cause);
        logTiming("HTTP request failed before headers", {
          feature: request.feature,
          model: context.modelId,
          httpStatusCode: null,
          timeoutReason,
          totalRequestDurationMs: Date.now() - started,
          error: cause instanceof Error ? cause.message : String(cause),
        });
        throw cause;
      }

      const headersReceivedAt = Date.now();
      logTiming("after HTTP response headers", {
        feature: request.feature,
        model: context.modelId,
        httpStatusCode: response.status,
        headersDurationMs: headersReceivedAt - started,
        timeoutReason: null,
        bodyUsed: response.bodyUsed,
      });
      logTiming("response.bodyUsed", {
        bodyUsed: response.bodyUsed,
      });

      let raw: string;
      try {
        raw = await response.text();
      } catch (cause) {
        const timeoutReason = timeoutReasonFrom(cause);
        logTiming("HTTP response body failed", {
          feature: request.feature,
          model: context.modelId,
          httpStatusCode: response.status,
          headersDurationMs: headersReceivedAt - started,
          totalRequestDurationMs: Date.now() - started,
          timeoutReason,
          error: cause instanceof Error ? cause.message : String(cause),
        });
        throw cause;
      }

      logTiming("response body raw", {
        rawLength: raw.length,
        first300: raw.slice(0, 300),
      });

      const bodyReceivedAt = Date.now();
      const totalRequestDurationMs = bodyReceivedAt - started;
      logTiming("after response body received", {
        feature: request.feature,
        model: context.modelId,
        httpStatusCode: response.status,
        bodyDurationMs: bodyReceivedAt - headersReceivedAt,
        totalRequestDurationMs,
        bodyLength: raw.length,
        timeoutReason: null,
      });
      logTiming("total request duration", {
        feature: request.feature,
        model: context.modelId,
        httpStatusCode: response.status,
        totalRequestDurationMs,
        timeoutReason: null,
      });

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
        logTiming("JSON parse success", {
          feature: request.feature,
          model: context.modelId,
          rawLength: raw.length,
        });
      } catch (cause) {
        logTiming("JSON parse failure", {
          feature: request.feature,
          model: context.modelId,
          rawLength: raw.length,
          first300: raw.slice(0, 300),
          error: cause instanceof Error ? cause.message : String(cause),
        });
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
