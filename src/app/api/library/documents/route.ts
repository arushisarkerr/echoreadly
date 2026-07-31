import { listDocumentsForOwner } from "@/features/library/server/documents";
import { deleteOwnedDocuments } from "@/features/library/server/delete-documents";

export const runtime = "nodejs";

const OWNER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, status: number) {
  return Response.json({ ok: false as const, error: message }, { status });
}

/**
 * List library documents for an import owner id.
 */
export async function GET(request: Request) {
  const ownerId = new URL(request.url).searchParams.get("ownerId")?.trim() ?? "";

  if (!OWNER_ID_PATTERN.test(ownerId)) {
    return jsonError("Invalid owner id.", 400);
  }

  try {
    const documents = await listDocumentsForOwner(ownerId);
    return Response.json({ ok: true as const, documents });
  } catch (cause) {
    const message =
      cause instanceof Error && cause.message
        ? cause.message
        : "Unable to load library documents.";
    return jsonError(message, 400);
  }
}

/**
 * Delete one or more library documents (storage object + DB row + cascaded metadata).
 */
export async function DELETE(request: Request) {
  let body: { ownerId?: unknown; documentIds?: unknown };

  try {
    body = (await request.json()) as {
      ownerId?: unknown;
      documentIds?: unknown;
    };
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const ownerId = typeof body.ownerId === "string" ? body.ownerId.trim() : "";
  if (!OWNER_ID_PATTERN.test(ownerId)) {
    return jsonError("Invalid owner id.", 400);
  }

  const documentIds = Array.isArray(body.documentIds)
    ? body.documentIds.filter((value): value is string => typeof value === "string")
    : [];

  if (documentIds.length === 0) {
    return jsonError("Select at least one document to delete.", 400);
  }

  try {
    const result = await deleteOwnedDocuments(ownerId, documentIds);
    return Response.json({ ok: true as const, deletedIds: result.deletedIds });
  } catch (cause) {
    const message =
      cause instanceof Error && cause.message
        ? cause.message
        : "Unable to delete documents.";
    return jsonError(message, 400);
  }
}
