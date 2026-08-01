import { createGeminiChatAdapter } from "./gemini/chat";
import { createOpenAiChatAdapter } from "./openai/chat";
import type { AiProviderAdapter } from "./types";

/**
 * Concrete adapters enabled for Phase 2 (Chat).
 * Additional modality adapters land in later phases.
 */
export function createPhase2ChatAdapters(): AiProviderAdapter[] {
  return [createOpenAiChatAdapter(), createGeminiChatAdapter()];
}

export { createOpenAiChatAdapter } from "./openai/chat";
export { createGeminiChatAdapter } from "./gemini/chat";
