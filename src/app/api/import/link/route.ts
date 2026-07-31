import { ingestLinkToLibrary } from "@/features/import/server/ingest-link";

export const runtime = "nodejs";

const OWNER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, status: number) {
  return Response.json({ ok: false as const, error: message }, { status });
}

/**
 * Website / YouTube link import — shared Storage → DB → processing pipeline.
 */
export async function POST(request: Request) {
  let body: { url?: unknown; ownerId?: unknown; idempotencyKey?: unknown };

  try {
    body = (await request.json()) as {
      url?: unknown;
      ownerId?: unknown;
      idempotencyKey?: unknown;
    };
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const url = typeof body.url === "string" ? body.url : "";
  const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
  const idempotencyKey =
    typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";

  if (!OWNER_ID_PATTERN.test(ownerId)) {
    return jsonError("Invalid upload owner id.", 400);
  }
  if (!OWNER_ID_PATTERN.test(idempotencyKey)) {
    return jsonError("Invalid upload idempotency key.", 400);
  }

  try {
    const result = await ingestLinkToLibrary(url, ownerId, idempotencyKey);
    return Response.json({ ok: true as const, result });
  } catch (cause) {
    const message =
      cause instanceof Error && cause.message
        ? cause.message
        : "Unable to import link.";
    return jsonError(message, 400);
  }
}
