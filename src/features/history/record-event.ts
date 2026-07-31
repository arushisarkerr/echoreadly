import { createServiceClient } from "@/lib/supabase/server";

export type ActivityEvent = {
  id: string;
  guestId: string;
  documentId: string | null;
  eventType: string;
  title: string;
  detail: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export async function recordActivityEvent(input: {
  guestId: string;
  documentId?: string | null;
  eventType: string;
  title: string;
  detail?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const client = createServiceClient();
  try {
    await client.from("activity_events").insert({
      guest_id: input.guestId,
      document_id: input.documentId ?? null,
      event_type: input.eventType,
      title: input.title,
      detail: input.detail ?? null,
      metadata: input.metadata ?? null,
    });
  } catch {
    // History must never break the primary pipeline.
  }
}

export async function listActivityEvents(
  guestId: string,
  limit = 50,
): Promise<ActivityEvent[]> {
  const client = createServiceClient();
  const { data, error } = await client
    .from("activity_events")
    .select("*")
    .eq("guest_id", guestId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Unable to load history.");
  }

  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    guestId: String(row.guest_id),
    documentId: (row.document_id as string | null) ?? null,
    eventType: String(row.event_type),
    title: String(row.title),
    detail: (row.detail as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: String(row.created_at),
  }));
}
