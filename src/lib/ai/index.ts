/**
 * Legacy AI helpers still required by Whisper / YouTube STT.
 * Chat, Summary, Translation, TTS, Export, and Embeddings use
 * `@/features/ai-provider` — do not add new direct provider calls here.
 */

export { getOpenAIClient, hasOpenAIKey } from "./openai";
