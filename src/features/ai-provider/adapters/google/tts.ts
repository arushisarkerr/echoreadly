/**
 * Google Cloud Text-to-Speech adapter.
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

/** OpenAI-style presets from the Listen UI — not valid Google voice names. */
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

const DEFAULT_GOOGLE_TTS_VOICE = "en-US-Neural2-A";
const DEFAULT_GOOGLE_TTS_LANGUAGE = "en-US";

function resolveGoogleVoice(requestVoice?: string): string {
  const fromEnv = process.env.GOOGLE_TTS_VOICE?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  const requested = requestVoice?.trim();
  if (requested && !OPENAI_VOICE_PRESETS.has(requested.toLowerCase())) {
    return requested;
  }
  return DEFAULT_GOOGLE_TTS_VOICE;
}

function resolveGoogleLanguage(voiceName: string): string {
  const fromEnv = process.env.GOOGLE_TTS_LANGUAGE?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  // Voice names are typically "{languageCode}-{variant}", e.g. en-US-Neural2-A.
  const match = /^([a-z]{2,3}-[A-Z]{2})/.exec(voiceName);
  return match?.[1] ?? DEFAULT_GOOGLE_TTS_LANGUAGE;
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
 * Map request format to Google audioEncoding.
 * Downstream storage expects mp3 by default (same as OpenAI / ElevenLabs).
 */
function googleAudioEncoding(
  format: NonNullable<AiTtsRequest["format"]>,
): "MP3" | "LINEAR16" | "OGG_OPUS" {
  if (format === "wav") {
    return "LINEAR16";
  }
  if (format === "opus") {
    return "OGG_OPUS";
  }
  return "MP3";
}

function decodeBase64Audio(audioContent: string): Uint8Array {
  const binary = Buffer.from(audioContent, "base64");
  return new Uint8Array(binary);
}

export function createGoogleTtsAdapter(): AiProviderAdapter {
  return {
    providerId: "google",

    async synthesizeSpeech(
      request: AiTtsRequest,
      context: AdapterExecutionContext,
    ): Promise<Omit<AiTtsResponse, "attempts">> {
      const started = Date.now();
      const format = request.format ?? "mp3";
      const voiceName = resolveGoogleVoice(request.voice);
      const languageCode = resolveGoogleLanguage(voiceName);
      const selectedKeyIndex = keyIndexLabel("google", context.keyId);
      const audioEncoding = googleAudioEncoding(format);

      logTtsExec("Google TTS request start", {
        model: context.modelId,
        voice: voiceName,
        languageCode,
        selectedKeyIndex,
      });

      const url = new URL(
        "https://texttospeech.googleapis.com/v1/text:synthesize",
      );
      url.searchParams.set("key", context.apiKey);

      let response: Response;
      try {
        response = await fetch(url.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            input: { text: request.text },
            voice: {
              languageCode,
              name: voiceName,
            },
            audioConfig: {
              audioEncoding,
            },
          }),
        });
      } catch (cause) {
        logTtsExecError(cause, {
          provider: "google",
          model: context.modelId,
          keyIndex: selectedKeyIndex,
        });
        throw cause;
      }

      const requestId =
        response.headers.get("x-request-id") ||
        response.headers.get("request-id") ||
        null;

      const bodyText = await response.text();

      if (!response.ok) {
        logTtsExec("Google TTS response", {
          httpStatus: response.status,
          responseBody: bodyText.slice(0, 2000),
          requestId,
        });
        const mapped = mapProviderFailure({
          providerId: "google",
          keyId: context.keyId,
          status: response.status,
          body: bodyText,
        });
        logTtsExecError(mapped, {
          provider: "google",
          model: context.modelId,
          keyIndex: selectedKeyIndex,
        });
        throw mapped;
      }

      let audioContent: string | undefined;
      try {
        const parsed = JSON.parse(bodyText) as { audioContent?: unknown };
        audioContent =
          typeof parsed.audioContent === "string"
            ? parsed.audioContent
            : undefined;
      } catch {
        audioContent = undefined;
      }

      logTtsExec("Google TTS response", {
        httpStatus: response.status,
        responseBody: audioContent ? "(audio base64)" : bodyText.slice(0, 500),
        requestId,
      });

      if (!audioContent) {
        const mapped = mapProviderFailure({
          providerId: "google",
          keyId: context.keyId,
          body: "Google TTS returned no audioContent.",
        });
        logTtsExecError(mapped, {
          provider: "google",
          model: context.modelId,
          keyIndex: selectedKeyIndex,
        });
        throw mapped;
      }

      const buffer = decodeBase64Audio(audioContent);
      logTtsExec("Audio bytes received", {
        size: buffer.byteLength,
      });

      if (buffer.byteLength === 0) {
        const mapped = mapProviderFailure({
          providerId: "google",
          keyId: context.keyId,
          body: "Google TTS returned empty audio.",
        });
        logTtsExecError(mapped, {
          provider: "google",
          model: context.modelId,
          keyIndex: selectedKeyIndex,
        });
        throw mapped;
      }

      return {
        kind: "tts",
        bytes: buffer,
        mimeType: mimeForFormat(format),
        providerId: "google",
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
