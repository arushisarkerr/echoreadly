/**
 * Document chunk persistence (Supabase `document_chunks` table).
 * Uses the authenticated user client only — never the service role.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { DocumentChunk } from "@/features/processing/chunk-text";
import {
  createDocumentChunkResult,
  type DocumentChunkResult,
} from "@/features/processing/document-chunks";

import type {
  DocumentChunkRow,
  PersistChunkInput,
  PersistenceResult,
} from "./types";

async function resolveClient(client?: SupabaseClient) {
  return client ?? (await createClient());
}

export function chunkRowToDocumentChunk(row: DocumentChunkRow): DocumentChunk {
  return {
    id: `${row.document_id}_p${row.page_number}_${row.chunk_index}`,
    pageNumber: row.page_number,
    chunkIndex: row.chunk_index,
    text: row.text,
    characterCount: row.character_count,
  };
}

export function rowsToChunkResult(
  rows: DocumentChunkRow[],
  pageCount: number,
  chunkedAt?: string | null,
): DocumentChunkResult {
  const chunks = rows
    .slice()
    .sort((a, b) => a.chunk_index - b.chunk_index)
    .map(chunkRowToDocumentChunk);

  const result = createDocumentChunkResult(chunks, pageCount);

  if (chunkedAt) {
    return {
      ...result,
      chunkedAt,
    };
  }

  return result;
}

export async function listChunksByDocumentId(
  documentId: string,
  userId: string,
  client?: SupabaseClient,
): Promise<PersistenceResult<DocumentChunkRow[]>> {
  try {
    const supabase = await resolveClient(client);
    const { data, error } = await supabase
      .from("document_chunks")
      .select("*")
      .eq("document_id", documentId)
      .eq("user_id", userId)
      .order("chunk_index", { ascending: true });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: (data as DocumentChunkRow[]) ?? [] };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load document chunks.",
    };
  }
}

/**
 * Replace all chunks for a document (delete + insert).
 */
export async function replaceDocumentChunks(
  documentId: string,
  userId: string,
  chunks: PersistChunkInput[],
  client?: SupabaseClient,
): Promise<PersistenceResult<DocumentChunkRow[]>> {
  try {
    const supabase = await resolveClient(client);

    const { error: deleteError } = await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentId)
      .eq("user_id", userId);

    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }

    if (chunks.length === 0) {
      return { ok: true, data: [] };
    }

    const payload = chunks.map((chunk) => ({
      document_id: documentId,
      user_id: userId,
      page_number: chunk.pageNumber,
      chunk_index: chunk.chunkIndex,
      text: chunk.text,
      character_count: chunk.characterCount,
    }));

    const { data, error } = await supabase
      .from("document_chunks")
      .insert(payload)
      .select("*")
      .order("chunk_index", { ascending: true });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: (data as DocumentChunkRow[]) ?? [] };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save document chunks.",
    };
  }
}
