import { createGeminiChatAdapter } from "./gemini/chat";
import { createOpenAiChatAdapter } from "./openai/chat";
import type { AiProviderAdapter } from "./types";

/**
 * Concrete text adapters for Chat (Phase 2) and document generation (Phase 3).
 * OpenAI + Gemini both expose generateText for chat/summary routing.
 */
export function createPhase2ChatAdapters(): AiProviderAdapter[] {
  return [createOpenAiChatAdapter(), createGeminiChatAdapter()];
}

/** Alias — same text adapters serve summary / key points / quiz / etc. */
export function createDocumentGenerationAdapters(): AiProviderAdapter[] {
  return createPhase2ChatAdapters();
}

export { createOpenAiChatAdapter } from "./openai/chat";
export { createGeminiChatAdapter } from "./gemini/chat";
