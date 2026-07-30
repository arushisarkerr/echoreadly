/**
 * Shared backend-oriented types used across server utilities and future APIs.
 */

import type { CitedSection } from "@/features/citations";
import type { ProcessingStatus } from "@/features/processing/types";
import type { SummaryType } from "@/features/ai";

/** JSON-compatible values returned by Supabase / PostgREST. */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type DocumentsRow = {
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
  created_at: string;
  updated_at: string;
};

type DocumentChunksRow = {
  id: string;
  user_id: string;
  document_id: string;
  page_number: number;
  chunk_index: number;
  text: string;
  character_count: number;
  created_at: string;
};

type DocumentSummariesRow = {
  id: string;
  user_id: string;
  document_id: string;
  summary_type: SummaryType;
  content: string;
  citations: CitedSection[] | Json;
  model: string;
  generated_at: string;
  created_at: string;
  updated_at: string;
};

type DocumentListeningProgressRow = {
  id: string;
  user_id: string;
  storage_path: string;
  document_id: string | null;
  page_number: number;
  page_count: number | null;
  scroll_ratio: number;
  playback_seconds: number;
  playback_source: "page" | "summary" | null;
  last_opened_at: string;
  created_at: string;
  updated_at: string;
};

type CollectionsRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type CollectionDocumentsRow = {
  id: string;
  user_id: string;
  collection_id: string;
  storage_path: string;
  added_at: string;
};

/**
 * Supabase database schema for EchoReadly persistence tables.
 */
export type Database = {
  public: {
    Tables: {
      documents: {
        Row: DocumentsRow;
        Insert: Partial<DocumentsRow> & {
          user_id: string;
          storage_path: string;
          original_file_name: string;
          document_hash: string;
        };
        Update: Partial<DocumentsRow>;
        Relationships: [];
      };
      document_chunks: {
        Row: DocumentChunksRow;
        Insert: Partial<DocumentChunksRow> & {
          user_id: string;
          document_id: string;
          page_number: number;
          chunk_index: number;
          text: string;
          character_count: number;
        };
        Update: Partial<DocumentChunksRow>;
        Relationships: [];
      };
      document_summaries: {
        Row: DocumentSummariesRow;
        Insert: Partial<DocumentSummariesRow> & {
          user_id: string;
          document_id: string;
          summary_type: SummaryType;
          content: string;
          model: string;
        };
        Update: Partial<DocumentSummariesRow>;
        Relationships: [];
      };
      document_listening_progress: {
        Row: DocumentListeningProgressRow;
        Insert: Partial<DocumentListeningProgressRow> & {
          user_id: string;
          storage_path: string;
        };
        Update: Partial<DocumentListeningProgressRow>;
        Relationships: [];
      };
      collections: {
        Row: CollectionsRow;
        Insert: Partial<CollectionsRow> & {
          user_id: string;
          name: string;
        };
        Update: Partial<CollectionsRow>;
        Relationships: [];
      };
      collection_documents: {
        Row: CollectionDocumentsRow;
        Insert: Partial<CollectionDocumentsRow> & {
          user_id: string;
          collection_id: string;
          storage_path: string;
        };
        Update: Partial<CollectionDocumentsRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      processing_status: ProcessingStatus;
    };
  };
};

/** Common pagination input for list endpoints. */
export type PaginationInput = {
  page?: number;
  pageSize?: number;
};

/** Common pagination metadata for list responses. */
export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** Standard list payload shape for future API responses. */
export type PaginatedResult<T> = {
  items: T[];
  meta: PaginationMeta;
};

/**
 * Document processing status values.
 * Re-exported for shared backend consumption; source of truth lives in features/processing.
 */
export type { ProcessingStatus } from "@/features/processing/types";
export type { DocumentMetadata } from "@/features/processing/types";
