/**
 * Audio export types — cached MP3 narration downloads.
 */

import type { SummaryType } from "@/features/ai";
import type { TtsSource } from "@/features/tts";

export type AudioExportSource = TtsSource;

export type AudioExportRow = {
  id: string;
  user_id: string;
  document_storage_path: string;
  source: AudioExportSource;
  page_number: number | null;
  summary_type: SummaryType | null;
  voice: string;
  model: string;
  object_key: string;
  mime_type: string;
  byte_size: number;
  original_file_name: string | null;
  created_at: string;
  updated_at: string;
};

export type AudioExportIdentity =
  | {
      source: "page";
      storagePath: string;
      pageNumber: number;
      originalFileName?: string;
    }
  | {
      source: "summary";
      documentId: string;
      summaryType: SummaryType;
    };

export type CreateAudioExportInput = AudioExportIdentity & {
  regenerate?: boolean;
};

export type AudioExportDownload = {
  exportId: string;
  downloadUrl: string;
  mimeType: string;
  format: "mp3";
  source: AudioExportSource;
  fileName: string;
  byteSize: number;
  voice: string;
  model: string;
  cached: boolean;
  expiresIn: number;
  pageNumber: number | null;
  summaryType: SummaryType | null;
  documentStoragePath: string;
  originalFileName: string | null;
  updatedAt: string;
};

export type AudioExportListItem = {
  exportId: string;
  downloadUrl: string;
  mimeType: string;
  format: "mp3";
  source: AudioExportSource;
  fileName: string;
  byteSize: number;
  voice: string;
  model: string;
  expiresIn: number;
  pageNumber: number | null;
  summaryType: SummaryType | null;
  documentStoragePath: string;
  originalFileName: string | null;
  updatedAt: string;
};

export type ExportUiStatus =
  | "idle"
  | "exporting"
  | "success"
  | "error";
