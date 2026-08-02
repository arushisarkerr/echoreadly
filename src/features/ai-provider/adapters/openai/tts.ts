/**
 * OpenAI TTS adapter.
 * Provider HTTP for speech may only live here — not in feature modules.
 */

import { mapProviderFailure } from "../../errors";
import type { AiTtsResponse } from "../../responses";
import type { AiProviderAdapter, AdapterExecutionContext } from "../types";
import type { AiTtsRequest } from "../../types";

const MIME_BY_FORMAT: Record<NonNullable<AiTtsRequest["format"]>, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  opus: "audio/opus",
};

export function createOpenAiTtsAdapter(): AiProviderAdapter {
  return {
    providerId: "openai",

    async synthesizeSpeech(
      request: AiTtsRequest,
      context: AdapterExecutionContext,
    ): Promise<Omit<AiTtsResponse, "attempts">> {
      const started = Date.now();
      const format = request.format ?? "mp3";
      const voice = request.voice?.trim() || "alloy";

      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${context.apiKey}`,
        },
        body: JSON.stringify({
          model: context.modelId,
          voice,
          input: request.text,
          response_format: format,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw mapProviderFailure({
          providerId: "openai",
          keyId: context.keyId,
          status: response.status,
          body,
        });
      }

      const buffer = new Uint8Array(await response.arrayBuffer());
      if (buffer.byteLength === 0) {
        throw mapProviderFailure({
          providerId: "openai",
          keyId: context.keyId,
          body: "OpenAI TTS returned empty audio.",
        });
      }

      return {
        kind: "tts",
        bytes: buffer,
        mimeType: MIME_BY_FORMAT[format],
        providerId: "openai",
        modelId: context.modelId,
        keyId: context.keyId,
        capability: "tts",
        usage: {
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
          latencyMs: Date.now() - started,
          estimatedCostUsd: null,
        },
      };
    },
  };
}
