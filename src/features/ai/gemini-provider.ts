/**
 * Google Gemini text provider.
 * Vendor SDK usage is isolated to this module.
 * Used as summarization fallback when OpenAI is rate-limited / unavailable.
 */

import { ApiError, GoogleGenAI } from "@google/genai";

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
 * TEMPORARY — dump the complete Gemini ApiError / HTTP error body with no truncation.
 * Remove after the INVALID_ARGUMENT field is identified.
 */
function logCompleteGeminiApiError(error: unknown): void {
  const dump: Record<string, unknown> = {
    errorType: typeof error,
    isApiError: error instanceof ApiError,
    isError: error instanceof Error,
  };

  if (error instanceof Error) {
    dump.name = error.name;
    dump.message = error.message;
    dump.stack = error.stack;
    dump.cause = error.cause;

    for (const key of Reflect.ownKeys(error)) {
      try {
        dump[`own.${String(key)}`] = (error as unknown as Record<PropertyKey, unknown>)[
          key
        ];
      } catch (ownError) {
        dump[`own.${String(key)}`] = ownError;
      }
    }
  } else {
    dump.value = error;
  }

  if (error instanceof ApiError) {
    dump.status = error.status;
  }

  // ApiError.message is typically JSON.stringify(errorBody) from the HTTP response.
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as unknown;
      dump.parsedMessage = parsed;

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const body = parsed as Record<string, unknown>;
        dump.responseBody = body;
        dump.code = body.code;
        dump.details = body.details;
        dump.errorDetails = body.errorDetails;
        dump.fieldViolations = body.fieldViolations;

        const nested = body.error;
        if (nested && typeof nested === "object" && !Array.isArray(nested)) {
          const nestedError = nested as Record<string, unknown>;
          dump.nestedError = nestedError;
          dump.nestedErrorCode = nestedError.code;
          dump.nestedErrorStatus = nestedError.status;
          dump.nestedErrorMessage = nestedError.message;
          dump.nestedErrorDetails = nestedError.details;
          dump.nestedErrorDetailsAlt = nestedError.errorDetails;
          dump.nestedFieldViolations = nestedError.fieldViolations;
        }
      }
    } catch {
      dump.parsedMessage = null;
    }
  }

  // Do not truncate — logger serializes the full context object.
  logger.error("TEMPORARY Gemini ApiError complete dump", dump);
  // Also emit the raw thrown value for any non-enumerable / circular-safe console inspection.
  console.error("TEMPORARY Gemini ApiError complete dump (raw)", error);
  console.error("TEMPORARY Gemini ApiError complete dump (json)", dump);
}

function shouldLogCompleteGeminiApiError(error: unknown): boolean {
  if (error instanceof ApiError && error.status === 400) {
    return true;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return (
    message.includes("INVALID_ARGUMENT") ||
    message.includes('"code":400') ||
    message.includes('"code": 400')
  );
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
          // Disable thinking so thought tokens do not consume maxOutputTokens.
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      });

      const text = response.text?.trim();

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
      if (shouldLogCompleteGeminiApiError(error)) {
        logCompleteGeminiApiError(error);
      }

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
