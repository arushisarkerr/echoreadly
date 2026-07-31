import {
  getDocumentByIdForOwner,
} from "@/features/library/server/documents";

export const runtime = "nodejs";

const OWNER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOCUMENT_ID_PATTERN = OWNER_ID_PATTERN;

function jsonError(message: string, status: number) {
  return Response.json({ ok: false as const, error: message }, { status });
}

/**
 * Load a single library document for the Reader (owner-scoped).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const ownerId = new URL(request.url).searchParams.get("ownerId")?.trim() ?? "";

  if (!DOCUMENT_ID_PATTERN.test(id)) {
    return jsonError("Invalid document id.", 400);
  }
  if (!OWNER_ID_PATTERN.test(ownerId)) {
    return jsonError("Invalid owner id.", 400);
  }

  try {
    const document = await getDocumentByIdForOwner(ownerId, id);
    if (!document) {
      return jsonError("Document not found.", 404);
    }
    return Response.json({ ok: true as const, document });
  } catch (cause) {
    const message =
      cause instanceof Error && cause.message
        ? cause.message
        : "Unable to load document.";
    return jsonError(message, 400);
  }
}
