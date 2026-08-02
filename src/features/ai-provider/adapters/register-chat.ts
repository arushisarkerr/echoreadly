import { createGeminiChatAdapter } from "./gemini/chat";
import { createOpenAiChatAdapter } from "./openai/chat";
import { createOpenAiTtsAdapter } from "./openai/tts";
import type { AiProviderAdapter } from "./types";

/**
 * Text adapters for Chat, document generation, and Translation.
 */
export function createPhase2ChatAdapters(): AiProviderAdapter[] {
  return [createOpenAiChatAdapter(), createGeminiChatAdapter()];
}

/** Alias — same text adapters serve summary / key points / quiz / etc. */
export function createDocumentGenerationAdapters(): AiProviderAdapter[] {
  return createPhase2ChatAdapters();
}

/** Alias — same text adapters serve Translation (Phase 4). */
export function createTranslationAdapters(): AiProviderAdapter[] {
  return createPhase2ChatAdapters();
}

/** Phase 5 — OpenAI TTS (merges onto the openai provider entry). */
export function createTtsAdapters(): AiProviderAdapter[] {
  return [createOpenAiTtsAdapter()];
}

export { createOpenAiChatAdapter } from "./openai/chat";
export { createGeminiChatAdapter } from "./gemini/chat";
export { createOpenAiTtsAdapter } from "./openai/tts";
export { createFutureTtsAdapterStub } from "./future/tts-stub";
