/**
 * Google Gemini text provider.
 * Vendor SDK usage is isolated to this module.
 * Used as summarization fallback when OpenAI is rate-limited / unavailable.
 */

import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";

import { logger } from "@/lib/logger";

import type { AiGenerateInput, AiGenerateResult, AiProvider } from "./ai-provider";
import type { AiError } from "./types";

/** Provider-owned default — do not change shared DEFAULT_SUMMARY_MODEL. */
const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

export type GeminiProviderOptions = {
  apiKey?: string;
  defaultModel?: string;
};

/**
 * TEMPORARY truncation diagnostics — metadata only; never log prompt/response text.
 */
function logGeminiResponseDiagnostics(
  response: GenerateContentResponse,
  options: {
    maxOutputTokens: number | undefined;
    textLength: number;
  },
): void {
  const candidates = response.candidates ?? [];
  const finishReason = candidates[0]?.finishReason ?? null;
  const truncated =
    finishReason === "MAX_TOKENS" ||
    String(finishReason).toUpperCase().includes("MAX_TOKEN");

  logger.warn("Gemini generateContent truncation diagnostics", {
    finishReason,
    outputTokenCount: response.usageMetadata?.candidatesTokenCount ?? null,
    thoughtsTokenCount: response.usageMetadata?.thoughtsTokenCount ?? null,
    totalTokenCount: response.usageMetadata?.totalTokenCount ?? null,
    candidateCount: candidates.length,
    responseTextLength: options.textLength,
    ...(truncated ? { maxOutputTokens: options.maxOutputTokens ?? null } : {}),
  });
}

function classifyGeminiError(error: unknown): AiError {
  const message =
    error instanceof Error ? error.message : "An unexpected Gemini error occurred.";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("api key") ||
    normalized.includes("unauthorized") ||
    normalized.includes("permission denied") ||
    normalized.includes("401") ||
    normalized.includes("403")
  ) {
    return {
      code: "missing_api_key",
      message: "Gemini API key is invalid or unauthorized.",
    };
  }

  if (
    normalized.includes("429") ||
    normalized.includes("rate limit") ||
    normalized.includes("quota") ||
    normalized.includes("resource exhausted")
  ) {
    return {
      code: "rate_limit",
      message: "Gemini rate limit reached. Please try again shortly.",
    };
  }

  return {
    code: "api_error",
    message,
  };
}

/**
 * Gemini implementation of the AiProvider interface.
 */
export class GeminiProvider implements AiProvider {
  readonly name = "gemini";

  private readonly client: GoogleGenAI | null;
  private readonly defaultModel: string;

  constructor(options: GeminiProviderOptions = {}) {
    const apiKey = options.apiKey?.trim();
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
    this.defaultModel = options.defaultModel?.trim() || DEFAULT_GEMINI_MODEL;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async generateText(input: AiGenerateInput): Promise<AiGenerateResult> {
    if (!this.client) {
      return {
        ok: false,
        error: {
          code: "missing_api_key",
          message:
            "Gemini API key is not configured. Set GEMINI_API_KEY in .env.local.",
        },
      };
    }

    const model = input.model?.trim() || this.defaultModel;

    try {
      const response = await this.client.models.generateContent({
        model,
        contents: input.input,
        config: {
          systemInstruction: input.instructions,
          maxOutputTokens: input.maxOutputTokens,
          // Force JSON mode so summaries parse as structured citation payloads.
          responseMimeType: "application/json",
        },
      });

      const text = response.text?.trim() ?? "";

      // TEMPORARY — investigate truncated JSON / MAX_TOKENS (no document contents).
      logGeminiResponseDiagnostics(response, {
        maxOutputTokens: input.maxOutputTokens,
        textLength: text.length,
      });

      if (!text) {
        return {
          ok: false,
          error: {
            code: "api_error",
            message: "Gemini returned an empty response.",
          },
        };
      }

      return {
        ok: true,
        data: {
          text,
          model: response.modelVersion ?? model,
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: classifyGeminiError(error),
      };
    }
  }
}

/**
 * Factory for the Gemini provider using an explicit or env API key.
 */
export function createGeminiProvider(apiKey?: string): GeminiProvider {
  const resolved =
    apiKey?.trim() ||
    (typeof process.env.GEMINI_API_KEY === "string"
      ? process.env.GEMINI_API_KEY.trim()
      : undefined);

  return new GeminiProvider({ apiKey: resolved });
}
