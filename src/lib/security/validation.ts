/**
 * Shared request validation for document APIs.
 */

import {
  ACCEPTED_PDF_MIME,
  MAX_PDF_UPLOAD_BYTES,
} from "@/constants";
import { MAX_TTS_INPUT_CHARS } from "@/features/tts/types";
import type { SummaryType } from "@/features/ai";

export const MAX_STORAGE_PATH_LENGTH = 512;
export const MAX_FILE_NAME_LENGTH = 255;
export const MAX_CHAT_MESSAGE_LENGTH = 2_000;
export const MAX_CHAT_HISTORY_ITEMS = 20;
export const MAX_SUMMARY_TEXT_LENGTH = 50_000;

export type ValidationFailure = {
  ok: false;
  code: "VALIDATION";
  message: string;
};

export type ValidationSuccess<T> = {
  ok: true;
  data: T;
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

const SUMMARY_TYPES = new Set<SummaryType>(["short", "detailed", "bullet"]);

export function isSummaryType(value: unknown): value is SummaryType {
  return typeof value === "string" && SUMMARY_TYPES.has(value as SummaryType);
}

export function validateStoragePath(
  value: unknown,
): ValidationResult<string> {
  if (typeof value !== "string" || !value.trim()) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "storagePath is required.",
    };
  }

  const storagePath = value.trim();

  if (storagePath.length > MAX_STORAGE_PATH_LENGTH) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "storagePath is too long.",
    };
  }

  if (
    storagePath.includes("..") ||
    storagePath.includes("\0") ||
    storagePath.startsWith("/")
  ) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "storagePath is invalid.",
    };
  }

  return { ok: true, data: storagePath };
}

export function validateFileName(
  value: unknown,
): ValidationResult<string | undefined> {
  if (value === undefined || value === null || value === "") {
    return { ok: true, data: undefined };
  }

  if (typeof value !== "string") {
    return {
      ok: false,
      code: "VALIDATION",
      message: "originalFileName must be a string.",
    };
  }

  const name = value.trim();
  if (!name) {
    return { ok: true, data: undefined };
  }

  if (name.length > MAX_FILE_NAME_LENGTH) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "originalFileName is too long.",
    };
  }

  if (name.includes("\0") || name.includes("..") || name.includes("/") || name.includes("\\")) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "originalFileName is invalid.",
    };
  }

  return { ok: true, data: name };
}

export function validateFileSize(
  value: unknown,
): ValidationResult<number | undefined> {
  if (value === undefined || value === null) {
    return { ok: true, data: undefined };
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "fileSize must be a non-negative number.",
    };
  }

  if (value > MAX_PDF_UPLOAD_BYTES) {
    return {
      ok: false,
      code: "VALIDATION",
      message: `fileSize exceeds the ${MAX_PDF_UPLOAD_BYTES} byte limit.`,
    };
  }

  return { ok: true, data: value };
}

export function validatePdfUploadMeta(input: {
  fileName?: unknown;
  fileSize?: unknown;
  mimeType?: unknown;
}): ValidationResult<{
  fileName: string;
  fileSize: number;
  mimeType: string;
}> {
  if (typeof input.mimeType !== "string" || input.mimeType !== ACCEPTED_PDF_MIME) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Only application/pdf uploads are accepted.",
    };
  }

  const fileName = validateFileName(input.fileName);
  if (!fileName.ok || !fileName.data) {
    return {
      ok: false,
      code: "VALIDATION",
      message: fileName.ok
        ? "fileName is required."
        : fileName.message,
    };
  }

  if (!fileName.data.toLowerCase().endsWith(".pdf")) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "fileName must end with .pdf.",
    };
  }

  const fileSize = validateFileSize(input.fileSize);
  if (!fileSize.ok || fileSize.data === undefined) {
    return {
      ok: false,
      code: "VALIDATION",
      message: fileSize.ok ? "fileSize is required." : fileSize.message,
    };
  }

  if (fileSize.data <= 0) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "fileSize must be greater than zero.",
    };
  }

  return {
    ok: true,
    data: {
      fileName: fileName.data,
      fileSize: fileSize.data,
      mimeType: ACCEPTED_PDF_MIME,
    },
  };
}

export function validateSummaryType(
  value: unknown,
): ValidationResult<SummaryType> {
  if (!isSummaryType(value)) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "summaryType must be short, detailed, or bullet.",
    };
  }

  return { ok: true, data: value };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateDocumentId(
  value: unknown,
): ValidationResult<string> {
  if (typeof value !== "string" || !value.trim()) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "documentId is required.",
    };
  }

  const documentId = value.trim();
  if (!UUID_RE.test(documentId)) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "documentId must be a valid UUID.",
    };
  }

  return { ok: true, data: documentId };
}

export function validateChatQuestion(
  value: unknown,
): ValidationResult<string> {
  if (typeof value !== "string" || !value.trim()) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "question is required.",
    };
  }

  const question = value.trim();

  if (question.length > MAX_CHAT_MESSAGE_LENGTH) {
    return {
      ok: false,
      code: "VALIDATION",
      message: `question must be at most ${MAX_CHAT_MESSAGE_LENGTH} characters.`,
    };
  }

  return { ok: true, data: question };
}

export type ChatHistoryItemInput = {
  role: "user" | "assistant";
  content: string;
};

export function validateChatHistory(
  value: unknown,
): ValidationResult<ChatHistoryItemInput[]> {
  if (value === undefined || value === null) {
    return { ok: true, data: [] };
  }

  if (!Array.isArray(value)) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "history must be an array.",
    };
  }

  if (value.length > MAX_CHAT_HISTORY_ITEMS) {
    return {
      ok: false,
      code: "VALIDATION",
      message: `history may contain at most ${MAX_CHAT_HISTORY_ITEMS} messages.`,
    };
  }

  const history: ChatHistoryItemInput[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      return {
        ok: false,
        code: "VALIDATION",
        message: "history items must be objects.",
      };
    }

    const record = entry as { role?: unknown; content?: unknown };
    if (record.role !== "user" && record.role !== "assistant") {
      return {
        ok: false,
        code: "VALIDATION",
        message: "history item role must be user or assistant.",
      };
    }

    if (typeof record.content !== "string" || !record.content.trim()) {
      return {
        ok: false,
        code: "VALIDATION",
        message: "history item content is required.",
      };
    }

    if (record.content.trim().length > MAX_CHAT_MESSAGE_LENGTH) {
      return {
        ok: false,
        code: "VALIDATION",
        message: `history item content must be at most ${MAX_CHAT_MESSAGE_LENGTH} characters.`,
      };
    }

    history.push({
      role: record.role,
      content: record.content.trim(),
    });
  }

  return { ok: true, data: history };
}

export function validateTtsText(
  value: unknown,
): ValidationResult<string> {
  if (typeof value !== "string" || !value.trim()) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "text is required.",
    };
  }

  const text = value.trim();

  if (text.length > MAX_TTS_INPUT_CHARS) {
    return {
      ok: false,
      code: "VALIDATION",
      message: `text must be at most ${MAX_TTS_INPUT_CHARS} characters.`,
    };
  }

  if (text.length > MAX_SUMMARY_TEXT_LENGTH) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "text is too long.",
    };
  }

  return { ok: true, data: text };
}

export function validatePageNumber(
  value: unknown,
): ValidationResult<number> {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "pageNumber must be a positive integer.",
    };
  }

  return { ok: true, data: value };
}

export function validateTtsSource(
  value: unknown,
): ValidationResult<"summary" | "page"> {
  if (value !== "summary" && value !== "page") {
    return {
      ok: false,
      code: "VALIDATION",
      message: "source must be summary or page.",
    };
  }

  return { ok: true, data: value };
}
