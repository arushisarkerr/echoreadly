import { createElevenLabsTtsAdapter } from "./elevenlabs/tts";
import { createGeminiChatAdapter } from "./gemini/chat";
import { createGoogleTtsAdapter } from "./google/tts";
import { createOpenAiChatAdapter } from "./openai/chat";
import { createOpenAiEmbeddingAdapter } from "./openai/embedding";
import { createOpenAiTtsAdapter } from "./openai/tts";
import { createOpenRouterChatAdapter } from "./openrouter/chat";
import type { AiProviderAdapter } from "./types";

/**
 * Text adapters for Chat, document generation, and Translation.
 */
export function createPhase2ChatAdapters(): AiProviderAdapter[] {
  return [
    createOpenAiChatAdapter(),
    createGeminiChatAdapter(),
    createOpenRouterChatAdapter(),
  ];
}

/** Alias — same text adapters serve summary / key points / quiz / etc. */
export function createDocumentGenerationAdapters(): AiProviderAdapter[] {
  return createPhase2ChatAdapters();
}

/** Alias — same text adapters serve Translation (Phase 4). */
export function createTranslationAdapters(): AiProviderAdapter[] {
  return createPhase2ChatAdapters();
}

/** TTS adapters — order controlled by TTS_PROVIDER_ORDER. */
export function createTtsAdapters(): AiProviderAdapter[] {
  return [
    createOpenAiTtsAdapter(),
    createElevenLabsTtsAdapter(),
    createGoogleTtsAdapter(),
  ];
}

/** Phase 7 — OpenAI embeddings (merges onto the openai provider entry). */
export function createEmbeddingAdapters(): AiProviderAdapter[] {
  return [createOpenAiEmbeddingAdapter()];
}

export { createOpenAiChatAdapter } from "./openai/chat";
export { createGeminiChatAdapter } from "./gemini/chat";
export { createOpenRouterChatAdapter } from "./openrouter/chat";
export { createOpenAiTtsAdapter } from "./openai/tts";
export { createElevenLabsTtsAdapter } from "./elevenlabs/tts";
export { createGoogleTtsAdapter } from "./google/tts";
export { createOpenAiEmbeddingAdapter } from "./openai/embedding";
export { createFutureTtsAdapterStub } from "./future/tts-stub";
export { createFutureEmbeddingAdapterStub } from "./future/embedding-stub";