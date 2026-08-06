/**
 * Google Cloud Gemini-TTS adapter (Cloud Text-to-Speech unary).
 * Request shape matches scripts/smoke-gemini-tts.ts (official sample).
 * Auth uses service-account OAuth JWT exchange (Vercel-safe; no gcloud CLI).
 * Provider HTTP for speech may only live here — not in feature modules.
 */

import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

import { mapProviderFailure } from "../../errors";
import {
  keyIndexLabel,
  logTtsExec,
  logTtsExecError,
} from "@/features/tts/tts-exec-debug";
import type { AiTtsResponse } from "../../responses";
import type { AiProviderAdapter, AdapterExecutionContext } from "../types";
import type { AiTtsRequest } from "../../types";
import {
  GOOGLE_TTS_MAX_CHUNK_BYTES,
  splitTextByUtf8Bytes,
  utf8ByteLength,
} from "./chunk-utf8";
import { mergeMp3ChunksWithFfmpeg } from "./merge-mp3";

/** Same model as the verified smoke / official unary sample. */
const DEFAULT_GEMINI_TTS_MODEL = "gemini-3.1-flash-tts-preview";
/** Gemini short name (official sample uses Kore when unset). */
const DEFAULT_GOOGLE_TTS_VOICE = "Kore";
const DEFAULT_GOOGLE_TTS_LANGUAGE = "en-us";

const OAUTH_TOKEN_URI = "https://oauth2.googleapis.com/token";
const OAUTH_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

type ServiceAccount = {
  project_id?: string;
  private_key?: string;
  client_email?: string;
  token_uri?: string;
};

type CachedToken = {
  accessToken: string;
  expiresAtMs: number;
};

let cachedToken: CachedToken | null = null;

function base64Url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function readServiceAccount(): ServiceAccount {
  const jsonInline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonInline) {
    return JSON.parse(jsonInline) as ServiceAccount;
  }
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credPath) {
    return JSON.parse(readFileSync(credPath, "utf8")) as ServiceAccount;
  }
  throw new Error(
    "Missing Google credentials. Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.",
  );
}

function resolveProjectId(sa?: ServiceAccount): string {
  return (
    process.env.PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    sa?.project_id?.trim() ||
    ""
  );
}

/**
 * OAuth 2.0 service-account JWT bearer grant (ADC-compatible for serverless).
 * Does not shell out to gcloud.
 */
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs > now + 60_000) {
    return cachedToken.accessToken;
  }

  if (!sa.client_email || !sa.private_key) {
    throw new Error(
      "Service account JSON missing client_email or private_key.",
    );
  }

  const iat = Math.floor(now / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: sa.client_email,
      scope: OAUTH_SCOPE,
      aud: sa.token_uri || OAUTH_TOKEN_URI,
      iat,
      exp: iat + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${base64Url(signer.sign(sa.private_key))}`;

  const tokenRes = await fetch(sa.token_uri || OAUTH_TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const tokenText = await tokenRes.text();
  if (!tokenRes.ok) {
    throw new Error(
      `SA token exchange failed (${tokenRes.status}): ${tokenText.slice(0, 500)}`,
    );
  }
  const parsed = JSON.parse(tokenText) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!parsed.access_token) {
    throw new Error("SA token exchange returned no access_token.");
  }

  const expiresInSec =
    typeof parsed.expires_in === "number" && parsed.expires_in > 0
      ? parsed.expires_in
      : 3600;
  cachedToken = {
    accessToken: parsed.access_token,
    expiresAtMs: now + expiresInSec * 1000,
  };
  return parsed.access_token;
}

function resolveGoogleVoice(requestVoice?: string): string {
  const requested = requestVoice?.trim();
  if (requested) {
    return requested;
  }
  const fromEnv = process.env.GOOGLE_TTS_VOICE?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return DEFAULT_GOOGLE_TTS_VOICE;
}

function resolveGoogleLanguage(voiceName: string): string {
  const fromEnv = process.env.GOOGLE_TTS_LANGUAGE?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  // Classic Google names: "{languageCode}-{variant}". Gemini short names have no locale.
  const match = /^([a-z]{2,3}-[A-Za-z]{2})/.exec(voiceName);
  return match?.[1] ?? DEFAULT_GOOGLE_TTS_LANGUAGE;
}

function resolveModelName(contextModelId: string): string {
  const fromEnv = process.env.GOOGLE_TTS_MODEL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (contextModelId.startsWith("gemini-") && contextModelId.includes("tts")) {
    return contextModelId;
  }
  return DEFAULT_GEMINI_TTS_MODEL;
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
 * (Smoke used LINEAR16 only because the official CURL demo does.)
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

type SynthesizeUnaryInput = {
  text: string;
  prompt: string;
  accessToken: string;
  projectId: string;
  voiceName: string;
  languageCode: string;
  modelName: string;
  audioEncoding: "MP3" | "LINEAR16" | "OGG_OPUS";
  keyId: string;
  selectedKeyIndex: string;
};

/**
 * Single Gemini-TTS unary call. Caller must ensure text/prompt stay under the
 * documented 4000-byte limit (we chunk text to 3500 bytes upstream).
 */
async function synthesizeUnaryChunk(
  input: SynthesizeUnaryInput,
): Promise<Uint8Array> {
  const bodyInput: { text: string; prompt?: string } = { text: input.text };
  if (input.prompt) {
    bodyInput.prompt = input.prompt;
  }

  let response: Response;
  try {
    response = await fetch(
      "https://texttospeech.googleapis.com/v1/text:synthesize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "x-goog-user-project": input.projectId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: bodyInput,
          voice: {
            languageCode: input.languageCode,
            name: input.voiceName,
            model_name: input.modelName,
          },
          audioConfig: {
            audioEncoding: input.audioEncoding,
          },
        }),
      },
    );
  } catch (cause) {
    logTtsExecError(cause, {
      provider: "google",
      model: input.modelName,
      keyIndex: input.selectedKeyIndex,
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
      keyId: input.keyId,
      status: response.status,
      body: bodyText,
    });
    logTtsExecError(mapped, {
      provider: "google",
      model: input.modelName,
      keyIndex: input.selectedKeyIndex,
    });
    throw mapped;
  }

  let audioContent: string | undefined;
  try {
    const parsed = JSON.parse(bodyText) as { audioContent?: unknown };
    audioContent =
      typeof parsed.audioContent === "string" ? parsed.audioContent : undefined;
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
      keyId: input.keyId,
      body: "Google TTS returned no audioContent.",
    });
    logTtsExecError(mapped, {
      provider: "google",
      model: input.modelName,
      keyIndex: input.selectedKeyIndex,
    });
    throw mapped;
  }

  const buffer = decodeBase64Audio(audioContent);
  if (buffer.byteLength === 0) {
    const mapped = mapProviderFailure({
      providerId: "google",
      keyId: input.keyId,
      body: "Google TTS returned empty audio.",
    });
    logTtsExecError(mapped, {
      provider: "google",
      model: input.modelName,
      keyIndex: input.selectedKeyIndex,
    });
    throw mapped;
  }

  return buffer;
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
      const modelName = resolveModelName(context.modelId);
      const selectedKeyIndex = keyIndexLabel("google", context.keyId);
      const audioEncoding = googleAudioEncoding(format);

      let sa: ServiceAccount;
      try {
        sa = readServiceAccount();
      } catch (cause) {
        logTtsExecError(cause, {
          provider: "google",
          model: modelName,
          keyIndex: selectedKeyIndex,
        });
        throw cause;
      }

      const projectId = resolveProjectId(sa);
      if (!projectId) {
        const mapped = mapProviderFailure({
          providerId: "google",
          keyId: context.keyId,
          body: "Missing PROJECT_ID, GOOGLE_CLOUD_PROJECT, or project_id in the service account JSON (required for x-goog-user-project).",
        });
        logTtsExecError(mapped, {
          provider: "google",
          model: modelName,
          keyIndex: selectedKeyIndex,
        });
        throw mapped;
      }

      // Official Gemini-TTS unary field: input.prompt (style instruction).
      // Prefer request.prompt; fall back to GOOGLE_TTS_PROMPT; omit if unset.
      const prompt =
        request.prompt?.trim() ||
        process.env.GOOGLE_TTS_PROMPT?.trim() ||
        "";

      // Google Gemini-TTS unary caps input.text / input.prompt at 4000 UTF-8 bytes.
      // Chunk by bytes (3500 margin); never by character count — see chunk-utf8.ts.
      const textChunks = splitTextByUtf8Bytes(
        request.text,
        GOOGLE_TTS_MAX_CHUNK_BYTES,
      );
      // Multi-chunk merge re-encodes via FFmpeg to MP3; force MP3 encoding upstream.
      const multiChunk = textChunks.length > 1;
      const effectiveEncoding = multiChunk ? "MP3" : audioEncoding;
      const effectiveMime = multiChunk ? "audio/mpeg" : mimeForFormat(format);

      logTtsExec("Google TTS request start", {
        model: modelName,
        voice: voiceName,
        languageCode,
        selectedKeyIndex,
        textBytes: utf8ByteLength(request.text),
        promptBytes: utf8ByteLength(prompt),
        chunkCount: textChunks.length,
        maxChunkBytes: GOOGLE_TTS_MAX_CHUNK_BYTES,
      });

      let accessToken: string;
      try {
        accessToken = await getAccessToken(sa);
      } catch (cause) {
        logTtsExecError(cause, {
          provider: "google",
          model: modelName,
          keyIndex: selectedKeyIndex,
        });
        throw cause;
      }

      // Sequential synthesis: any chunk failure throws immediately (no partial merge/upload).
      const audioPieces: Uint8Array[] = [];
      for (let index = 0; index < textChunks.length; index += 1) {
        const chunk = textChunks[index];
        logTtsExec("Google TTS chunk", {
          chunkIndex: index + 1,
          chunkCount: textChunks.length,
          chunkBytes: utf8ByteLength(chunk),
        });
        const piece = await synthesizeUnaryChunk({
          text: chunk,
          prompt,
          accessToken,
          projectId,
          voiceName,
          languageCode,
          modelName,
          audioEncoding: effectiveEncoding,
          keyId: context.keyId,
          selectedKeyIndex,
        });
        audioPieces.push(piece);
      }

      let buffer: Uint8Array;
      try {
        // 1 chunk → FFmpeg bypass; 2+ → decode/PCM/concat/libmp3lame (no byte concat).
        buffer = await mergeMp3ChunksWithFfmpeg(audioPieces);
      } catch (cause) {
        logTtsExecError(cause, {
          provider: "google",
          model: modelName,
          keyIndex: selectedKeyIndex,
        });
        throw cause;
      }
      logTtsExec("Audio bytes received", {
        size: buffer.byteLength,
        pieceCount: audioPieces.length,
        mergedWithFfmpeg: multiChunk,
      });

      return {
        kind: "tts",
        bytes: buffer,
        mimeType: effectiveMime,
        providerId: "google",
        modelId: modelName,
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
