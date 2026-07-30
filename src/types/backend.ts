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

type AudioExportsRow = {
  id: string;
  user_id: string;
  document_storage_path: string;
  source: "page" | "summary";
  page_number: number | null;
  summary_type: SummaryType | null;
  voice: string;
  model: string;
  object_key: string;
  mime_type: string;
  byte_size: number;
  original_file_name: string | null;
  target_language: string;
  created_at: string;
  updated_at: string;
};

type DocumentTranslationsRow = {
  id: string;
  user_id: string;
  document_id: string;
  scope: "document" | "page" | "selection" | "summary";
  page_number: number | null;
  summary_type: SummaryType | null;
  selection_hash: string | null;
  target_language: string;
  source_content_hash: string;
  source_text: string;
  translated_text: string;
  model: string;
  generated_at: string;
  created_at: string;
  updated_at: string;
};

type BillingCustomersRow = {
  user_id: string;
  stripe_customer_id: string;
  email: string | null;
  trial_used_at: string | null;
  created_at: string;
  updated_at: string;
};

type SubscriptionsRow = {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan_id: "free" | "pro";
  status: string;
  billing_interval: "month" | "year" | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  usage_reset_at: string | null;
  latest_invoice_id: string | null;
  checkout_session_id: string | null;
  created_at: string;
  updated_at: string;
};

type BillingWebhookEventsRow = {
  id: string;
  type: string;
  processed_at: string;
  livemode: boolean;
  payload_summary: string | null;
  created_at: string;
};

type UsageCountersRow = {
  user_id: string;
  metric: string;
  period_start: string;
  count: number;
  updated_at: string;
};

type AnalyticsDailyRow = {
  user_id: string;
  day: string;
  event_name: string;
  count: number;
  total_value: number;
  updated_at: string;
};

type AnalyticsActivityRow = {
  id: string;
  user_id: string;
  event_name: string;
  label: string;
  document_id: string | null;
  storage_path: string | null;
  metadata: Json;
  created_at: string;
};

type BackgroundJobsRow = {
  id: string;
  user_id: string;
  document_id: string | null;
  storage_path: string | null;
  job_type: string;
  status: string;
  progress: number;
  current_step: string | null;
  payload: Json;
  result: Json;
  error_message: string | null;
  attempts: number;
  max_attempts: number;
  idempotency_key: string;
  locked_at: string | null;
  locked_by: string | null;
  run_after: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
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
      user_preferences: {
        Row: {
          user_id: string;
          preferred_tts_voice: string;
          preferred_listening_language: string;
          display_name: string | null;
          playback_speed: number;
          auto_play_next_page: boolean;
          font_size: string;
          reading_width: string;
          theme_preference: string;
          preferred_export_format: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          preferred_tts_voice?: string;
          preferred_listening_language?: string;
          display_name?: string | null;
          playback_speed?: number;
          auto_play_next_page?: boolean;
          font_size?: string;
          reading_width?: string;
          theme_preference?: string;
          preferred_export_format?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          preferred_tts_voice: string;
          preferred_listening_language: string;
          display_name: string | null;
          playback_speed: number;
          auto_play_next_page: boolean;
          font_size: string;
          reading_width: string;
          theme_preference: string;
          preferred_export_format: string;
          updated_at: string;
        }>;
        Relationships: [];
      };
      audio_exports: {
        Row: AudioExportsRow;
        Insert: Partial<AudioExportsRow> & {
          user_id: string;
          document_storage_path: string;
          source: "page" | "summary";
          voice: string;
          model: string;
          object_key: string;
        };
        Update: Partial<AudioExportsRow>;
        Relationships: [];
      };
      document_translations: {
        Row: DocumentTranslationsRow;
        Insert: Partial<DocumentTranslationsRow> & {
          user_id: string;
          document_id: string;
          scope: "document" | "page" | "selection" | "summary";
          target_language: string;
          source_content_hash: string;
          source_text: string;
          translated_text: string;
          model: string;
        };
        Update: Partial<DocumentTranslationsRow>;
        Relationships: [];
      };
      billing_customers: {
        Row: BillingCustomersRow;
        Insert: Partial<BillingCustomersRow> & {
          user_id: string;
          stripe_customer_id: string;
        };
        Update: Partial<BillingCustomersRow>;
        Relationships: [];
      };
      subscriptions: {
        Row: SubscriptionsRow;
        Insert: Partial<SubscriptionsRow> & {
          user_id: string;
          stripe_customer_id: string;
        };
        Update: Partial<SubscriptionsRow>;
        Relationships: [];
      };
      billing_webhook_events: {
        Row: BillingWebhookEventsRow;
        Insert: Partial<BillingWebhookEventsRow> & {
          id: string;
          type: string;
        };
        Update: Partial<BillingWebhookEventsRow>;
        Relationships: [];
      };
      usage_counters: {
        Row: UsageCountersRow;
        Insert: Partial<UsageCountersRow> & {
          user_id: string;
          metric: string;
          period_start: string;
        };
        Update: Partial<UsageCountersRow>;
        Relationships: [];
      };
      analytics_daily: {
        Row: AnalyticsDailyRow;
        Insert: Partial<AnalyticsDailyRow> & {
          user_id: string;
          day: string;
          event_name: string;
        };
        Update: Partial<AnalyticsDailyRow>;
        Relationships: [];
      };
      analytics_activity: {
        Row: AnalyticsActivityRow;
        Insert: Partial<AnalyticsActivityRow> & {
          user_id: string;
          event_name: string;
          label: string;
        };
        Update: Partial<AnalyticsActivityRow>;
        Relationships: [];
      };
      background_jobs: {
        Row: BackgroundJobsRow;
        Insert: Partial<BackgroundJobsRow> & {
          user_id: string;
          job_type: string;
          idempotency_key: string;
        };
        Update: Partial<BackgroundJobsRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_usage_counter: {
        Args: {
          p_user_id: string;
          p_metric: string;
          p_period_start: string;
          p_amount?: number;
        };
        Returns: number;
      };
      increment_analytics_daily: {
        Args: {
          p_user_id: string;
          p_day: string;
          p_event_name: string;
          p_amount?: number;
          p_value?: number;
        };
        Returns: number;
      };
      claim_background_jobs: {
        Args: {
          p_limit?: number;
          p_worker_id?: string;
          p_stale_seconds?: number;
        };
        Returns: BackgroundJobsRow[];
      };
      cleanup_background_jobs: {
        Args: {
          p_older_than_days?: number;
          p_limit?: number;
        };
        Returns: number;
      };
    };
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
