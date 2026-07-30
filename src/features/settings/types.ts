/**
 * User settings / preference types — single `user_preferences` table.
 */

import type { TtsPlaybackSpeed } from "@/features/tts";
import type { TtsVoiceId } from "@/features/tts/voices";

export type ThemePreference = "light" | "dark" | "system";

export type FontSizePreference = "sm" | "md" | "lg";

export type ReadingWidthPreference = "narrow" | "default" | "wide";

/** Provider-supported export format (OpenAI TTS → MP3). */
export type ExportFormatPreference = "mp3";

export type UserPreferences = {
  displayName: string;
  preferredTtsVoice: TtsVoiceId;
  playbackSpeed: TtsPlaybackSpeed;
  autoPlayNextPage: boolean;
  fontSize: FontSizePreference;
  readingWidth: ReadingWidthPreference;
  themePreference: ThemePreference;
  preferredExportFormat: ExportFormatPreference;
};

export type UserPreferencesRow = {
  user_id: string;
  preferred_tts_voice: string;
  display_name: string | null;
  playback_speed: number;
  auto_play_next_page: boolean;
  font_size: string;
  reading_width: string;
  theme_preference: string;
  preferred_export_format: string;
  created_at: string;
  updated_at: string;
};

export type UserPreferencesUpdateInput = {
  displayName: string;
  preferredTtsVoice: TtsVoiceId;
  playbackSpeed: TtsPlaybackSpeed;
  autoPlayNextPage: boolean;
  fontSize: FontSizePreference;
  readingWidth: ReadingWidthPreference;
  themePreference: ThemePreference;
  preferredExportFormat: ExportFormatPreference;
};

export const THEME_PREFERENCES: ThemePreference[] = [
  "light",
  "dark",
  "system",
];

export const FONT_SIZE_PREFERENCES: FontSizePreference[] = ["sm", "md", "lg"];

export const READING_WIDTH_PREFERENCES: ReadingWidthPreference[] = [
  "narrow",
  "default",
  "wide",
];

export const EXPORT_FORMAT_PREFERENCES: ExportFormatPreference[] = ["mp3"];

export const MAX_DISPLAY_NAME_LENGTH = 80;

export const THEME_STORAGE_KEY = "echoreadly-theme";
