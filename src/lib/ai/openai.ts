import OpenAI from "openai";

/**
 * Shared OpenAI client for Whisper, translation, and TTS.
 */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Add it to .env.local to enable speech-to-text, translation, and audio.",
    );
  }
  return new OpenAI({ apiKey });
}

export function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
