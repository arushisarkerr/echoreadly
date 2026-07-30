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

export type ListeningProgressPlaybackSource = "page" | "summary";

export type DocumentListeningProgressRow = {
  id: string;
  user_id: string;
  storage_path: string;
  document_id: string | null;
  page_number: number;
  page_count: number | null;
  scroll_ratio: number;
  playback_seconds: number;
  playback_source: ListeningProgressPlaybackSource | null;
  last_opened_at: string;
  created_at: string;
  updated_at: string;
};

export type UpsertListeningProgressInput = {
  userId: string;
  storagePath: string;
  documentId?: string | null;
  pageNumber: number;
  pageCount?: number | null;
  scrollRatio?: number;
  playbackSeconds?: number;
  playbackSource?: ListeningProgressPlaybackSource | null;
  lastOpenedAt?: string;
};
