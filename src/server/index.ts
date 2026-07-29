/**
 * Server-only application code.
 *
 * Use this layer for privileged orchestration that must never ship to the client:
 * database access, signed URLs, provider SDKs with secret keys, and route handlers’
 * shared logic.
 *
 * Import from here only in Server Components, Server Actions, and Route Handlers.
 */

export { summarizeDocumentByStoragePath, type SummarizeByStoragePathInput } from "./summarize-document";
export {
  getUser,
  requireUser,
  requireUserOrRedirect,
  type AuthUserResult,
  type RequireUserResult,
} from "./auth";
