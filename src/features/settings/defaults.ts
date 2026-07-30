/**
 * Default user preferences.
 */

import { DEFAULT_TTS_VOICE } from "@/features/tts";
import { resolveTtsVoiceId } from "@/features/tts/voices";

import type { UserPreferences } from "./types";

export function createDefaultUserPreferences(
  overrides?: Partial<UserPreferences>,
): UserPreferences {
  return {
    displayName: "",
    preferredTtsVoice: resolveTtsVoiceId(DEFAULT_TTS_VOICE),
    playbackSpeed: 1,
    autoPlayNextPage: false,
    fontSize: "md",
    readingWidth: "default",
    themePreference: "system",
    preferredExportFormat: "mp3",
    ...overrides,
  };
}
