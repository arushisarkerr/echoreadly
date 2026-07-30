/**
 * OpenAI Text-to-Speech provider.
 * Vendor SDK usage is isolated to this module.
 */

import OpenAI from "openai";

import type { TtsProvider } from "./tts-provider";
import {
  DEFAULT_TTS_MODEL,
  DEFAULT_TTS_VOICE,
  MAX_TTS_INPUT_CHARS,
  type TtsError,
  type TtsSynthesizeInput,
  type TtsSynthesizeResult,
} from "./types";
import { isSupportedTtsVoiceId, resolveTtsVoiceId } from "./voices";

function classifyOpenAiError(error: unknown): TtsError {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 429) {
      return {
        code: "rate_limit",
        message: "OpenAI rate limit reached. Please try again shortly.",
      };
    }

    if (error.status === 401 || error.status === 403) {
      return {
        code: "missing_api_key",
        message: "OpenAI API key is invalid or unauthorized.",
      };
    }

    return {
      code: "api_error",
      message: error.message || "OpenAI TTS request failed.",
    };
  }

  const message =
    error instanceof Error
      ? error.message
      : "An unexpected OpenAI TTS error occurred.";

  const normalized = message.toLowerCase();

  if (normalized.includes("rate limit") || normalized.includes("429")) {
    return {
      code: "rate_limit",
      message: "OpenAI rate limit reached. Please try again shortly.",
    };
  }

  return {
    code: "api_error",
    message,
  };
}

export type OpenAiTtsProviderOptions = {
  apiKey?: string;
  defaultModel?: string;
  defaultVoice?: string;
};

/**
 * OpenAI implementation of the TtsProvider interface.
 */
export class OpenAiTtsProvider implements TtsProvider {
  readonly name = "openai";

  private readonly client: OpenAI | null;
  private readonly defaultModel: string;
  private readonly defaultVoice: string;

  constructor(options: OpenAiTtsProviderOptions = {}) {
    const apiKey = options.apiKey?.trim();
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
    this.defaultModel = options.defaultModel ?? DEFAULT_TTS_MODEL;
    this.defaultVoice = options.defaultVoice ?? DEFAULT_TTS_VOICE;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async synthesize(input: TtsSynthesizeInput): Promise<TtsSynthesizeResult> {
    if (!this.client) {
      return {
        ok: false,
        error: {
          code: "missing_api_key",
          message:
            "OpenAI API key is not configured. Set OPENAI_API_KEY in .env.local.",
        },
      };
    }

    const text = input.text.trim();

    if (!text) {
      return {
        ok: false,
        error: {
          code: "empty_text",
          message: "No text available to narrate.",
        },
      };
    }

    const clipped =
      text.length > MAX_TTS_INPUT_CHARS
        ? text.slice(0, MAX_TTS_INPUT_CHARS)
        : text;

    const model = input.model ?? this.defaultModel;
    const requestedVoice = input.voice ?? this.defaultVoice;
    const voice = isSupportedTtsVoiceId(requestedVoice)
      ? requestedVoice
      : resolveTtsVoiceId(this.defaultVoice);

    try {
      const response = await this.client.audio.speech.create({
        model,
        voice,
        input: clipped,
        response_format: "mp3",
        speed: input.speed ?? 1,
      });

      const buffer = new Uint8Array(await response.arrayBuffer());

      if (buffer.byteLength === 0) {
        return {
          ok: false,
          error: {
            code: "api_error",
            message: "OpenAI returned empty audio.",
          },
        };
      }

      return {
        ok: true,
        data: {
          audio: buffer,
          mimeType: "audio/mpeg",
          model,
          voice,
          characterCount: clipped.length,
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: classifyOpenAiError(error),
      };
    }
  }
}

export function createOpenAiTtsProvider(apiKey?: string): OpenAiTtsProvider {
  return new OpenAiTtsProvider({ apiKey });
}
