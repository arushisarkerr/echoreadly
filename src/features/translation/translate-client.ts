/**
 * Client helpers for document translation.
 */

import { getApiErrorMessage } from "@/utils";

import type {
  TranslateRequestInput,
  TranslationResult,
} from "./types";

export type TranslateRequestResult =
  | { ok: true; data: TranslationResult }
  | { ok: false; error: string };

export async function requestTranslation(
  payload: TranslateRequestInput,
): Promise<TranslateRequestResult> {
  const response = await fetch("/api/documents/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as
    | { ok: true; data: TranslationResult }
    | { ok: false; error?: unknown };

  if (!response.ok || !json.ok) {
    return {
      ok: false,
      error: getApiErrorMessage(
        "error" in json ? json.error : undefined,
        "Unable to translate.",
      ),
    };
  }

  return { ok: true, data: json.data };
}
