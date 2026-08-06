/**
 * Gemini-TTS prebuilt voices (Cloud Gemini-TTS voice options).
 * Listen-page catalog only — does not alter Reader / shared OpenAI TTS_VOICES.
 */

export const GEMINI_TTS_VOICES = [
  "Achernar",
  "Achird",
  "Algenib",
  "Algieba",
  "Alnilam",
  "Aoede",
  "Autonoe",
  "Callirrhoe",
  "Charon",
  "Despina",
  "Enceladus",
  "Erinome",
  "Fenrir",
  "Gacrux",
  "Iapetus",
  "Kore",
  "Laomedeia",
  "Leda",
  "Orus",
  "Pulcherrima",
  "Puck",
  "Rasalgethi",
  "Sadachbia",
  "Sadaltager",
  "Schedar",
  "Sulafat",
  "Umbriel",
  "Vindemiatrix",
  "Zephyr",
  "Zubenelgenubi",
] as const;

export type GeminiTtsVoice = (typeof GEMINI_TTS_VOICES)[number];

export const PINNED_VOICES_STORAGE_KEY = "echoreadly.listen.pinnedVoices";

export function readPinnedVoices(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(PINNED_VOICES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const allowed = new Set<string>(GEMINI_TTS_VOICES);
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => allowed.has(item));
  } catch {
    return [];
  }
}

export function storePinnedVoices(voices: string[]): void {
  try {
    window.localStorage.setItem(
      PINNED_VOICES_STORAGE_KEY,
      JSON.stringify(voices),
    );
  } catch {
    // ignore
  }
}

/** Pinned first (stable pin order), then remaining A→Z. */
export function orderVoicesWithPins(
  pinned: string[],
  all: readonly string[] = GEMINI_TTS_VOICES,
): string[] {
  const pinSet = new Set(pinned);
  const pinnedOrdered = pinned.filter((voice) => all.includes(voice));
  const rest = all
    .filter((voice) => !pinSet.has(voice))
    .slice()
    .sort((a, b) => a.localeCompare(b));
  return [...pinnedOrdered, ...rest];
}

export function togglePinnedVoice(
  voice: string,
  pinned: string[],
): string[] {
  if (pinned.includes(voice)) {
    return pinned.filter((item) => item !== voice);
  }
  return [...pinned, voice];
}
