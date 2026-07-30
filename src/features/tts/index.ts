/**
 * Text-to-speech feature — OpenAI-backed narration for summaries and pages.
 */

export { AudioPlayer } from "./audio-player";
export { createOpenAiTtsProvider, OpenAiTtsProvider } from "./openai-tts";
export { joinPageChunkText, requestTtsAudio } from "./tts-service";
export type { TtsProvider } from "./tts-provider";
export { useTts, type UseTtsOptions, type UseTtsState } from "./use-tts";
export { useVoicePreference } from "./use-voice-preference";
export { VoicesWorkspace } from "./voices-workspace";
export {
  getTtsVoiceDefinition,
  isSupportedTtsVoiceId,
  resolveTtsVoiceId,
  TTS_VOICE_CATALOG,
  TTS_VOICE_PREVIEW_TEXT,
  type TtsVoiceDefinition,
  type TtsVoiceId,
  type TtsVoiceTone,
} from "./voices";
export {
  DEFAULT_TTS_MODEL,
  DEFAULT_TTS_VOICE,
  MAX_TTS_INPUT_CHARS,
  TTS_PLAYBACK_SPEEDS,
  type TtsAudioResult,
  type TtsError,
  type TtsErrorCode,
  type TtsPlaybackSpeed,
  type TtsPlaybackStatus,
  type TtsSource,
  type TtsSynthesizeInput,
  type TtsSynthesizeResult,
} from "./types";
