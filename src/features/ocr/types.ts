/**
 * Typed OCR errors for provider implementations.
 */

export type OcrErrorCode =
  | "missing_api_key"
  | "invalid_pdf"
  | "rate_limit"
  | "api_error"
  | "empty_result"
  | "network_error";

export type OcrError = {
  code: OcrErrorCode;
  message: string;
  status?: number;
};

/**
 * Thrown by OCR providers on configuration or API failures.
 */
export class OcrProviderError extends Error {
  readonly code: OcrErrorCode;
  readonly status?: number;

  constructor(error: OcrError) {
    super(error.message);
    this.name = "OcrProviderError";
    this.code = error.code;
    this.status = error.status;
  }
}
