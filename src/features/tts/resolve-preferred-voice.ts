/**
 * Server-safe user TTS voice preference helpers.
 * Always pass an authenticated Supabase client — never imports the browser client.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_TTS_VOICE } from "./types";
import { resolveTtsVoiceId, type TtsVoiceId } from "./voices";

export type PreferencesResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Load preferred voice for `userId`. Falls back to the studio default when missing.
 */
export async function getPreferredTtsVoice(
  userId: string,
  client: SupabaseClient,
): Promise<PreferencesResult<TtsVoiceId>> {
  try {
    const { data, error } = await client
      .from("user_preferences")
      .select("preferred_tts_voice")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message };
    }

    const preferred =
      (data as { preferred_tts_voice?: string } | null)?.preferred_tts_voice ??
      DEFAULT_TTS_VOICE;

    return { ok: true, data: resolveTtsVoiceId(preferred) };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load voice preference.",
    };
  }
}

/**
 * Resolve preferred voice with a non-failing default (for TTS synthesis).
 */
export async function resolvePreferredTtsVoiceForUser(
  userId: string,
  client: SupabaseClient,
): Promise<TtsVoiceId> {
  const result = await getPreferredTtsVoice(userId, client);
  if (!result.ok) {
    return resolveTtsVoiceId(DEFAULT_TTS_VOICE);
  }
  return result.data;
}

/**
 * Persist preferred TTS voice for `userId`.
 */
export async function setPreferredTtsVoice(
  userId: string,
  voice: TtsVoiceId,
  client: SupabaseClient,
): Promise<PreferencesResult<TtsVoiceId>> {
  try {
    const resolved = resolveTtsVoiceId(voice);

    const { data, error } = await client
      .from("user_preferences")
      .upsert(
        {
          user_id: userId,
          preferred_tts_voice: resolved,
        },
        { onConflict: "user_id" },
      )
      .select("preferred_tts_voice")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      data: resolveTtsVoiceId(
        (data as { preferred_tts_voice: string }).preferred_tts_voice,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save voice preference.",
    };
  }
}
