/**
 * Document row shapes for the library upload flow.
 */

export type ProcessingStatus = "uploaded" | "processing" | "ready" | "failed";

export type DocumentRecord = {
  id: string;
  /** Authenticated user id or guest owner id. */
  ownerId: string;
  filename: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  uploadedAt: string;
  processingStatus: ProcessingStatus;
  pageCount?: number | null;
  sourceFormat?: string | null;
  sourceUrl?: string | null;
  sourceMetadata?: Record<string, unknown> | null;
  extractedText?: string | null;
  processingStage?: string | null;
  processingError?: string | null;
  originalLanguage?: string | null;
  translatedLanguages?: string[];
  audioLanguages?: string[];
};

export type DocumentRow = {
  id: string;
  user_id: string | null;
  guest_id: string | null;
  filename: string;
  original_file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_at: string;
  processing_status: ProcessingStatus;
  document_hash: string;
  page_count?: number | null;
  source_format?: string | null;
  source_url?: string | null;
  source_metadata?: Record<string, unknown> | null;
  extracted_text?: string | null;
  processing_stage?: string | null;
  processing_error?: string | null;
  original_language?: string | null;
};

export type CreateDocumentInput = {
  /** Pre-auth import owner id stored in guest_id (keeps user_id FK intact). */
  guestId: string;
  filename: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  uploadedAt: string;
  documentHash: string;
  processingStatus?: ProcessingStatus;
  sourceFormat?: string;
  sourceUrl?: string;
  sourceMetadata?: Record<string, unknown>;
  processingStage?: string;
};
