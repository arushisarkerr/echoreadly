import OpenAI from "openai";

/**
 * Shared OpenAI SDK client for Whisper / YouTube speech-to-text only.
 * Migrated AI features (chat, summary, translation, TTS, embeddings)
 * must use the AI Provider Layer — not this client.
 */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Add it to .env.local to enable speech-to-text.",
    );
  }
  return new OpenAI({ apiKey });
}

export function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
