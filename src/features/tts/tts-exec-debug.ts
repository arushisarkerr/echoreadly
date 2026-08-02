/**
 * TEMPORARY TTS execution-path debug logging (post provider selection).
 * Never logs API keys or full document text. Remove after debugging.
 */

import { formatKeyIndexLabel } from "@/features/ai-provider/debug/translation-debug";

const PREFIX = "[TTS EXEC DEBUG]";

export function logTtsExec(step: string, details?: Record<string, unknown>): void {
  if (details && Object.keys(details).length > 0) {
    console.info(`${PREFIX} ${step}`, details);
    return;
  }
  console.info(`${PREFIX} ${step}`);
}

export function keyIndexLabel(providerId: string, keyId: string): string {
  return formatKeyIndexLabel(providerId, keyId);
}

/** Log a caught error — never secrets. */
export function logTtsExecError(
  error: unknown,
  context?: {
    provider?: string;
    model?: string;
    keyIndex?: string;
  },
): void {
  const err = error as {
    message?: unknown;
    stack?: unknown;
    cause?: unknown;
    causeMessage?: unknown;
    status?: unknown;
    statusCode?: unknown;
    body?: unknown;
    response?: { status?: unknown; body?: unknown };
    code?: unknown;
    providerId?: unknown;
    keyId?: unknown;
  };

  const provider =
    context?.provider ??
    (typeof err?.providerId === "string" ? err.providerId : null);
  const keyIndex =
    context?.keyIndex ??
    (typeof provider === "string" && typeof err?.keyId === "string"
      ? formatKeyIndexLabel(provider, err.keyId)
      : null);

  console.error(`${PREFIX} CAUGHT ERROR`, {
    message: err?.message ?? String(error),
    code: err?.code ?? null,
    stack: err?.stack ?? null,
    provider,
    model: context?.model ?? null,
    keyIndex,
    cause:
      err?.cause instanceof Error
        ? err.cause.message
        : (err?.cause ?? err?.causeMessage ?? null),
    statusCode: err?.status ?? err?.statusCode ?? err?.response?.status ?? null,
    responseBody:
      typeof err?.body === "string"
        ? err.body.slice(0, 2000)
        : err?.response?.body ?? null,
  });
}
