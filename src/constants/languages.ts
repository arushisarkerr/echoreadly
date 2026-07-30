/**
 * Supported translation target languages (BCP-47-ish codes).
 * Server validation must use this allowlist only.
 */

export type TargetLanguageCode =
  | "en"
  | "es"
  | "fr"
  | "de"
  | "it"
  | "pt"
  | "bn"
  | "hi"
  | "ja"
  | "ko"
  | "zh"
  | "ar"
  | "ru"
  | "nl"
  | "tr";

export type TargetLanguageDefinition = {
  code: TargetLanguageCode;
  name: string;
  nativeName: string;
};

export const TARGET_LANGUAGE_CATALOG: readonly TargetLanguageDefinition[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
] as const;

const TARGET_LANGUAGE_SET = new Set<string>(
  TARGET_LANGUAGE_CATALOG.map((entry) => entry.code),
);

export function isSupportedTargetLanguage(
  value: unknown,
): value is TargetLanguageCode {
  return typeof value === "string" && TARGET_LANGUAGE_SET.has(value);
}

export function getTargetLanguageDefinition(
  code: TargetLanguageCode,
): TargetLanguageDefinition {
  return (
    TARGET_LANGUAGE_CATALOG.find((entry) => entry.code === code) ??
    TARGET_LANGUAGE_CATALOG[0]!
  );
}

export const DEFAULT_TARGET_LANGUAGE: TargetLanguageCode = "es";

/** Max characters for selection-scope translation input. */
export const MAX_TRANSLATION_SELECTION_CHARS = 8_000;

/** Max characters of source text sent to the model per request. */
export const MAX_TRANSLATION_SOURCE_CHARS = 60_000;
