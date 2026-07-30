/**
 * Security helpers for API routes and edge responses.
 */

export {
  apiBinary,
  apiError,
  apiSuccess,
  mapAppErrorToResponse,
  mapDomainFailure,
  rateLimitedResponse,
  type ApiErrorBody,
  type ApiErrorCode,
  type ApiSuccessBody,
  type DomainErrorArea,
} from "./api-error";
export { applySecurityHeaders, getSecurityHeaders } from "./headers";
export {
  enforceRateLimit,
  getRequestIp,
  RATE_LIMITS,
  resetRateLimitStore,
  shouldUseDurableRateLimitStore,
  type EnforceRateLimitInput,
  type RateLimitBucket,
  type RateLimitConfig,
  type RateLimitResult,
} from "./rate-limit";
export {
  MAX_CHAT_HISTORY_ITEMS,
  MAX_CHAT_MESSAGE_LENGTH,
  MAX_FILE_NAME_LENGTH,
  MAX_STORAGE_PATH_LENGTH,
  MAX_SUMMARY_TEXT_LENGTH,
  isSummaryType,
  validateChatHistory,
  validateChatQuestion,
  validateFileName,
  validateFileSize,
  validatePageNumber,
  validatePdfUploadMeta,
  validateStoragePath,
  validateSummaryType,
  validateTtsSource,
  validateTtsText,
  type ChatHistoryItemInput,
  type ValidationFailure,
  type ValidationResult,
  type ValidationSuccess,
} from "./validation";
