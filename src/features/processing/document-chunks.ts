import { createServiceClient } from "@/lib/supabase/server";
import type { TextChunk } from "@/features/processing/chunk-text";

/**
 * Replace all chunks for a document (shared across every import source).
 *
 * Ownership is inherited from `documents` via `document_id`.
 * The live `document_chunks` table has `user_id` (not `guest_id`); guest
 * imports keep `user_id` null because `documents.user_id` is null for guests.
 *
 * `page_number` is NOT NULL on the live schema. Paginated sources set real
 * page numbers; non-paginated sources always use 1.
 */
export async function replaceDocumentChunks(
  documentId: string,
  chunks: TextChunk[],
  options?: { userId?: string | null },
): Promise<void> {
  const client = createServiceClient();

  const { error: deleteError } = await client
    .from("document_chunks")
    .delete()
    .eq("document_id", documentId);

  if (deleteError) {
    throw new Error(deleteError.message || "Unable to clear document chunks.");
  }

  if (chunks.length === 0) {
    return;
  }

  const userId = options?.userId ?? null;
  const rows = chunks.map((chunk) => {
    const pageNumber =
      Number.isInteger(chunk.pageNumber) && chunk.pageNumber >= 1
        ? chunk.pageNumber
        : 1;

    const row: {
      document_id: string;
      chunk_index: number;
      page_number: number;
      text: string;
      character_count: number;
      user_id?: string;
    } = {
      document_id: documentId,
      chunk_index: chunk.chunkIndex,
      page_number: pageNumber,
      text: chunk.text,
      character_count: chunk.characterCount,
    };
    // Only set user_id for authenticated owners. Guest docs inherit
    // ownership through documents via document_id (documents.guest_id).
    if (userId) {
      row.user_id = userId;
    }
    return row;
  });

  const { error: insertError } = await client.from("document_chunks").insert(rows);
  if (insertError) {
    throw new Error(insertError.message || "Unable to save document chunks.");
  }
}
