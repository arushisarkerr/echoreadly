/**
 * Validated analytics event intake for client-originated actions
 * (collections). Server verifies ownership before counting.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  apiError,
  apiSuccess,
  enforceRateLimit,
  getRequestIp,
  rateLimitedResponse,
} from "@/lib/security";
import { requireUser } from "@/server/auth";
import { trackAnalyticsEvent } from "@/features/analytics/track-event";

type TrackBody = {
  eventName?: unknown;
  collectionId?: unknown;
  storagePath?: unknown;
  label?: unknown;
};

const ALLOWED = new Set([
  "collection_created",
  "collection_item_added",
]);

export async function POST(request: Request) {
  const route = "/api/analytics/events";

  const auth = await requireUser();
  if (!auth.ok) {
    return apiError("UNAUTHORIZED", auth.error, auth.status);
  }

  const rate = await enforceRateLimit({
    bucket: "analytics",
    userId: auth.user.id,
    ip: getRequestIp(request),
  });

  if (!rate.ok) {
    return rateLimitedResponse(rate);
  }

  let body: TrackBody;
  try {
    body = (await request.json()) as TrackBody;
  } catch {
    return apiError("VALIDATION", "Invalid request body.", 400);
  }

  const eventName =
    typeof body.eventName === "string" ? body.eventName : "";
  if (!ALLOWED.has(eventName)) {
    return apiError(
      "VALIDATION",
      "eventName must be a supported collection event.",
      400,
    );
  }

  const collectionId =
    typeof body.collectionId === "string" ? body.collectionId.trim() : "";
  if (!collectionId) {
    return apiError("VALIDATION", "collectionId is required.", 400);
  }

  const storagePath =
    typeof body.storagePath === "string" ? body.storagePath.trim() : null;
  const label = typeof body.label === "string" ? body.label.trim() : undefined;

  try {
    const supabase = await createClient();

    if (eventName === "collection_created") {
      const { data, error } = await supabase
        .from("collections")
        .select("id, name")
        .eq("id", collectionId)
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (error || !data) {
        return apiError("FORBIDDEN", "Collection not found.", 403);
      }

      await trackAnalyticsEvent({
        userId: auth.user.id,
        eventName: "collection_created",
        label: label || `Collection: ${data.name}`,
        metadata: { collectionId },
      });

      return apiSuccess({ tracked: true as const });
    }

    if (!storagePath) {
      return apiError(
        "VALIDATION",
        "storagePath is required for collection_item_added.",
        400,
      );
    }

    const { data, error } = await supabase
      .from("collection_documents")
      .select("id, collection_id, storage_path")
      .eq("collection_id", collectionId)
      .eq("storage_path", storagePath)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (error || !data) {
      return apiError("FORBIDDEN", "Collection membership not found.", 403);
    }

    await trackAnalyticsEvent({
      userId: auth.user.id,
      eventName: "collection_item_added",
      label: label || "Added to collection",
      storagePath,
      metadata: { collectionId },
    });

    return apiSuccess({ tracked: true as const });
  } catch (error) {
    logger.warn(
      "Analytics event intake failed",
      { route, userId: auth.user.id, eventName },
      error,
    );
    return apiSuccess({ tracked: false as const });
  }
}
