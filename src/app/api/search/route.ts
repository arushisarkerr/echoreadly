import { searchLibrary } from "@/features/search/search-library";

export const runtime = "nodejs";

const OWNER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, status: number) {
  return Response.json({ ok: false as const, error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ownerId = url.searchParams.get("ownerId")?.trim() ?? "";
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (!OWNER_ID_PATTERN.test(ownerId)) {
    return jsonError("Invalid owner id.", 400);
  }

  try {
    const hits = await searchLibrary({ guestId: ownerId, query });
    return Response.json({ ok: true as const, hits });
  } catch (cause) {
    return jsonError(
      cause instanceof Error ? cause.message : "Search failed.",
      400,
    );
  }
}
