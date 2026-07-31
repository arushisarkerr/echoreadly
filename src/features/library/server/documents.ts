import { createHash } from "node:crypto";

import { createServiceClient } from "@/lib/supabase/server";
import type {
  CreateDocumentInput,
  DocumentRecord,
  DocumentRow,
} from "@/features/library/types";

const DOCUMENT_SELECT =
  "id, user_id, guest_id, filename, original_file_name, file_size, mime_type, storage_path, uploaded_at, processing_status, document_hash";

function toRecord(row: DocumentRow): DocumentRecord {
  const ownerId = row.user_id ?? row.guest_id;
  if (!ownerId) {
    throw new Error("Document is missing ownership.");
  }

  return {
    id: row.id,
    ownerId,
    filename: row.filename,
    originalFilename: row.original_file_name,
    fileSize: Number(row.file_size),
    mimeType: row.mime_type,
    storagePath: row.storage_path,
    uploadedAt: row.uploaded_at,
    processingStatus: row.processing_status,
  };
}

/**
 * Stable content hash used by the existing documents.document_hash column.
 */
export function hashDocumentBytes(bytes: ArrayBuffer | Uint8Array): string {
  const buffer = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Find an existing document for the same guest owner + storage object.
 */
export async function getDocumentByStoragePath(
  guestId: string,
  storagePath: string,
): Promise<DocumentRecord | null> {
  const client = createServiceClient();
  const { data, error } = await client
    .from("documents")
    .select(DOCUMENT_SELECT)
    .eq("guest_id", guestId)
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Unable to look up document.");
  }

  return data ? toRecord(data as DocumentRow) : null;
}

/**
 * Create a library document row for a guest upload, or return the existing one.
 * Uses guest_id so documents.user_id can keep its auth.users foreign key.
 */
export async function createDocumentRecord(
  input: CreateDocumentInput,
): Promise<DocumentRecord> {
  const existing = await getDocumentByStoragePath(input.guestId, input.storagePath);
  if (existing) {
    return existing;
  }

  const client = createServiceClient();
  const { data, error } = await client
    .from("documents")
    .insert({
      user_id: null,
      guest_id: input.guestId,
      filename: input.filename,
      original_file_name: input.originalFilename,
      file_size: input.fileSize,
      mime_type: input.mimeType,
      storage_path: input.storagePath,
      uploaded_at: input.uploadedAt,
      processing_status: input.processingStatus ?? "uploaded",
      document_hash: input.documentHash,
    })
    .select(DOCUMENT_SELECT)
    .single();

  if (error) {
    // Concurrent insert for the same storage path — return the winner.
    if (error.code === "23505") {
      const raced = await getDocumentByStoragePath(input.guestId, input.storagePath);
      if (raced) {
        return raced;
      }
    }
    throw new Error(error.message || "Unable to create document record.");
  }

  return toRecord(data as DocumentRow);
}

/**
 * List library documents for a guest owner (newest first).
 */
export async function listDocumentsForOwner(guestId: string): Promise<DocumentRecord[]> {
  const client = createServiceClient();
  const { data, error } = await client
    .from("documents")
    .select(DOCUMENT_SELECT)
    .eq("guest_id", guestId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Unable to load library documents.");
  }

  return ((data as DocumentRow[] | null) ?? []).map(toRecord);
}

/**
 * Delete a document row by storage path for a guest owner.
 */
export async function deleteDocumentByStoragePath(
  guestId: string,
  storagePath: string,
): Promise<void> {
  const client = createServiceClient();
  const { error } = await client
    .from("documents")
    .delete()
    .eq("guest_id", guestId)
    .eq("storage_path", storagePath);

  if (error) {
    throw new Error(error.message || "Unable to delete document record.");
  }
}
