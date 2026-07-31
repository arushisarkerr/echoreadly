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
};
