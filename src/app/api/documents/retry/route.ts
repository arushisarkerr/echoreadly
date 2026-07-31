import {
  getDocumentById,
  updateDocumentProcessing,
} from "@/features/library/server/documents";
import { processUploadedDocument } from "@/features/processing/process-document";

export const runtime = "nodejs";
export const maxDuration = 300;

const OWNER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, status: number) {
  return Response.json({ ok: false as const, error: message }, { status });
}

/**
 * Retry failed document processing (YouTube STT / extraction).
 */
export async function POST(request: Request) {
  let body: { ownerId?: unknown; documentId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
  const documentId = typeof body.documentId === "string" ? body.documentId : "";

  if (!OWNER_ID_PATTERN.test(ownerId) || !OWNER_ID_PATTERN.test(documentId)) {
    return jsonError("Invalid ids.", 400);
  }

  try {
    const document = await getDocumentById(documentId);
    if (!document || document.ownerId !== ownerId) {
      return jsonError("Document not found.", 404);
    }

    await updateDocumentProcessing(documentId, {
      processingStatus: "uploaded",
      processingStage: "queued",
      processingError: null,
    });

    // Run in-request for retry feedback; heavy work still uses shared pipeline.
    await processUploadedDocument(documentId);
    const refreshed = await getDocumentById(documentId);
    return Response.json({ ok: true as const, document: refreshed });
  } catch (cause) {
    return jsonError(
      cause instanceof Error ? cause.message : "Retry failed.",
      400,
    );
  }
}
