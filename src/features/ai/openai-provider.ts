/**
 * OpenAI Responses API provider.
 * Vendor SDK usage is isolated to this module.
 */

import OpenAI from "openai";

import type { AiGenerateInput, AiGenerateResult, AiProvider } from "./ai-provider";
import { DEFAULT_SUMMARY_MODEL, type AiError } from "./types";

function classifyOpenAiError(error: unknown): AiError {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 429 || error.status === 503) {
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

    const apiMessage = (error.message || "").toLowerCase();
    if (
      apiMessage.includes("quota") ||
      apiMessage.includes("rate limit") ||
      apiMessage.includes("temporarily unavailable")
    ) {
      return {
        code: "rate_limit",
        message: error.message || "OpenAI rate limit reached. Please try again shortly.",
      };
    }

    return {
      code: "api_error",
      message: error.message || "OpenAI request failed.",
    };
  }

  if (error instanceof OpenAI.RateLimitError) {
    return {
      code: "rate_limit",
      message: "OpenAI rate limit reached. Please try again shortly.",
    };
  }

  if (error instanceof OpenAI.AuthenticationError) {
    return {
      code: "missing_api_key",
      message: "OpenAI API key is invalid or unauthorized.",
    };
  }

  const message =
    error instanceof Error
      ? error.message
      : "An unexpected OpenAI error occurred.";

  const normalized = message.toLowerCase();

  if (
    normalized.includes("rate limit") ||
    normalized.includes("429") ||
    normalized.includes("quota") ||
    normalized.includes("temporarily unavailable")
  ) {
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

export type OpenAiProviderOptions = {
  apiKey?: string;
  defaultModel?: string;
};

/**
 * OpenAI implementation of the AiProvider interface using the Responses API.
 */
export class OpenAiProvider implements AiProvider {
  readonly name = "openai";

  private readonly client: OpenAI | null;
  private readonly defaultModel: string;

  constructor(options: OpenAiProviderOptions = {}) {
    const apiKey = options.apiKey?.trim();

    this.client = apiKey ? new OpenAI({ apiKey }) : null;
    this.defaultModel = options.defaultModel ?? DEFAULT_SUMMARY_MODEL;
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
            "OpenAI API key is not configured. Set OPENAI_API_KEY in .env.local.",
        },
      };
    }

    const model = input.model ?? this.defaultModel;

    try {
      const response = await this.client.responses.create({
        model,
        instructions: input.instructions,
        input: input.input,
        max_output_tokens: input.maxOutputTokens,
      });

      const text = response.output_text?.trim();

      if (!text) {
        return {
          ok: false,
          error: {
            code: "api_error",
            message: "OpenAI returned an empty summary.",
          },
        };
      }

      return {
        ok: true,
        data: {
          text,
          model: response.model ?? model,
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

/**
 * Factory for the default OpenAI provider using server environment config.
 */
export function createOpenAiProvider(apiKey?: string): OpenAiProvider {
  return new OpenAiProvider({ apiKey });
}
