/**
 * Text-to-speech shared types.
 */

export type TtsPlaybackSpeed = 1 | 1.25 | 1.5 | 2;

export const TTS_PLAYBACK_SPEEDS: TtsPlaybackSpeed[] = [1, 1.25, 1.5, 2];

export type TtsSource = "summary" | "page";

export type TtsErrorCode =
  | "missing_api_key"
  | "rate_limit"
  | "api_error"
  | "empty_text"
  | "invalid_input";

export type TtsError = {
  code: TtsErrorCode;
  message: string;
};

export type TtsSynthesizeInput = {
  text: string;
  voice?: string;
  model?: string;
  /** Provider-side synthesis speed (OpenAI supports 0.25–4). */
  speed?: number;
};

export type TtsAudioResult = {
  /** Raw audio bytes (e.g. mp3). */
  audio: Uint8Array;
  mimeType: string;
  model: string;
  voice: string;
  /** Characters actually synthesized (may be truncated). */
  characterCount: number;
};

export type TtsSynthesizeResult =
  | { ok: true; data: TtsAudioResult }
  | { ok: false; error: TtsError };

export type TtsPlaybackStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "error";

/** Default OpenAI TTS model. */
export const DEFAULT_TTS_MODEL = "tts-1";

/** Default OpenAI voice. */
export const DEFAULT_TTS_VOICE = "alloy" as const;

/** OpenAI speech input limit. */
export const MAX_TTS_INPUT_CHARS = 4096;
