/**
 * Upload preflight — validates PDF metadata and enforces rate limits
 * before the client uploads directly to Supabase Storage.
 */

import { logger } from "@/lib/logger";
import {
  recordUsage,
  requireFeatureAndQuota,
} from "@/features/billing/gate";
import {
  apiError,
  apiSuccess,
  enforceRateLimit,
  getRequestIp,
  rateLimitedResponse,
  validateDocumentUploadMeta,
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

  const gate = await requireFeatureAndQuota(
    auth.user.id,
    "upload",
    "documents",
  );
  if (!gate.ok) {
    return gate.response;
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

  const meta = validateDocumentUploadMeta(body);
  if (!meta.ok) {
    logger.uploadFailure("Upload preflight validation failed", {
      route,
      userId: auth.user.id,
      code: meta.code,
    }, meta.message);
    return apiError(meta.code, meta.message, 400);
  }

  try {
    await recordUsage(auth.user.id, "documents", gate.entitlement);
  } catch (error) {
    logger.warn("Upload usage record failed", {
      route,
      userId: auth.user.id,
    }, error);
  }

  return apiSuccess({
    allowed: true as const,
    fileName: meta.data.fileName,
    fileSize: meta.data.fileSize,
    mimeType: meta.data.mimeType,
    format: meta.data.format,
  });
}
