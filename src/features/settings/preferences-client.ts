/**
 * Client API for user settings / preferences.
 */

import { getApiErrorMessage } from "@/utils";

import type { UserPreferences, UserPreferencesUpdateInput } from "./types";
import type { TtsVoiceDefinition } from "@/features/tts/voices";

export type LoadPreferencesResult =
  | {
      ok: true;
      data: {
        preferences: UserPreferences;
        voices: readonly TtsVoiceDefinition[];
      };
    }
  | { ok: false; error: string };

export type SavePreferencesResult =
  | { ok: true; data: { preferences: UserPreferences } }
  | { ok: false; error: string };

export async function loadUserPreferences(): Promise<LoadPreferencesResult> {
  const response = await fetch("/api/user/preferences", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const json = (await response.json()) as
    | {
        ok: true;
        data: {
          preferences: UserPreferences;
          voices: TtsVoiceDefinition[];
        };
      }
    | { ok: false; error?: unknown };

  if (!response.ok || !json.ok) {
    return {
      ok: false,
      error: getApiErrorMessage(
        "error" in json ? json.error : undefined,
        "Unable to load settings.",
      ),
    };
  }

  return { ok: true, data: json.data };
}

export async function saveUserPreferences(
  input: UserPreferencesUpdateInput,
): Promise<SavePreferencesResult> {
  const response = await fetch("/api/user/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const json = (await response.json()) as
    | { ok: true; data: { preferences: UserPreferences } }
    | { ok: false; error?: unknown };

  if (!response.ok || !json.ok) {
    return {
      ok: false,
      error: getApiErrorMessage(
        "error" in json ? json.error : undefined,
        "Unable to save settings.",
      ),
    };
  }

  return { ok: true, data: json.data };
}
