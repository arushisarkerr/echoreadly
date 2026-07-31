import { createServiceClient } from "@/lib/supabase/server";
import type { TextChunk } from "@/features/processing/chunk-text";

/**
 * Replace all chunks for a document (shared across every import source).
 */
export async function replaceDocumentChunks(
  documentId: string,
  guestId: string | null,
  chunks: TextChunk[],
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

  const rows = chunks.map((chunk) => ({
    document_id: documentId,
    guest_id: guestId,
    chunk_index: chunk.chunkIndex,
    text: chunk.text,
    character_count: chunk.characterCount,
  }));

  const { error: insertError } = await client.from("document_chunks").insert(rows);
  if (insertError) {
    throw new Error(insertError.message || "Unable to save document chunks.");
  }
}
