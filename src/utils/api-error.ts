/**
 * Parse structured API error payloads from EchoReadly route handlers.
 */

export type ApiErrorPayload = {
  code?: string;
  message: string;
};

/**
 * Normalize `{ ok:false, error }` where `error` may be a string (legacy)
 * or `{ code, message }` (structured).
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong.",
): string {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const record = error as { message?: unknown; code?: unknown };
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
  }

  return fallback;
}

export function parseApiErrorBody(
  payload: unknown,
  fallback = "Something went wrong.",
): ApiErrorPayload {
  if (!payload || typeof payload !== "object") {
    return { message: fallback };
  }

  const record = payload as { error?: unknown; ok?: unknown };
  return {
    code:
      record.error &&
      typeof record.error === "object" &&
      typeof (record.error as { code?: unknown }).code === "string"
        ? ((record.error as { code: string }).code)
        : undefined,
    message: getApiErrorMessage(record.error, fallback),
  };
}
