/**
 * Persistence helpers for `document_translations`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { SummaryType } from "@/features/ai";
import type { PersistenceResult } from "@/features/persistence";

import type {
  DocumentTranslationRow,
  TranslationScope,
} from "./types";

export type FindTranslationInput = {
  userId: string;
  documentId: string;
  scope: TranslationScope;
  pageNumber: number | null;
  summaryType: SummaryType | null;
  selectionHash: string | null;
  targetLanguage: string;
  sourceContentHash: string;
};

export type UpsertTranslationInput = {
  id?: string;
  userId: string;
  documentId: string;
  scope: TranslationScope;
  pageNumber: number | null;
  summaryType: SummaryType | null;
  selectionHash: string | null;
  targetLanguage: string;
  sourceContentHash: string;
  sourceText: string;
  translatedText: string;
  model: string;
};

function mapRow(row: DocumentTranslationRow): DocumentTranslationRow {
  return {
    id: row.id,
    user_id: row.user_id,
    document_id: row.document_id,
    scope: row.scope,
    page_number: row.page_number,
    summary_type: row.summary_type,
    selection_hash: row.selection_hash,
    target_language: row.target_language,
    source_content_hash: row.source_content_hash,
    source_text: row.source_text,
    translated_text: row.translated_text,
    model: row.model,
    generated_at: row.generated_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function findDocumentTranslation(
  input: FindTranslationInput,
  client: SupabaseClient,
): Promise<PersistenceResult<DocumentTranslationRow | null>> {
  try {
    let query = client
      .from("document_translations")
      .select("*")
      .eq("user_id", input.userId)
      .eq("document_id", input.documentId)
      .eq("scope", input.scope)
      .eq("target_language", input.targetLanguage)
      .eq("source_content_hash", input.sourceContentHash);

    if (input.scope === "page") {
      query = query.eq("page_number", input.pageNumber!);
    } else {
      query = query.is("page_number", null);
    }

    if (input.scope === "summary") {
      query = query.eq("summary_type", input.summaryType!);
    } else {
      query = query.is("summary_type", null);
    }

    if (input.scope === "selection") {
      query = query.eq("selection_hash", input.selectionHash!);
    } else {
      query = query.is("selection_hash", null);
    }

    const { data, error } = await query
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message };
    }

    if (!data) {
      return { ok: true, data: null };
    }

    return { ok: true, data: mapRow(data as DocumentTranslationRow) };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to look up translation.",
    };
  }
}

export async function upsertDocumentTranslation(
  input: UpsertTranslationInput,
  client: SupabaseClient,
): Promise<PersistenceResult<DocumentTranslationRow>> {
  try {
    const payload = {
      id: input.id,
      user_id: input.userId,
      document_id: input.documentId,
      scope: input.scope,
      page_number: input.pageNumber,
      summary_type: input.summaryType,
      selection_hash: input.selectionHash,
      target_language: input.targetLanguage,
      source_content_hash: input.sourceContentHash,
      source_text: input.sourceText,
      translated_text: input.translatedText,
      model: input.model,
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from("document_translations")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message || "Unable to save translation.",
      };
    }

    return { ok: true, data: mapRow(data as DocumentTranslationRow) };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save translation.",
    };
  }
}
