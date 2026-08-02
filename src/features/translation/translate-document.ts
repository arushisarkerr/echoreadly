import {
  TRANSLATION_LANGUAGES,
  labelForLanguageCode,
} from "@/constants/languages";
import {
  getAiProviderLayer,
  isAiProviderError,
} from "@/features/ai-provider";
import { createServiceClient } from "@/lib/supabase/server";
import { chunkPlainText } from "@/features/processing/chunk-text";
import { recordActivityEvent } from "@/features/history/record-event";

export type TranslationRecord = {
  id: string;
  documentId: string;
  languageCode: string;
  languageLabel: string;
  text: string;
  wordCount: number;
  status: "queued" | "processing" | "ready" | "failed";
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

function toTranslation(row: Record<string, unknown>): TranslationRecord {
  return {
    id: String(row.id),
    documentId: String(row.document_id),
    languageCode: String(row.language_code),
    languageLabel: String(row.language_label),
    text: String(row.text ?? ""),
    wordCount: Number(row.word_count ?? 0),
    status: row.status as TranslationRecord["status"],
    errorMessage: (row.error_message as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listTranslationsForDocument(
  documentId: string,
): Promise<TranslationRecord[]> {
  const client = createServiceClient();
  const { data, error } = await client
    .from("document_translations")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message || "Unable to load translations.");
  }

  return ((data as Record<string, unknown>[] | null) ?? []).map(toTranslation);
}

export async function getTranslation(
  documentId: string,
  languageCode: string,
): Promise<TranslationRecord | null> {
  const client = createServiceClient();
  const { data, error } = await client
    .from("document_translations")
    .select("*")
    .eq("document_id", documentId)
    .eq("language_code", languageCode)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Unable to load translation.");
  }

  return data ? toTranslation(data as Record<string, unknown>) : null;
}

async function translateChunkViaProviderLayer(input: {
  documentId: string;
  system: string;
  chunkText: string;
}): Promise<string> {
  const layer = getAiProviderLayer();
  try {
    const response = await layer.orchestrator.execute({
      feature: "translation",
      documentId: input.documentId,
      system: input.system,
      input: input.chunkText,
      temperature: 0.2,
    });
    if (response.kind !== "text") {
      throw new Error("Translation failed to produce text.");
    }
    return response.text.trim();
  } catch (cause) {
    if (isAiProviderError(cause)) {
      throw new Error(cause.message);
    }
    throw cause instanceof Error ? cause : new Error("Translation failed.");
  }
}

/**
 * Translate original extracted text into a target language.
 * Phase 4: provider calls go through the AI Provider Layer only.
 * Does not overwrite the original document text.
 */
export async function translateDocument(input: {
  documentId: string;
  guestId: string;
  originalText: string;
  languageCode: string;
  documentTitle?: string;
}): Promise<TranslationRecord> {
  const language = TRANSLATION_LANGUAGES.find(
    (item) => item.code === input.languageCode,
  );
  if (!language) {
    throw new Error("Unsupported translation language.");
  }

  if (!input.originalText.trim()) {
    throw new Error("Document has no original text to translate.");
  }

  const existing = await getTranslation(input.documentId, language.code);
  if (existing?.status === "ready" && existing.text) {
    return existing;
  }

  const client = createServiceClient();
  const now = new Date().toISOString();

  const { data: upserted, error: upsertError } = await client
    .from("document_translations")
    .upsert(
      {
        document_id: input.documentId,
        language_code: language.code,
        language_label: language.label,
        text: existing?.text ?? "",
        word_count: existing?.wordCount ?? 0,
        status: "processing",
        error_message: null,
        updated_at: now,
      },
      { onConflict: "document_id,language_code" },
    )
    .select("*")
    .single();

  if (upsertError || !upserted) {
    throw new Error(upsertError?.message || "Unable to start translation.");
  }

  const system = `You are a professional translator. Translate the user's text into ${language.label}. Preserve meaning, paragraph breaks, and tone. Return only the translated text.`;

  try {
    const chunks = chunkPlainText(input.originalText, {
      chunkSize: 3500,
      overlap: 0,
    });
    const translatedParts: string[] = [];

    for (const chunk of chunks) {
      const part = await translateChunkViaProviderLayer({
        documentId: input.documentId,
        system,
        chunkText: chunk.text,
      });
      if (part) {
        translatedParts.push(part);
      }
    }

    const text = translatedParts.join("\n\n").trim();
    if (!text) {
      throw new Error("Translation failed to produce text.");
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const { data: saved, error: saveError } = await client
      .from("document_translations")
      .update({
        text,
        word_count: wordCount,
        status: "ready",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", upserted.id)
      .select("*")
      .single();

    if (saveError || !saved) {
      throw new Error(saveError?.message || "Unable to save translation.");
    }

    await recordActivityEvent({
      guestId: input.guestId,
      documentId: input.documentId,
      eventType: "translated",
      title: `Translated to ${language.label}`,
      detail: input.documentTitle || null,
      metadata: { languageCode: language.code },
    });

    return toTranslation(saved as Record<string, unknown>);
  } catch (cause) {
    const message =
      cause instanceof Error && cause.message
        ? cause.message
        : "Translation failed.";
    await client
      .from("document_translations")
      .update({
        status: "failed",
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", upserted.id);
    throw new Error(message);
  }
}

export { labelForLanguageCode };
