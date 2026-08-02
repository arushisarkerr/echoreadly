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

function buildDocumentTranslationSystemPrompt(
  languageLabel: string,
  languageCode: string,
): string {
  return [
    "You are a professional document translator (PDF, DOCX, TXT, email, website, YouTube transcript).",
    `Translate the document into ${languageLabel} (language code: ${languageCode}).`,
    "",
    "Fidelity rules (mandatory):",
    "- Never hallucinate.",
    "- Never invent missing text.",
    "- Never omit any sentence.",
    "- Never merge paragraphs.",
    "- Never reorder paragraphs.",
    "- Never change numbers.",
    "- Never change dates unless explicitly requested.",
    "- Never change currencies.",
    "- Never change measurements.",
    "- Never change names unless there is a standard localized spelling.",
    "- Translate only natural language.",
    "- Keep whitespace and document structure whenever possible.",
    "- If any text cannot be translated confidently, leave it unchanged rather than inventing content.",
    "- Return ONLY the translated document text.",
    "",
    "Preserve document structure as closely as possible:",
    "- Preserve formatting, paragraph breaks, blank lines, lists, headings, indentation, and line order.",
    "- Never remove content.",
    "- Never summarize, shorten, expand, explain, or rewrite for style.",
    "- Never add comments, notes, preface, markdown, code fences, or code blocks.",
    "",
    "Do NOT translate; keep exactly unchanged:",
    "email addresses, URLs, domain names, phone numbers, account numbers, IBAN, SWIFT/BIC,",
    "reference numbers, IDs, tracking numbers, invoice numbers, UUIDs, file paths,",
    "JSON, XML, HTML, source code, and variable names.",
    "",
    "Translate naturally: titles, headings, body text, bullet points, labels, and captions.",
    "",
    "Email mode: translate Subject, greetings, body, and closing.",
    "Preserve From, To, CC, BCC, Date, Time, and email addresses exactly.",
    "",
    "Bank document mode: do not translate IBAN, SWIFT, BIC, or account numbers;",
    "only translate surrounding labels.",
  ].join("\n");
}

function buildDocumentTranslationUserPrompt(input: {
  languageLabel: string;
  languageCode: string;
  chunkText: string;
}): string {
  // Target language must appear in the user message: some routed models
  // (notably openrouter/free) weakly follow or ignore system instructions.
  return [
    `Target language: ${input.languageLabel}`,
    `Target language code: ${input.languageCode}`,
    "",
    "Translate the document text below into the target language.",
    "Translate only natural language. Preserve structure, whitespace, paragraphs, lists, and headings.",
    "Never hallucinate, invent, omit, merge, or reorder. Never change numbers, dates, currencies, measurements, or names (unless a standard localized spelling).",
    "Do not translate emails, URLs, IBAN, SWIFT/BIC, account numbers, invoice numbers, tracking numbers, IDs, UUIDs, JSON, XML, HTML, or source code.",
    "If unsure, leave text unchanged. Return ONLY the translated document. No markdown. No code blocks. No comments.",
    "If this is an email, translate Subject/greetings/body/closing; keep From/To/CC/BCC/Date/Time and addresses unchanged.",
    "",
    "--- DOCUMENT START ---",
    input.chunkText,
    "--- DOCUMENT END ---",
  ].join("\n");
}

async function translateChunkViaProviderLayer(input: {
  documentId: string;
  languageCode: string;
  languageLabel: string;
  system: string;
  chunkText: string;
}): Promise<string> {
  const layer = getAiProviderLayer();
  const userInput = buildDocumentTranslationUserPrompt({
    languageLabel: input.languageLabel,
    languageCode: input.languageCode,
    chunkText: input.chunkText,
  });

  console.info("[translation flow]", "provider request", {
    documentId: input.documentId,
    languageCode: input.languageCode,
    languageLabel: input.languageLabel,
    systemPrompt: input.system,
    chunkChars: input.chunkText.length,
    userInputPrefix: userInput.slice(0, 180),
  });

  try {
    const response = await layer.orchestrator.execute({
      feature: "translation",
      documentId: input.documentId,
      system: input.system,
      input: userInput,
      temperature: 0.2,
    });
    if (response.kind !== "text") {
      throw new Error("Translation failed to produce text.");
    }
    console.info("[translation flow]", "provider response", {
      documentId: input.documentId,
      languageCode: input.languageCode,
      languageLabel: input.languageLabel,
      providerId: response.providerId,
      modelId: response.modelId,
      attempts: response.attempts,
      outputChars: response.text.trim().length,
      outputPreview: response.text.trim().slice(0, 120),
    });
    return response.text.trim();
  } catch (cause) {
    console.info("[translation flow]", "provider final error", {
      documentId: input.documentId,
      languageCode: input.languageCode,
      languageLabel: input.languageLabel,
      finalError:
        cause instanceof Error ? cause.message : "Translation failed.",
    });
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
    console.info("[translation flow]", "unsupported languageCode", {
      documentId: input.documentId,
      languageCode: input.languageCode,
    });
    throw new Error("Unsupported translation language.");
  }

  console.info("[translation flow]", "resolved target language", {
    documentId: input.documentId,
    targetLanguage: language.label,
    languageCode: language.code,
    languageLabel: language.label,
  });

  if (!input.originalText.trim()) {
    throw new Error("Document has no original text to translate.");
  }

  const existing = await getTranslation(input.documentId, language.code);
  if (existing?.status === "ready" && existing.text.trim()) {
    console.info("[translation flow]", "reuse ready translation", {
      documentId: input.documentId,
      languageCode: existing.languageCode,
      languageLabel: existing.languageLabel,
      textChars: existing.text.length,
    });
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
    console.info("[translation flow]", "database upsert failed", {
      documentId: input.documentId,
      languageCode: language.code,
      error: upsertError?.message ?? "Unable to start translation.",
    });
    throw new Error(upsertError?.message || "Unable to start translation.");
  }

  console.info("[translation flow]", "database upsert", {
    documentId: input.documentId,
    translationId: upserted.id,
    languageCode: upserted.language_code,
    languageLabel: upserted.language_label,
    status: upserted.status,
  });

  const system = buildDocumentTranslationSystemPrompt(
    language.label,
    language.code,
  );

  try {
    const chunks = chunkPlainText(input.originalText, {
      chunkSize: 3500,
      overlap: 0,
    });
    const translatedParts: string[] = [];

    console.info("[translation flow]", "translation prompt", {
      documentId: input.documentId,
      languageCode: language.code,
      languageLabel: language.label,
      system,
      chunkCount: chunks.length,
    });

    for (const chunk of chunks) {
      const part = await translateChunkViaProviderLayer({
        documentId: input.documentId,
        languageCode: language.code,
        languageLabel: language.label,
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
        language_code: language.code,
        language_label: language.label,
        word_count: wordCount,
        status: "ready",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", upserted.id)
      .select("*")
      .single();

    if (saveError || !saved) {
      console.info("[translation flow]", "database update failed", {
        documentId: input.documentId,
        languageCode: language.code,
        error: saveError?.message ?? "Unable to save translation.",
      });
      throw new Error(saveError?.message || "Unable to save translation.");
    }

    console.info("[translation flow]", "database update ready", {
      documentId: input.documentId,
      languageCode: saved.language_code,
      languageLabel: saved.language_label,
      textChars: String(saved.text ?? "").length,
      wordCount: saved.word_count,
      status: saved.status,
    });

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
    console.info("[translation flow]", "translation failed", {
      documentId: input.documentId,
      languageCode: language.code,
      languageLabel: language.label,
      error: message,
    });
    throw new Error(message);
  }
}

export { labelForLanguageCode };
