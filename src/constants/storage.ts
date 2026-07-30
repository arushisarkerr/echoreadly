/**
 * Supabase Storage identifiers used by EchoReadly.
 */

/** Private bucket for uploaded PDF documents. */
export const PDFS_BUCKET = "pdfs";

/** Private bucket for cached TTS audio exports (MP3). */
export const AUDIO_EXPORTS_BUCKET = "audio-exports";

/** Signed URL lifetime for audio export downloads (1 hour). */
export const AUDIO_EXPORT_SIGNED_URL_EXPIRES_IN = 60 * 60;
