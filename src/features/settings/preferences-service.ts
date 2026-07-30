/**
 * Server persistence for `user_preferences` (Settings).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_TARGET_LANGUAGE,
  isSupportedTargetLanguage,
  type TargetLanguageCode,
} from "@/constants";
import { TTS_PLAYBACK_SPEEDS, type TtsPlaybackSpeed } from "@/features/tts";
import { resolveTtsVoiceId } from "@/features/tts/voices";

import { createDefaultUserPreferences } from "./defaults";
import type {
  ExportFormatPreference,
  FontSizePreference,
  ReadingWidthPreference,
  ThemePreference,
  UserPreferences,
  UserPreferencesRow,
  UserPreferencesUpdateInput,
} from "./types";

export type PreferencesResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function isPlaybackSpeed(value: unknown): value is TtsPlaybackSpeed {
  return TTS_PLAYBACK_SPEEDS.includes(value as TtsPlaybackSpeed);
}

function resolveListeningLanguage(value: unknown): TargetLanguageCode {
  return isSupportedTargetLanguage(value)
    ? value
    : DEFAULT_TARGET_LANGUAGE;
}

function mapRow(row: UserPreferencesRow | null): UserPreferences {
  if (!row) {
    return createDefaultUserPreferences();
  }

  return createDefaultUserPreferences({
    displayName: row.display_name?.trim() ?? "",
    preferredTtsVoice: resolveTtsVoiceId(row.preferred_tts_voice),
    preferredListeningLanguage: resolveListeningLanguage(
      row.preferred_listening_language,
    ),
    playbackSpeed: isPlaybackSpeed(row.playback_speed)
      ? row.playback_speed
      : 1,
    autoPlayNextPage: Boolean(row.auto_play_next_page),
    fontSize: (["sm", "md", "lg"].includes(row.font_size)
      ? row.font_size
      : "md") as FontSizePreference,
    readingWidth: (["narrow", "default", "wide"].includes(row.reading_width)
      ? row.reading_width
      : "default") as ReadingWidthPreference,
    themePreference: (["light", "dark", "system"].includes(
      row.theme_preference,
    )
      ? row.theme_preference
      : "system") as ThemePreference,
    preferredExportFormat: (row.preferred_export_format === "mp3"
      ? "mp3"
      : "mp3") as ExportFormatPreference,
  });
}

/**
 * Load preferences for `userId`, returning defaults when no row exists.
 */
export async function getUserPreferences(
  userId: string,
  client: SupabaseClient,
): Promise<PreferencesResult<UserPreferences>> {
  try {
    const { data, error } = await client
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: mapRow(data as UserPreferencesRow | null) };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load preferences.",
    };
  }
}

/**
 * Upsert the full preferences row for `userId`.
 */
export async function upsertUserPreferences(
  userId: string,
  input: UserPreferencesUpdateInput,
  client: SupabaseClient,
): Promise<PreferencesResult<UserPreferences>> {
  try {
    const payload = {
      user_id: userId,
      display_name: input.displayName || null,
      preferred_tts_voice: input.preferredTtsVoice,
      preferred_listening_language: input.preferredListeningLanguage,
      playback_speed: input.playbackSpeed,
      auto_play_next_page: input.autoPlayNextPage,
      font_size: input.fontSize,
      reading_width: input.readingWidth,
      theme_preference: input.themePreference,
      preferred_export_format: input.preferredExportFormat,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from("user_preferences")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message || "Unable to save preferences.",
      };
    }

    // Keep AccountMenu / Home greeting in sync with display name.
    const { error: authError } = await client.auth.updateUser({
      data: {
        full_name: input.displayName || null,
      },
    });

    if (authError) {
      return {
        ok: false,
        error: authError.message || "Unable to update display name.",
      };
    }

    return { ok: true, data: mapRow(data as UserPreferencesRow) };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save preferences.",
    };
  }
}
