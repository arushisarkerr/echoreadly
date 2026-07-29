/**
 * Shared persistence result and row shapes for Supabase tables.
 */

import type { CitedSection } from "@/features/citations";
import type { ProcessingStatus } from "@/features/processing/types";
import type { SummaryType } from "@/features/ai";

export type PersistenceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type DocumentRow = {
  id: string;
  user_id: string;
  storage_path: string;
  original_file_name: string;
  file_size: number;
  uploaded_at: string;
  page_count: number | null;
  processing_status: ProcessingStatus;
  document_hash: string;
  extracted_at: string | null;
  chunked_at: string | null;
};

export type DocumentChunkRow = {
  id: string;
  user_id: string;
  document_id: string;
  page_number: number;
  chunk_index: number;
  text: string;
  character_count: number;
};

export type DocumentSummaryRow = {
  id: string;
  user_id: string;
  document_id: string;
  summary_type: SummaryType;
  content: string;
  citations: CitedSection[];
  model: string;
  generated_at: string;
};

export type UpsertDocumentInput = {
  id?: string;
  userId: string;
  storagePath: string;
  originalFileName: string;
  fileSize: number;
  uploadedAt?: string;
  pageCount?: number | null;
  processingStatus?: ProcessingStatus;
  documentHash: string;
  extractedAt?: string | null;
  chunkedAt?: string | null;
};

export type PersistChunkInput = {
  pageNumber: number;
  chunkIndex: number;
  text: string;
  characterCount: number;
};

export type PersistSummaryInput = {
  userId: string;
  documentId: string;
  summaryType: SummaryType;
  content: string;
  citations: CitedSection[];
  model: string;
  generatedAt?: string;
};
