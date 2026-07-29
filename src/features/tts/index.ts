/**
 * Text-to-speech feature — OpenAI-backed narration for summaries and pages.
 */

export { AudioPlayer } from "./audio-player";
export { createOpenAiTtsProvider, OpenAiTtsProvider } from "./openai-tts";
export { joinPageChunkText, requestTtsAudio } from "./tts-service";
export type { TtsProvider } from "./tts-provider";
export { useTts, type UseTtsState } from "./use-tts";
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
