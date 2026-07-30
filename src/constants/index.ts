/**
 * Barrel export for shared constants.
 * Import from `@/constants` rather than deep paths when possible.
 */

export {
  APP_DEFAULT_URL,
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
} from "./app";
export {
  ACCEPTED_DOCUMENT_ACCEPT,
  DOCUMENT_EXTENSIONS,
  DOCUMENT_FORMATS,
  DOCUMENT_MIME_TYPES,
  SUPPORTED_DOCUMENT_FORMATS_LABEL,
  VIRTUAL_PAGE_CHAR_TARGET,
  canonicalMimeForFormat,
  formatFromExtension,
  formatLabel,
  getExtension,
  isSupportedDocumentExtension,
  mimeMatchesFormat,
  resolveDocumentFormat,
  type DocumentFormat,
} from "./formats";
export {
  DEFAULT_TARGET_LANGUAGE,
  MAX_TRANSLATION_SELECTION_CHARS,
  MAX_TRANSLATION_SOURCE_CHARS,
  TARGET_LANGUAGE_CATALOG,
  getTargetLanguageDefinition,
  isSupportedTargetLanguage,
  type TargetLanguageCode,
  type TargetLanguageDefinition,
} from "./languages";
export {
  ACCEPTED_PDF_MIME,
  MAX_DOCUMENT_UPLOAD_BYTES,
  MAX_DOCUMENT_UPLOAD_LABEL,
  MAX_PDF_UPLOAD_BYTES,
  MAX_PDF_UPLOAD_LABEL,
} from "./limits";
export {
  DEFAULT_PLAN_ID,
  FREE_TTS_VOICE_IDS,
  PLAN_CATALOG,
  PLAN_IDS,
  getPlanDefinition,
  getPlanLimit,
  isBillingInterval,
  isPlanId,
  isUnlimitedLimit,
  planHasFeature,
  type BillingInterval,
  type PlanDefinition,
  type PlanFeature,
  type PlanId,
  type PlanLimits,
  type PlanStatus,
  type UsageMetric,
} from "./plans";
export {
  ANALYTICS_EVENT_NAMES,
  ANALYTICS_RANGE_PRESETS,
  addUtcDays,
  eventLabel,
  isAnalyticsEventName,
  resolveAnalyticsRange,
  utcDayString,
  type AnalyticsEventName,
  type AnalyticsRangePreset,
} from "./analytics";
export {
  DEFAULT_JOB_MAX_ATTEMPTS,
  JOB_CLAIM_BATCH_SIZE,
  JOB_HANDLER_TIMEOUT_MS,
  JOB_STATUSES,
  JOB_STALE_LOCK_SECONDS,
  JOB_TYPES,
  isJobStatus,
  isJobType,
  jobBackoffSeconds,
  jobTypeLabel,
  type JobStatus,
  type JobType,
} from "./jobs";
export {
  isAuthPagePath,
  isProtectedPath,
  PROTECTED_PATH_PREFIXES,
  readerPathForStorage,
  ROUTES,
  type AppRoute,
} from "./routes";
export {
  AUDIO_EXPORT_SIGNED_URL_EXPIRES_IN,
  AUDIO_EXPORTS_BUCKET,
  PDFS_BUCKET,
} from "./storage";
