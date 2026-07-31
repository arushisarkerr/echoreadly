import { toFile } from "openai";

import { getOpenAIClient } from "@/lib/ai/openai";

export type WhisperResult = {
  text: string;
  language: string | null;
  durationSeconds: number | null;
  confidence: number | null;
};

/**
 * Speech-to-text via OpenAI Whisper for YouTube audio fallback.
 */
export async function transcribeAudioWithWhisper(
  bytes: Uint8Array,
  filename = "youtube-audio.webm",
): Promise<WhisperResult> {
  const client = getOpenAIClient();
  const file = await toFile(Buffer.from(bytes), filename);

  const result = await client.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "verbose_json",
  });

  const text = (result.text || "").trim();
  if (!text) {
    throw new Error("Speech recognition failed to produce text from the audio.");
  }

  const verbose = result as {
    text?: string;
    language?: string;
    duration?: number;
    segments?: Array<{ avg_logprob?: number }>;
  };

  let confidence: number | null = null;
  if (Array.isArray(verbose.segments) && verbose.segments.length > 0) {
    const probs = verbose.segments
      .map((segment) => segment.avg_logprob)
      .filter((value): value is number => typeof value === "number");
    if (probs.length > 0) {
      const avg = probs.reduce((sum, value) => sum + value, 0) / probs.length;
      confidence = Math.max(0, Math.min(1, Math.exp(avg)));
    }
  }

  return {
    text,
    language: verbose.language ?? null,
    durationSeconds:
      typeof verbose.duration === "number" ? verbose.duration : null,
    confidence,
  };
}
