/**
 * Shared language catalogs for translation + TTS.
 */

export type LanguageOption = {
  code: string;
  label: string;
};

export const TRANSLATION_LANGUAGES: LanguageOption[] = [
  { code: "bn", label: "Bangla" },
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "pt", label: "Portuguese" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ar", label: "Arabic" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
  { code: "ko", label: "Korean" },
];

export const TTS_LANGUAGES: LanguageOption[] = [
  { code: "bn", label: "Bangla" },
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "pt", label: "Portuguese" },
  { code: "es", label: "Spanish" },
  { code: "ar", label: "Arabic" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
  { code: "ko", label: "Korean" },
];

export const TTS_VOICES = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "onyx",
  "nova",
  "sage",
  "shimmer",
  "verse",
] as const;

export type TtsVoice = (typeof TTS_VOICES)[number];

export function labelForLanguageCode(code: string): string {
  if (code === "original") {
    return "Original";
  }
  const match =
    TRANSLATION_LANGUAGES.find((item) => item.code === code) ||
    TTS_LANGUAGES.find((item) => item.code === code);
  return match?.label || code;
}
