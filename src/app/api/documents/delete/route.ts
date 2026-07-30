/**
 * Delete an owned PDF from Storage and related DB rows (chunks/summaries).
 */

import { logger } from "@/lib/logger";
import {
  apiError,
  apiSuccess,
  enforceRateLimit,
  getRequestIp,
  rateLimitedResponse,
  validateStoragePath,
} from "@/lib/security";
import { requireUser } from "@/server/auth";
import { deleteOwnedDocument } from "@/server/delete-document";

type DeleteRequestBody = {
  storagePath?: unknown;
};

export async function POST(request: Request) {
  const route = "/api/documents/delete";

  const auth = await requireUser();
  if (!auth.ok) {
    return apiError("UNAUTHORIZED", auth.error, auth.status);
  }

  const rate = await enforceRateLimit({
    bucket: "delete",
    userId: auth.user.id,
    ip: getRequestIp(request),
  });

  if (!rate.ok) {
    logger.warn("Delete rate limited", {
      route,
      userId: auth.user.id,
      limitedBy: rate.limitedBy,
    });
    return rateLimitedResponse(rate);
  }

  let body: DeleteRequestBody;

  try {
    body = (await request.json()) as DeleteRequestBody;
  } catch {
    return apiError("VALIDATION", "Invalid request body.", 400);
  }

  const storagePath = validateStoragePath(body.storagePath);
  if (!storagePath.ok) {
    return apiError(storagePath.code, storagePath.message, 400);
  }

  const result = await deleteOwnedDocument(storagePath.data);

  if (!result.ok) {
    logger.error("Document delete failed", {
      route,
      userId: auth.user.id,
      storagePath: storagePath.data,
      code: result.code,
    }, result.error);

    if (result.code === "FORBIDDEN") {
      return apiError("FORBIDDEN", result.error, 403);
    }

    if (result.code === "NOT_FOUND") {
      return apiError("NOT_FOUND", result.error, 404);
    }

    return apiError(
      "DELETE_ERROR",
      "Unable to delete this document. Please try again.",
      500,
    );
  }

  logger.info("Document deleted", {
    route,
    userId: auth.user.id,
    storagePath: result.storagePath,
    removedFromStorage: result.removedFromStorage,
    deletedDocumentRows: result.deletedDocumentRows,
  });

  return apiSuccess({
    deleted: true as const,
    storagePath: result.storagePath,
  });
}
