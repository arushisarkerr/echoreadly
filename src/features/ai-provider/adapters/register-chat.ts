import { createGeminiChatAdapter } from "./gemini/chat";
import { createOpenAiChatAdapter } from "./openai/chat";
import type { AiProviderAdapter } from "./types";

/**
 * Concrete text adapters for Chat, document generation, and Translation.
 * OpenAI + Gemini expose generateText for chat / summary / translation routing.
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

export { createOpenAiChatAdapter } from "./openai/chat";
export { createGeminiChatAdapter } from "./gemini/chat";
