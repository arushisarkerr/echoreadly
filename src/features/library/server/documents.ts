import { createHash } from "node:crypto";

import { createServiceClient } from "@/lib/supabase/server";
import type {
  CreateDocumentInput,
  DocumentRecord,
  DocumentRow,
  ProcessingStatus,
} from "@/features/library/types";

const DOCUMENT_SELECT =
  "id, user_id, guest_id, filename, original_file_name, file_size, mime_type, storage_path, uploaded_at, processing_status, document_hash, page_count, source_format, source_url, source_metadata, extracted_text, processing_stage, processing_error, original_language";

function toRecord(row: DocumentRow): DocumentRecord {
  const ownerId = row.user_id ?? row.guest_id;
  if (!ownerId) {
    throw new Error("Document is missing ownership.");
  }

  return {
    id: row.id,
    ownerId,
    userId: row.user_id,
    filename: row.filename,
    originalFilename: row.original_file_name,
    fileSize: Number(row.file_size),
    mimeType: row.mime_type,
    storagePath: row.storage_path,
    uploadedAt: row.uploaded_at,
    processingStatus: row.processing_status,
    pageCount: row.page_count == null ? null : Number(row.page_count),
    sourceFormat: row.source_format ?? null,
    sourceUrl: row.source_url ?? null,
    sourceMetadata: row.source_metadata ?? null,
    extractedText: row.extracted_text ?? null,
    processingStage: row.processing_stage ?? null,
    processingError: row.processing_error ?? null,
    originalLanguage: row.original_language ?? null,
  };
}

/**
 * Stable hash helper for content bytes or canonical identity strings.
 */
export function hashDocumentBytes(bytes: ArrayBuffer | Uint8Array | string): string {
  const buffer =
    typeof bytes === "string"
      ? new TextEncoder().encode(bytes)
      : bytes instanceof Uint8Array
        ? bytes
        : new Uint8Array(bytes);
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
      source_format: input.sourceFormat ?? null,
      source_url: input.sourceUrl ?? null,
      source_metadata: input.sourceMetadata ?? null,
      processing_stage: input.processingStage ?? "queued",
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

  const documents = ((data as DocumentRow[] | null) ?? []).map(toRecord);
  if (documents.length === 0) {
    return documents;
  }

  const ids = documents.map((document) => document.id);
  const [{ data: translations }, { data: audioRows }] = await Promise.all([
    client
      .from("document_translations")
      .select("document_id, language_code, status")
      .in("document_id", ids)
      .eq("status", "ready"),
    client
      .from("document_audio")
      .select("document_id, language_code, status")
      .in("document_id", ids)
      .eq("status", "ready"),
  ]);

  const translatedMap = new Map<string, string[]>();
  for (const row of (translations as Array<{
    document_id: string;
    language_code: string;
  }> | null) ?? []) {
    const list = translatedMap.get(row.document_id) ?? [];
    list.push(row.language_code);
    translatedMap.set(row.document_id, list);
  }

  const audioMap = new Map<string, string[]>();
  for (const row of (audioRows as Array<{
    document_id: string;
    language_code: string;
  }> | null) ?? []) {
    const list = audioMap.get(row.document_id) ?? [];
    list.push(row.language_code);
    audioMap.set(row.document_id, list);
  }

  return documents.map((document) => ({
    ...document,
    translatedLanguages: translatedMap.get(document.id) ?? [],
    audioLanguages: audioMap.get(document.id) ?? [],
  }));
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

/**
 * Load a document by id (service role — used by the shared processing pipeline).
 */
export async function getDocumentById(
  documentId: string,
): Promise<DocumentRecord | null> {
  const client = createServiceClient();
  const { data, error } = await client
    .from("documents")
    .select(DOCUMENT_SELECT)
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Unable to look up document.");
  }

  return data ? toRecord(data as DocumentRow) : null;
}

export type DocumentProcessingUpdate = {
  processingStatus: ProcessingStatus;
  pageCount?: number | null;
  extractedText?: string | null;
  extractedAt?: string | null;
  sourceFormat?: string | null;
  sourceMetadata?: Record<string, unknown> | null;
  filename?: string;
  processingStage?: string | null;
  processingError?: string | null;
  originalLanguage?: string | null;
};

/**
 * Update processing fields after format-specific extraction.
 */
export async function updateDocumentProcessing(
  documentId: string,
  fields: DocumentProcessingUpdate,
): Promise<DocumentRecord> {
  const client = createServiceClient();
  const patch: Record<string, unknown> = {
    processing_status: fields.processingStatus,
  };

  if (fields.pageCount !== undefined) {
    patch.page_count = fields.pageCount;
  }
  if (fields.extractedText !== undefined) {
    patch.extracted_text = fields.extractedText;
  }
  if (fields.extractedAt !== undefined) {
    patch.extracted_at = fields.extractedAt;
  }
  if (fields.sourceFormat !== undefined) {
    patch.source_format = fields.sourceFormat;
  }
  if (fields.sourceMetadata !== undefined) {
    patch.source_metadata = fields.sourceMetadata;
  }
  if (fields.filename) {
    patch.filename = fields.filename;
  }
  if (fields.processingStage !== undefined) {
    patch.processing_stage = fields.processingStage;
  }
  if (fields.processingError !== undefined) {
    patch.processing_error = fields.processingError;
  }
  if (fields.originalLanguage !== undefined) {
    patch.original_language = fields.originalLanguage;
  }

  const { data, error } = await client
    .from("documents")
    .update(patch)
    .eq("id", documentId)
    .select(DOCUMENT_SELECT)
    .single();

  if (error) {
    throw new Error(error.message || "Unable to update document processing.");
  }

  return toRecord(data as DocumentRow);
}
