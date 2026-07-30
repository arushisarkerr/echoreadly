/**
 * Structured API error responses — never include stack traces.
 */

import { NextResponse } from "next/server";

import { AppError } from "@/utils/errors";

import { applySecurityHeaders } from "./headers";
import type { RateLimitResult } from "./rate-limit";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA"
  | "AI_ERROR"
  | "TTS_ERROR"
  | "PROCESSING_ERROR"
  | "UPLOAD_ERROR"
  | "INTERNAL";

export type ApiErrorBody = {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
  };
};

export type ApiSuccessBody<T> = {
  ok: true;
  data: T;
};

export type DomainErrorArea = "ai" | "tts" | "processing" | "upload";

function withSecurityHeaders<T>(response: NextResponse<T>): NextResponse<T> {
  applySecurityHeaders(response.headers);
  return response;
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  headers?: HeadersInit,
): NextResponse<ApiErrorBody> {
  const response = NextResponse.json(
    {
      ok: false as const,
      error: { code, message },
    },
    { status, headers },
  );
  return withSecurityHeaders(response);
}

export function apiSuccess<T>(
  data: T,
  status = 200,
  headers?: HeadersInit,
): NextResponse<ApiSuccessBody<T>> {
  const response = NextResponse.json(
    {
      ok: true as const,
      data,
    },
    { status, headers },
  );
  return withSecurityHeaders(response);
}

export function apiBinary(
  body: BodyInit,
  init: {
    status?: number;
    headers?: HeadersInit;
  } = {},
): NextResponse {
  const response = new NextResponse(body, {
    status: init.status ?? 200,
    headers: init.headers,
  });
  return withSecurityHeaders(response);
}

export function rateLimitedResponse(
  result: Extract<RateLimitResult, { ok: false }>,
): NextResponse<ApiErrorBody> {
  return apiError(
    "RATE_LIMITED",
    "Too many requests. Please try again later.",
    429,
    {
      "Retry-After": String(result.retryAfterSeconds),
    },
  );
}

/**
 * Map a domain failure string to a structured client response.
 * Server logs should retain the original message; clients get a safe copy.
 */
export function mapDomainFailure(
  message: string,
  area: DomainErrorArea,
): NextResponse<ApiErrorBody> {
  const classified = classifyDomainMessage(message, area);

  if (classified.status >= 500) {
    return apiError(
      classified.code,
      classified.publicMessage,
      classified.status,
    );
  }

  return apiError(classified.code, classified.publicMessage, classified.status);
}

/**
 * Map known AppError codes / messages to safe client responses.
 * Never forwards stack traces.
 */
export function mapAppErrorToResponse(
  error: unknown,
): NextResponse<ApiErrorBody> {
  if (error instanceof AppError) {
    const status = error.status;
    const code = codeForAppError(error);
    const message =
      status >= 500
        ? "Something went wrong. Please try again."
        : error.message;
    return apiError(code, message, status);
  }

  if (error instanceof Error) {
    const safe = safeClientMessage(error.message);
    if (safe) {
      return apiError(safe.code, safe.message, safe.status);
    }
  }

  return apiError("INTERNAL", "Something went wrong. Please try again.", 500);
}

function codeForAppError(error: AppError): ApiErrorCode {
  switch (error.code) {
    case "UNAUTHORIZED":
      return "UNAUTHORIZED";
    case "FORBIDDEN":
      return "FORBIDDEN";
    case "NOT_FOUND":
      return "NOT_FOUND";
    case "VALIDATION":
      return "VALIDATION";
    case "RATE_LIMITED":
      return "RATE_LIMITED";
    default:
      return "INTERNAL";
  }
}

function classifyDomainMessage(
  message: string,
  area: DomainErrorArea,
): {
  code: ApiErrorCode;
  publicMessage: string;
  status: number;
} {
  const normalized = message.toLowerCase();

  if (normalized.includes("api key") || normalized.includes("not configured")) {
    return {
      code: area === "tts" ? "TTS_ERROR" : "AI_ERROR",
      publicMessage:
        area === "tts"
          ? "Speech is not configured. Please try again later."
          : "AI is not configured. Please try again later.",
      status: 503,
    };
  }

  if (normalized.includes("rate limit") || normalized.includes("429")) {
    return {
      code: "RATE_LIMITED",
      publicMessage: "Too many requests. Please try again later.",
      status: 429,
    };
  }

  if (
    normalized.includes("ownership") ||
    normalized.includes("forbidden") ||
    normalized.includes("do not have access")
  ) {
    return {
      code: "FORBIDDEN",
      publicMessage: "You do not have access to this document.",
      status: 403,
    };
  }

  if (normalized.includes("not found")) {
    return {
      code: "NOT_FOUND",
      publicMessage: "Resource not found.",
      status: 404,
    };
  }

  if (
    normalized.includes("pdfium") ||
    normalized.includes("koffi") ||
    normalized.includes("shared library") ||
    (normalized.includes("native") && normalized.includes("unavailable")) ||
    normalized.includes("edge runtime")
  ) {
    return {
      code: "PROCESSING_ERROR",
      publicMessage:
        "Document text extraction is unavailable on this server. Deploy on a Node.js host with pdfium-native binaries, then retry.",
      status: 503,
    };
  }

  if (
    normalized.includes("required") ||
    normalized.includes("invalid") ||
    normalized.includes("empty") ||
    normalized.includes("no text") ||
    normalized.includes("no extractable") ||
    normalized.includes("no readable") ||
    normalized.includes("scanned") ||
    normalized.includes("image-only") ||
    normalized.includes("ocr is not available") ||
    normalized.includes("text-based pdf") ||
    normalized.includes("no chunks") ||
    normalized.includes("no extracted") ||
    normalized.includes("must be") ||
    normalized.includes("too long") ||
    normalized.includes("exceeds")
  ) {
    return {
      code: "VALIDATION",
      publicMessage: message,
      status: 400,
    };
  }

  const fallbackByArea: Record<
    DomainErrorArea,
    { code: ApiErrorCode; publicMessage: string }
  > = {
    ai: {
      code: "AI_ERROR",
      publicMessage: "Unable to complete the AI request. Please try again.",
    },
    tts: {
      code: "TTS_ERROR",
      publicMessage: "Unable to generate speech. Please try again.",
    },
    processing: {
      code: "PROCESSING_ERROR",
      publicMessage: "Unable to process this document. Please try again.",
    },
    upload: {
      code: "UPLOAD_ERROR",
      publicMessage: "Unable to upload this file. Please try again.",
    },
  };

  const fallback = fallbackByArea[area];
  return {
    code: fallback.code,
    publicMessage: fallback.publicMessage,
    status: 500,
  };
}

function safeClientMessage(
  message: string,
): { code: ApiErrorCode; message: string; status: number } | null {
  const classified = classifyDomainMessage(message, "ai");
  if (classified.status < 500) {
    return {
      code: classified.code,
      message: classified.publicMessage,
      status: classified.status,
    };
  }
  return null;
}
