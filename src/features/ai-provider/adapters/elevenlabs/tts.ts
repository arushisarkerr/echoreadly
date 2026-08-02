/**
 * ElevenLabs TTS adapter.
 * Provider HTTP for speech may only live here — not in feature modules.
 */

import { mapProviderFailure } from "../../errors";
import {
  keyIndexLabel,
  logTtsExec,
  logTtsExecError,
} from "@/features/tts/tts-exec-debug";
import type { AiTtsResponse } from "../../responses";
import type { AiProviderAdapter, AdapterExecutionContext } from "../types";
import type { AiTtsRequest } from "../../types";

/** OpenAI-style presets from the Listen UI — not valid ElevenLabs voice ids. */
const OPENAI_VOICE_PRESETS = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "onyx",
  "nova",
  "sage",
  "shimmer",
  "verse",
]);

/** Public default voice when ELEVENLABS_VOICE_ID is unset (Rachel). */
const DEFAULT_ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

function resolveElevenLabsVoiceId(requestVoice?: string): string {
  const fromEnv = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  const requested = requestVoice?.trim();
  if (requested && !OPENAI_VOICE_PRESETS.has(requested.toLowerCase())) {
    return requested;
  }
  return DEFAULT_ELEVENLABS_VOICE_ID;
}

function mimeForFormat(
  format: NonNullable<AiTtsRequest["format"]>,
): string {
  if (format === "wav") {
    return "audio/wav";
  }
  if (format === "opus") {
    return "audio/opus";
  }
  return "audio/mpeg";
}

/**
 * Map request format to ElevenLabs output_format query value.
 * Downstream storage expects mp3 by default (same as OpenAI adapter).
 */
function elevenLabsOutputFormat(
  format: NonNullable<AiTtsRequest["format"]>,
): string {
  if (format === "wav") {
    return "pcm_22050";
  }
  // mp3 / opus → standard mp3 for pipeline compatibility
  return "mp3_44100_128";
}

export function createElevenLabsTtsAdapter(): AiProviderAdapter {
  return {
    providerId: "elevenlabs",

    async synthesizeSpeech(
      request: AiTtsRequest,
      context: AdapterExecutionContext,
    ): Promise<Omit<AiTtsResponse, "attempts">> {
      const started = Date.now();
      const format = request.format ?? "mp3";
      const voiceId = resolveElevenLabsVoiceId(request.voice);
      const selectedKeyIndex = keyIndexLabel("elevenlabs", context.keyId);
      const outputFormat = elevenLabsOutputFormat(format);

      logTtsExec("ElevenLabs request start", {
        model: context.modelId,
        voice: voiceId,
        selectedKeyIndex,
      });

      const url = new URL(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      );
      url.searchParams.set("output_format", outputFormat);

      let response: Response;
      try {
        response = await fetch(url.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
            "xi-api-key": context.apiKey,
          },
          body: JSON.stringify({
            text: request.text,
            model_id: context.modelId,
          }),
        });
      } catch (cause) {
        logTtsExecError(cause, {
          provider: "elevenlabs",
          model: context.modelId,
          keyIndex: selectedKeyIndex,
        });
        throw cause;
      }

      const requestId =
        response.headers.get("request-id") ||
        response.headers.get("x-request-id") ||
        null;

      if (!response.ok) {
        const body = await response.text();
        logTtsExec("ElevenLabs response", {
          httpStatus: response.status,
          responseBody: body.slice(0, 2000),
          requestId,
        });
        const mapped = mapProviderFailure({
          providerId: "elevenlabs",
          keyId: context.keyId,
          status: response.status,
          body,
        });
        logTtsExecError(mapped, {
          provider: "elevenlabs",
          model: context.modelId,
          keyIndex: selectedKeyIndex,
        });
        throw mapped;
      }

      logTtsExec("ElevenLabs response", {
        httpStatus: response.status,
        responseBody: "(audio binary)",
        requestId,
      });

      const buffer = new Uint8Array(await response.arrayBuffer());
      logTtsExec("Audio bytes received", {
        size: buffer.byteLength,
      });

      if (buffer.byteLength === 0) {
        const mapped = mapProviderFailure({
          providerId: "elevenlabs",
          keyId: context.keyId,
          body: "ElevenLabs TTS returned empty audio.",
        });
        logTtsExecError(mapped, {
          provider: "elevenlabs",
          model: context.modelId,
          keyIndex: selectedKeyIndex,
        });
        throw mapped;
      }

      return {
        kind: "tts",
        bytes: buffer,
        mimeType: mimeForFormat(format === "opus" ? "mp3" : format),
        providerId: "elevenlabs",
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
