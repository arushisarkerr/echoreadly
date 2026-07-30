/**
 * Supported OpenAI TTS voices for EchoReadly studio narration.
 * Only IDs in this catalog may be persisted or synthesized.
 */

import { DEFAULT_TTS_VOICE } from "./types";

export type TtsVoiceId =
  | "alloy"
  | "echo"
  | "fable"
  | "onyx"
  | "nova"
  | "shimmer";

export type TtsVoiceTone = "neutral" | "warm" | "bright" | "deep" | "soft";

export type TtsVoiceDefinition = {
  id: TtsVoiceId;
  /** Display label in the Voice Library. */
  name: string;
  /** Short description for cards. */
  description: string;
  tone: TtsVoiceTone;
  /** Rough presentation cue — not a gender claim about users. */
  presentation: "feminine" | "masculine" | "neutral";
};

/**
 * Production voice catalog (OpenAI `tts-1` / `tts-1-hd` compatible).
 */
export const TTS_VOICE_CATALOG: readonly TtsVoiceDefinition[] = [
  {
    id: "alloy",
    name: "Alloy",
    description: "Balanced studio default — clear and versatile.",
    tone: "neutral",
    presentation: "neutral",
  },
  {
    id: "nova",
    name: "Nova",
    description: "Bright and expressive — great for longer listens.",
    tone: "bright",
    presentation: "feminine",
  },
  {
    id: "shimmer",
    name: "Shimmer",
    description: "Soft and calm — easy on longer sessions.",
    tone: "soft",
    presentation: "feminine",
  },
  {
    id: "echo",
    name: "Echo",
    description: "Warm mid-range — natural conversational feel.",
    tone: "warm",
    presentation: "masculine",
  },
  {
    id: "onyx",
    name: "Onyx",
    description: "Deep and steady — documentary-style presence.",
    tone: "deep",
    presentation: "masculine",
  },
  {
    id: "fable",
    name: "Fable",
    description: "Storytelling color — expressive narration.",
    tone: "warm",
    presentation: "neutral",
  },
] as const;

const VOICE_IDS = new Set<string>(
  TTS_VOICE_CATALOG.map((voice) => voice.id),
);

/** Fixed sample used for voice previews — never taken from the client. */
export const TTS_VOICE_PREVIEW_TEXT =
  "Hello from EchoReadly. This is a short preview of how I sound when reading your documents aloud.";

export function isSupportedTtsVoiceId(value: unknown): value is TtsVoiceId {
  return typeof value === "string" && VOICE_IDS.has(value);
}

export function getTtsVoiceDefinition(
  id: string,
): TtsVoiceDefinition | null {
  return TTS_VOICE_CATALOG.find((voice) => voice.id === id) ?? null;
}

/**
 * Resolve a preferred voice to a supported ID.
 * Unknown or retired voices fall back to the studio default.
 */
export function resolveTtsVoiceId(
  preferred: string | null | undefined,
): TtsVoiceId {
  if (isSupportedTtsVoiceId(preferred)) {
    return preferred;
  }
  return isSupportedTtsVoiceId(DEFAULT_TTS_VOICE)
    ? DEFAULT_TTS_VOICE
    : "alloy";
}
