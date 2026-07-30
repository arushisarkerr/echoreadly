/**
 * Upload preflight — validates PDF metadata and enforces rate limits
 * before the client uploads directly to Supabase Storage.
 */

import { logger } from "@/lib/logger";
import {
  apiError,
  apiSuccess,
  enforceRateLimit,
  getRequestIp,
  rateLimitedResponse,
  validatePdfUploadMeta,
} from "@/lib/security";
import { requireUser } from "@/server/auth";

type UploadPreflightBody = {
  fileName?: unknown;
  fileSize?: unknown;
  mimeType?: unknown;
};

export async function POST(request: Request) {
  const route = "/api/documents/upload";

  const auth = await requireUser();
  if (!auth.ok) {
    return apiError("UNAUTHORIZED", auth.error, auth.status);
  }

  const rate = await enforceRateLimit({
    bucket: "upload",
    userId: auth.user.id,
    ip: getRequestIp(request),
  });

  if (!rate.ok) {
    logger.warn("Upload rate limited", {
      route,
      userId: auth.user.id,
      limitedBy: rate.limitedBy,
    });
    return rateLimitedResponse(rate);
  }

  let body: UploadPreflightBody;

  try {
    body = (await request.json()) as UploadPreflightBody;
  } catch {
    return apiError("VALIDATION", "Invalid request body.", 400);
  }

  const meta = validatePdfUploadMeta(body);
  if (!meta.ok) {
    logger.uploadFailure("Upload preflight validation failed", {
      route,
      userId: auth.user.id,
      code: meta.code,
    }, meta.message);
    return apiError(meta.code, meta.message, 400);
  }

  return apiSuccess({
    allowed: true as const,
    fileName: meta.data.fileName,
    fileSize: meta.data.fileSize,
    mimeType: meta.data.mimeType,
  });
}
