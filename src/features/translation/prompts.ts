/**
 * Translation prompts for the AI provider pipeline.
 */

import {
  getTargetLanguageDefinition,
  type TargetLanguageCode,
} from "@/constants";

import type { TranslationScope } from "./types";

export function buildTranslationInstructions(
  targetLanguage: TargetLanguageCode,
): string {
  const language = getTargetLanguageDefinition(targetLanguage);

  return [
    "You are EchoReadly, an expert document translator.",
    `Translate the provided source text into ${language.name} (${language.nativeName}).`,
    "Preserve meaning, tone, and structure as closely as possible.",
    "Do not add commentary, notes, or explanations.",
    "Do not invent content that is not in the source.",
    "Return only the translated text.",
  ].join("\n");
}

export function buildTranslationInput(input: {
  scope: TranslationScope;
  targetLanguage: TargetLanguageCode;
  sourceText: string;
  documentTitle?: string;
  pageNumber?: number | null;
}): string {
  const language = getTargetLanguageDefinition(input.targetLanguage);
  const titleLine = input.documentTitle
    ? `Document: ${input.documentTitle}\n`
    : "";
  const scopeLine =
    input.scope === "page" && input.pageNumber
      ? `Scope: page ${input.pageNumber}\n`
      : `Scope: ${input.scope}\n`;

  return (
    `${titleLine}${scopeLine}` +
    `Target language: ${language.name}\n\n` +
    `Translate the following source text.\n\n` +
    `<source>\n${input.sourceText}\n</source>`
  );
}

export function getTranslationMaxOutputTokens(sourceLength: number): number {
  return Math.min(8_000, Math.max(800, Math.ceil(sourceLength * 1.35)));
}
