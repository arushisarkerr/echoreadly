/**
 * Server-side validation for user preference payloads.
 */

import {
  isSupportedTargetLanguage,
  type TargetLanguageCode,
} from "@/constants";
import { TTS_PLAYBACK_SPEEDS, type TtsPlaybackSpeed } from "@/features/tts";
import {
  isSupportedTtsVoiceId,
  resolveTtsVoiceId,
  type TtsVoiceId,
} from "@/features/tts/voices";
import type {
  ValidationFailure,
  ValidationResult,
} from "@/lib/security/validation";

import {
  EXPORT_FORMAT_PREFERENCES,
  FONT_SIZE_PREFERENCES,
  MAX_DISPLAY_NAME_LENGTH,
  READING_WIDTH_PREFERENCES,
  THEME_PREFERENCES,
  type ExportFormatPreference,
  type FontSizePreference,
  type ReadingWidthPreference,
  type ThemePreference,
  type UserPreferencesUpdateInput,
} from "./types";

function failure(message: string): ValidationFailure {
  return { ok: false, code: "VALIDATION", message };
}

export function validateDisplayName(
  value: unknown,
): ValidationResult<string> {
  if (value === undefined || value === null) {
    return { ok: true, data: "" };
  }

  if (typeof value !== "string") {
    return failure("displayName must be a string.");
  }

  const displayName = value.trim();
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return failure(
      `displayName must be at most ${MAX_DISPLAY_NAME_LENGTH} characters.`,
    );
  }

  return { ok: true, data: displayName };
}

export function validatePlaybackSpeed(
  value: unknown,
): ValidationResult<TtsPlaybackSpeed> {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;

  if (
    !TTS_PLAYBACK_SPEEDS.includes(numeric as TtsPlaybackSpeed)
  ) {
    return failure("playbackSpeed must be 1, 1.25, 1.5, or 2.");
  }

  return { ok: true, data: numeric as TtsPlaybackSpeed };
}

export function validateAutoPlayNextPage(
  value: unknown,
): ValidationResult<boolean> {
  if (typeof value !== "boolean") {
    return failure("autoPlayNextPage must be a boolean.");
  }
  return { ok: true, data: value };
}

export function validateFontSize(
  value: unknown,
): ValidationResult<FontSizePreference> {
  if (
    typeof value !== "string" ||
    !FONT_SIZE_PREFERENCES.includes(value as FontSizePreference)
  ) {
    return failure("fontSize must be sm, md, or lg.");
  }
  return { ok: true, data: value as FontSizePreference };
}

export function validateReadingWidth(
  value: unknown,
): ValidationResult<ReadingWidthPreference> {
  if (
    typeof value !== "string" ||
    !READING_WIDTH_PREFERENCES.includes(value as ReadingWidthPreference)
  ) {
    return failure("readingWidth must be narrow, default, or wide.");
  }
  return { ok: true, data: value as ReadingWidthPreference };
}

export function validateThemePreference(
  value: unknown,
): ValidationResult<ThemePreference> {
  if (
    typeof value !== "string" ||
    !THEME_PREFERENCES.includes(value as ThemePreference)
  ) {
    return failure("themePreference must be light, dark, or system.");
  }
  return { ok: true, data: value as ThemePreference };
}

export function validateExportFormat(
  value: unknown,
): ValidationResult<ExportFormatPreference> {
  if (
    typeof value !== "string" ||
    !EXPORT_FORMAT_PREFERENCES.includes(value as ExportFormatPreference)
  ) {
    return failure("preferredExportFormat must be mp3.");
  }
  return { ok: true, data: value as ExportFormatPreference };
}

export function validatePreferredVoice(
  value: unknown,
): ValidationResult<TtsVoiceId> {
  if (typeof value !== "string" || !value.trim()) {
    return failure("preferredTtsVoice is required.");
  }

  if (!isSupportedTtsVoiceId(value)) {
    return failure("Unsupported voice.");
  }

  return { ok: true, data: resolveTtsVoiceId(value) };
}

export function validatePreferredListeningLanguage(
  value: unknown,
): ValidationResult<TargetLanguageCode> {
  if (!isSupportedTargetLanguage(value)) {
    return failure("preferredListeningLanguage is not supported.");
  }
  return { ok: true, data: value };
}

type PreferencesBody = {
  displayName?: unknown;
  preferredTtsVoice?: unknown;
  preferredListeningLanguage?: unknown;
  playbackSpeed?: unknown;
  autoPlayNextPage?: unknown;
  fontSize?: unknown;
  readingWidth?: unknown;
  themePreference?: unknown;
  preferredExportFormat?: unknown;
};

/**
 * Validate a full preferences update payload.
 */
export function validateUserPreferencesUpdate(
  body: PreferencesBody,
): ValidationResult<UserPreferencesUpdateInput> {
  const displayName = validateDisplayName(body.displayName);
  if (!displayName.ok) return displayName;

  const preferredTtsVoice = validatePreferredVoice(body.preferredTtsVoice);
  if (!preferredTtsVoice.ok) return preferredTtsVoice;

  const preferredListeningLanguage = validatePreferredListeningLanguage(
    body.preferredListeningLanguage,
  );
  if (!preferredListeningLanguage.ok) return preferredListeningLanguage;

  const playbackSpeed = validatePlaybackSpeed(body.playbackSpeed);
  if (!playbackSpeed.ok) return playbackSpeed;

  const autoPlayNextPage = validateAutoPlayNextPage(body.autoPlayNextPage);
  if (!autoPlayNextPage.ok) return autoPlayNextPage;

  const fontSize = validateFontSize(body.fontSize);
  if (!fontSize.ok) return fontSize;

  const readingWidth = validateReadingWidth(body.readingWidth);
  if (!readingWidth.ok) return readingWidth;

  const themePreference = validateThemePreference(body.themePreference);
  if (!themePreference.ok) return themePreference;

  const preferredExportFormat = validateExportFormat(
    body.preferredExportFormat ?? "mp3",
  );
  if (!preferredExportFormat.ok) return preferredExportFormat;

  return {
    ok: true,
    data: {
      displayName: displayName.data,
      preferredTtsVoice: preferredTtsVoice.data,
      preferredListeningLanguage: preferredListeningLanguage.data,
      playbackSpeed: playbackSpeed.data,
      autoPlayNextPage: autoPlayNextPage.data,
      fontSize: fontSize.data,
      readingWidth: readingWidth.data,
      themePreference: themePreference.data,
      preferredExportFormat: preferredExportFormat.data,
    },
  };
}
