/**
 * Stream text from a provider with Gemini fallback when OpenAI fails early.
 */

import type {
  AiGenerateInput,
  AiProvider,
  AiStreamChunk,
} from "./ai-provider";
import {
  getSharedGeminiFallbackProvider,
  shouldFallbackToGemini,
  summarizeErrorType,
} from "./summary-service";
import { logger } from "@/lib/logger";

async function* streamOrBuffer(
  provider: AiProvider,
  input: AiGenerateInput,
): AsyncGenerator<AiStreamChunk, void, void> {
  if (provider.streamText) {
    yield* provider.streamText(input);
    return;
  }

  const result = await provider.generateText(input);
  if (!result.ok) {
    yield { type: "error", error: result.error };
    return;
  }

  yield { type: "delta", text: result.data.text };
  yield {
    type: "done",
    text: result.data.text,
    model: result.data.model,
  };
}

/**
 * Yield deltas from the primary provider; on early failure, fall back to Gemini.
 */
export async function* streamTextWithFallback(
  primary: AiProvider,
  input: AiGenerateInput,
  options?: { route?: string },
): AsyncGenerator<AiStreamChunk, void, void> {
  let emittedDelta = false;

  for await (const chunk of streamOrBuffer(primary, input)) {
    if (chunk.type === "delta") {
      emittedDelta = true;
      yield chunk;
      continue;
    }

    if (chunk.type === "done") {
      yield chunk;
      return;
    }

    if (chunk.type === "error") {
      if (
        !emittedDelta &&
        shouldFallbackToGemini(chunk.error) &&
        primary.name !== "gemini"
      ) {
        const fallback = getSharedGeminiFallbackProvider();
        if (fallback.isConfigured()) {
          logger.warn("AI stream falling back to Gemini", {
            route: options?.route,
            primaryProvider: primary.name,
            errorType: summarizeErrorType(chunk.error),
          });

          for await (const fallbackChunk of streamOrBuffer(fallback, {
            ...input,
            // Never reuse the OpenAI model id on Gemini.
            model: undefined,
          })) {
            yield fallbackChunk;
          }
          return;
        }
      }

      yield chunk;
      return;
    }
  }
}
