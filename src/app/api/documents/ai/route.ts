import { runDocumentAi, type AiAction } from "@/features/ai/run-document-ai";
import { getDocumentByIdForOwner } from "@/features/library/server/documents";

export const runtime = "nodejs";
export const maxDuration = 120;

const OWNER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACTIONS = new Set<AiAction>([
  "summary",
  "key_points",
  "quiz",
  "flashcards",
  "explain",
  "ask",
]);

function jsonError(message: string, status: number) {
  return Response.json({ ok: false as const, error: message }, { status });
}

export async function POST(request: Request) {
  let body: {
    ownerId?: unknown;
    documentId?: unknown;
    action?: unknown;
    question?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
  const documentId = typeof body.documentId === "string" ? body.documentId : "";
  const action = typeof body.action === "string" ? body.action : "";
  const question = typeof body.question === "string" ? body.question : undefined;

  if (!OWNER_ID_PATTERN.test(ownerId) || !OWNER_ID_PATTERN.test(documentId)) {
    return jsonError("Invalid ids.", 400);
  }
  if (!ACTIONS.has(action as AiAction)) {
    return jsonError("Unsupported AI action.", 400);
  }

  try {
    const document = await getDocumentByIdForOwner(ownerId, documentId);
    if (!document) {
      return jsonError("Document not found.", 404);
    }

    const result = await runDocumentAi({
      documentId,
      action: action as AiAction,
      question,
    });

    return Response.json({ ok: true as const, ...result });
  } catch (cause) {
    return jsonError(
      cause instanceof Error ? cause.message : "AI request failed.",
      400,
    );
  }
}
