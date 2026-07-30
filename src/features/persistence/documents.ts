/**
 * Document metadata persistence (Supabase `documents` table).
 * Uses the authenticated user client only — never the service role.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { ProcessedDocument } from "@/features/processing/types";

import { uniqueStoragePathVariants } from "./storage-path";
import type {
  DocumentRow,
  PersistenceResult,
  UpsertDocumentInput,
} from "./types";

async function resolveClient(client?: SupabaseClient) {
  return client ?? (await createClient());
}

export function documentRowToProcessed(
  row: DocumentRow,
): ProcessedDocument {
  return {
    id: row.id,
    userId: row.user_id,
    storagePath: row.storage_path,
    originalFileName: row.original_file_name,
    fileSize: Number(row.file_size),
    uploadedAt: row.uploaded_at,
    pageCount: row.page_count,
    processingStatus: row.processing_status,
    documentHash: row.document_hash,
    extractedText: null,
    pageTexts: null,
    extractedAt: row.extracted_at,
    chunks: null,
    chunkedAt: row.chunked_at,
    summary: null,
  };
}

function toRow(input: UpsertDocumentInput): Record<string, unknown> {
  return {
    ...(input.id ? { id: input.id } : {}),
    user_id: input.userId,
    storage_path: input.storagePath,
    original_file_name: input.originalFileName,
    file_size: input.fileSize,
    uploaded_at: input.uploadedAt ?? new Date().toISOString(),
    page_count: input.pageCount ?? null,
    processing_status: input.processingStatus ?? "uploaded",
    document_hash: input.documentHash,
    extracted_at: input.extractedAt ?? null,
    chunked_at: input.chunkedAt ?? null,
  };
}

export async function getDocumentById(
  documentId: string,
  userId: string,
  client?: SupabaseClient,
): Promise<PersistenceResult<DocumentRow | null>> {
  try {
    const supabase = await resolveClient(client);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: (data as DocumentRow | null) ?? null };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to load document.",
    };
  }
}

/**
 * Look up a processed document by hash for a specific user only.
 */
export async function getDocumentByHash(
  documentHash: string,
  userId: string,
  client?: SupabaseClient,
): Promise<PersistenceResult<DocumentRow | null>> {
  try {
    const supabase = await resolveClient(client);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("document_hash", documentHash)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: (data as DocumentRow | null) ?? null };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load document by hash.",
    };
  }
}

/**
 * List storage paths + processing status for the signed-in user (Library prep badges).
 */
export async function listDocumentProcessingStatuses(
  userId: string,
  client?: SupabaseClient,
): Promise<
  PersistenceResult<
    Array<{ storagePath: string; processingStatus: DocumentRow["processing_status"] }>
  >
> {
  try {
    const supabase = await resolveClient(client);
    const { data, error } = await supabase
      .from("documents")
      .select("storage_path, processing_status")
      .eq("user_id", userId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      return { ok: false, error: error.message };
    }

    const rows =
      (data as Array<{
        storage_path: string;
        processing_status: DocumentRow["processing_status"];
      }> | null) ?? [];

    return {
      ok: true,
      data: rows.map((row) => ({
        storagePath: row.storage_path,
        processingStatus: row.processing_status,
      })),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to list document statuses.",
    };
  }
}

export async function getDocumentByStoragePath(
  storagePath: string,
  userId: string,
  client?: SupabaseClient,
): Promise<PersistenceResult<DocumentRow | null>> {
  try {
    const supabase = await resolveClient(client);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("storage_path", storagePath)
      .eq("user_id", userId)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: (data as DocumentRow | null) ?? null };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load document by storage path.",
    };
  }
}

/**
 * Insert or update a document by `(user_id, document_hash)`.
 */
export async function upsertDocument(
  input: UpsertDocumentInput,
  client?: SupabaseClient,
): Promise<PersistenceResult<DocumentRow>> {
  try {
    const supabase = await resolveClient(client);
    const { data, error } = await supabase
      .from("documents")
      .upsert(toRow(input), { onConflict: "user_id,document_hash" })
      .select("*")
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message || "Unable to save document.",
      };
    }

    return { ok: true, data: data as DocumentRow };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to save document.",
    };
  }
}

export async function updateDocumentFields(
  documentId: string,
  userId: string,
  fields: Partial<{
    storagePath: string;
    originalFileName: string;
    fileSize: number;
    pageCount: number | null;
    processingStatus: DocumentRow["processing_status"];
    extractedAt: string | null;
    chunkedAt: string | null;
  }>,
  client?: SupabaseClient,
): Promise<PersistenceResult<DocumentRow>> {
  try {
    const supabase = await resolveClient(client);
    const patch: Record<string, unknown> = {};

    if (fields.storagePath !== undefined) {
      patch.storage_path = fields.storagePath;
    }
    if (fields.originalFileName !== undefined) {
      patch.original_file_name = fields.originalFileName;
    }
    if (fields.fileSize !== undefined) {
      patch.file_size = fields.fileSize;
    }
    if (fields.pageCount !== undefined) {
      patch.page_count = fields.pageCount;
    }
    if (fields.processingStatus !== undefined) {
      patch.processing_status = fields.processingStatus;
    }
    if (fields.extractedAt !== undefined) {
      patch.extracted_at = fields.extractedAt;
    }
    if (fields.chunkedAt !== undefined) {
      patch.chunked_at = fields.chunkedAt;
    }

    const { data, error } = await supabase
      .from("documents")
      .update(patch)
      .eq("id", documentId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message || "Unable to update document.",
      };
    }

    return { ok: true, data: data as DocumentRow };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to update document.",
    };
  }
}

/**
 * Delete all document rows for this user + storage path.
 * Chunks and summaries cascade via FK.
 */
export async function deleteDocumentsByStoragePath(
  storagePath: string,
  userId: string,
  client?: SupabaseClient,
): Promise<PersistenceResult<{ deletedCount: number }>> {
  try {
    const supabase = await resolveClient(client);
    const paths = uniqueStoragePathVariants(storagePath);

    const { data, error } = await supabase
      .from("documents")
      .delete()
      .eq("user_id", userId)
      .in("storage_path", paths)
      .select("id");

    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      data: { deletedCount: data?.length ?? 0 },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete document records.",
    };
  }
}
