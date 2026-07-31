import { PDFS_BUCKET } from "@/constants";
import { createServiceClient } from "@/lib/supabase/server";
import {
  deleteDocumentRowsByIds,
  getDocumentByIdForOwner,
} from "@/features/library/server/documents";
import type { DocumentRecord } from "@/features/library/types";

const DOCUMENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toObjectKey(storagePath: string): string {
  const trimmed = storagePath.trim();
  return trimmed.startsWith(`${PDFS_BUCKET}/`)
    ? trimmed.slice(PDFS_BUCKET.length + 1)
    : trimmed;
}

function isMissingStorageObject(error: {
  message?: string;
  statusCode?: string | number;
}): boolean {
  const message = (error.message ?? "").toLowerCase();
  const status = String(error.statusCode ?? "");
  return (
    status === "404" ||
    message.includes("not found") ||
    message.includes("does not exist") ||
    message.includes("no such file")
  );
}

/**
 * Remove a storage object. Missing objects are treated as already deleted.
 */
async function removeStorageObject(storagePath: string): Promise<void> {
  const key = toObjectKey(storagePath);
  if (!key) {
    return;
  }

  const client = createServiceClient();
  const { error } = await client.storage.from(PDFS_BUCKET).remove([key]);
  if (error && !isMissingStorageObject(error)) {
    throw new Error(error.message || "Unable to remove document file.");
  }
}

/**
 * Delete one owned document: storage object first, then DB row (+ cascaded metadata).
 * Safe to retry — missing storage or already-deleted rows are tolerated.
 */
export async function deleteOwnedDocument(
  guestId: string,
  documentId: string,
): Promise<DocumentRecord | null> {
  if (!DOCUMENT_ID_PATTERN.test(documentId)) {
    throw new Error("Invalid document id.");
  }

  const document = await getDocumentByIdForOwner(guestId, documentId);
  if (!document) {
    return null;
  }

  await removeStorageObject(document.storagePath);

  const deletedIds = await deleteDocumentRowsByIds(guestId, [document.id]);
  if (deletedIds.length === 0) {
    // Row may have been removed by a concurrent delete after storage cleanup.
    return document;
  }

  return document;
}

/**
 * Delete many owned documents. Each document is cleaned up independently so a
 * mid-batch failure does not leave mixed orphans for already-processed ids.
 */
export async function deleteOwnedDocuments(
  guestId: string,
  documentIds: string[],
): Promise<{ deletedIds: string[] }> {
  const uniqueIds = [...new Set(documentIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { deletedIds: [] };
  }

  for (const id of uniqueIds) {
    if (!DOCUMENT_ID_PATTERN.test(id)) {
      throw new Error("Invalid document id.");
    }
  }

  const deletedIds: string[] = [];

  for (const documentId of uniqueIds) {
    const deleted = await deleteOwnedDocument(guestId, documentId);
    if (deleted) {
      deletedIds.push(deleted.id);
    }
  }

  return { deletedIds };
}
