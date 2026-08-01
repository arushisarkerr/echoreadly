/**
 * Normalized EchoReadly AI errors.
 * Features must never receive raw provider SDK errors.
 */

export type AiErrorCode =
  | "not_configured"
  | "provider_unavailable"
  | "no_healthy_key"
  | "unsupported_capability"
  | "unsupported_model"
  | "validation_failed"
  | "rate_limited"
  | "quota_exceeded"
  | "auth_failed"
  | "timeout"
  | "circuit_open"
  | "retry_exhausted"
  | "adapter_missing"
  | "not_implemented"
  | "queue_rejected"
  | "internal";

export class AiProviderError extends Error {
  readonly code: AiErrorCode;
  readonly providerId?: string;
  readonly keyId?: string;
  readonly retryable: boolean;
  readonly causeMessage?: string;

  constructor(input: {
    code: AiErrorCode;
    message: string;
    providerId?: string;
    keyId?: string;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(input.message);
    this.name = "AiProviderError";
    this.code = input.code;
    this.providerId = input.providerId;
    this.keyId = input.keyId;
    this.retryable = input.retryable ?? false;
    if (input.cause instanceof Error) {
      this.causeMessage = input.cause.message;
    } else if (typeof input.cause === "string") {
      this.causeMessage = input.cause;
    }
  }
}

export function isAiProviderError(value: unknown): value is AiProviderError {
  return value instanceof AiProviderError;
}

/** Map loose provider failure signals into a stable EchoReadly error. */
export function mapProviderFailure(input: {
  providerId?: string;
  keyId?: string;
  status?: number | null;
  body?: string;
  cause?: unknown;
}): AiProviderError {
  const status = input.status ?? null;
  const body = (input.body ?? "").toLowerCase();
  const causeText =
    input.cause instanceof Error
      ? input.cause.message.toLowerCase()
      : typeof input.cause === "string"
        ? input.cause.toLowerCase()
        : "";
  const haystack = `${status ?? ""} ${body} ${causeText}`;

  if (
    haystack.includes("insufficient_quota") ||
    haystack.includes("quota") ||
    haystack.includes("billing") ||
    haystack.includes("payment required")
  ) {
    return new AiProviderError({
      code: "quota_exceeded",
      message:
        "AI provider quota exceeded. Add credits or configure another provider.",
      providerId: input.providerId,
      keyId: input.keyId,
      retryable: false,
      cause: input.cause,
    });
  }

  if (status === 429 || haystack.includes("rate limit") || haystack.includes("resource_exhausted")) {
    return new AiProviderError({
      code: "rate_limited",
      message: "AI provider rate-limited this request. Retry shortly.",
      providerId: input.providerId,
      keyId: input.keyId,
      retryable: true,
      cause: input.cause,
    });
  }

  if (status === 401 || status === 403 || haystack.includes("invalid api key") || haystack.includes("unauthorized")) {
    return new AiProviderError({
      code: "auth_failed",
      message: "AI provider authentication failed.",
      providerId: input.providerId,
      keyId: input.keyId,
      retryable: false,
      cause: input.cause,
    });
  }

  if (status === 408 || haystack.includes("timeout")) {
    return new AiProviderError({
      code: "timeout",
      message: "AI provider request timed out.",
      providerId: input.providerId,
      keyId: input.keyId,
      retryable: true,
      cause: input.cause,
    });
  }

  return new AiProviderError({
    code: "provider_unavailable",
    message: "AI provider request failed.",
    providerId: input.providerId,
    keyId: input.keyId,
    retryable: status != null ? status >= 500 : true,
    cause: input.cause,
  });
}
