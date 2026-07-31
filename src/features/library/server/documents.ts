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
 * SHA-256 of PDF bytes — the documents.document_hash identity used for dedupe.
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
 * Find an existing document for the same guest owner + idempotent document hash.
 */
export async function getDocumentByHash(
  guestId: string,
  documentHash: string,
): Promise<DocumentRecord | null> {
  const client = createServiceClient();
  const { data, error } = await client
    .from("documents")
    .select(DOCUMENT_SELECT)
    .eq("guest_id", guestId)
    .eq("document_hash", documentHash)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Unable to look up document by hash.");
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
  const existingByPath = await getDocumentByStoragePath(
    input.guestId,
    input.storagePath,
  );
  if (existingByPath) {
    return existingByPath;
  }

  const existingByHash = await getDocumentByHash(
    input.guestId,
    input.documentHash,
  );
  if (existingByHash) {
    return existingByHash;
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
    // Concurrent insert for the same storage path / idempotency hash — return the winner.
    if (error.code === "23505") {
      const raced =
        (await getDocumentByStoragePath(input.guestId, input.storagePath)) ??
        (await getDocumentByHash(input.guestId, input.documentHash));
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

/**
 * Find a document by id for a guest owner.
 */
export async function getDocumentByIdForOwner(
  guestId: string,
  documentId: string,
): Promise<DocumentRecord | null> {
  const client = createServiceClient();
  const { data, error } = await client
    .from("documents")
    .select(DOCUMENT_SELECT)
    .eq("guest_id", guestId)
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Unable to look up document.");
  }

  return data ? toRecord(data as DocumentRow) : null;
}

/**
 * Delete document rows by id for a guest owner.
 * Related rows (chunks, summaries) cascade via FK.
 */
export async function deleteDocumentRowsByIds(
  guestId: string,
  documentIds: string[],
): Promise<string[]> {
  if (documentIds.length === 0) {
    return [];
  }

  const client = createServiceClient();
  const { data, error } = await client
    .from("documents")
    .delete()
    .eq("guest_id", guestId)
    .in("id", documentIds)
    .select("id");

  if (error) {
    throw new Error(error.message || "Unable to delete document records.");
  }

  return ((data as Array<{ id: string }> | null) ?? []).map((row) => row.id);
}
