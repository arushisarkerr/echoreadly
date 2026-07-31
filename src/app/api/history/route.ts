import { listActivityEvents } from "@/features/history/record-event";

export const runtime = "nodejs";

const OWNER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, status: number) {
  return Response.json({ ok: false as const, error: message }, { status });
}

export async function GET(request: Request) {
  const ownerId = new URL(request.url).searchParams.get("ownerId")?.trim() ?? "";
  if (!OWNER_ID_PATTERN.test(ownerId)) {
    return jsonError("Invalid owner id.", 400);
  }

  try {
    const events = await listActivityEvents(ownerId);
    return Response.json({ ok: true as const, events });
  } catch (cause) {
    return jsonError(
      cause instanceof Error ? cause.message : "Unable to load history.",
      400,
    );
  }
}
