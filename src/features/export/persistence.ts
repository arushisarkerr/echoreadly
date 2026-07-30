/**
 * Persistence helpers for `audio_exports` rows.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { SummaryType } from "@/features/ai";
import {
  normalizeStoragePath,
  uniqueStoragePathVariants,
  type PersistenceResult,
} from "@/features/persistence";

import type { AudioExportRow, AudioExportSource } from "./types";

export type FindAudioExportInput = {
  userId: string;
  documentStoragePath: string;
  source: AudioExportSource;
  pageNumber: number | null;
  summaryType: SummaryType | null;
  voice: string;
  targetLanguage: string;
};

export type UpsertAudioExportInput = {
  id?: string;
  userId: string;
  documentStoragePath: string;
  source: AudioExportSource;
  pageNumber: number | null;
  summaryType: SummaryType | null;
  voice: string;
  model: string;
  objectKey: string;
  mimeType: string;
  byteSize: number;
  originalFileName: string | null;
  targetLanguage: string;
};

function mapRow(row: AudioExportRow): AudioExportRow {
  return {
    id: row.id,
    user_id: row.user_id,
    document_storage_path: row.document_storage_path,
    source: row.source,
    page_number: row.page_number,
    summary_type: row.summary_type,
    voice: row.voice,
    model: row.model,
    object_key: row.object_key,
    mime_type: row.mime_type,
    byte_size: Number(row.byte_size) || 0,
    original_file_name: row.original_file_name,
    target_language: row.target_language ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Find a cached export for the given identity (path variants included).
 */
export async function findAudioExport(
  input: FindAudioExportInput,
  client: SupabaseClient,
): Promise<PersistenceResult<AudioExportRow | null>> {
  try {
    const pathVariants = uniqueStoragePathVariants(input.documentStoragePath);

    let query = client
      .from("audio_exports")
      .select("*")
      .eq("user_id", input.userId)
      .in("document_storage_path", pathVariants)
      .eq("source", input.source)
      .eq("voice", input.voice)
      .eq("target_language", input.targetLanguage);

    if (input.source === "page") {
      query = query.eq("page_number", input.pageNumber!).is("summary_type", null);
    } else {
      query = query
        .eq("summary_type", input.summaryType!)
        .is("page_number", null);
    }

    const { data, error } = await query
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message };
    }

    if (!data) {
      return { ok: true, data: null };
    }

    return { ok: true, data: mapRow(data as AudioExportRow) };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to look up audio export.",
    };
  }
}

/**
 * Insert or update an audio export metadata row.
 */
export async function upsertAudioExport(
  input: UpsertAudioExportInput,
  client: SupabaseClient,
): Promise<PersistenceResult<AudioExportRow>> {
  try {
    const documentStoragePath = normalizeStoragePath(input.documentStoragePath);
    const payload = {
      id: input.id,
      user_id: input.userId,
      document_storage_path: documentStoragePath,
      source: input.source,
      page_number: input.pageNumber,
      summary_type: input.summaryType,
      voice: input.voice,
      model: input.model,
      object_key: input.objectKey,
      mime_type: input.mimeType,
      byte_size: input.byteSize,
      original_file_name: input.originalFileName,
      target_language: input.targetLanguage,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from("audio_exports")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message || "Unable to save audio export metadata.",
      };
    }

    return { ok: true, data: mapRow(data as AudioExportRow) };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save audio export metadata.",
    };
  }
}

/**
 * List the caller's audio exports, newest first.
 */
export async function listAudioExportsForUser(
  userId: string,
  client: SupabaseClient,
  limit = 50,
): Promise<PersistenceResult<AudioExportRow[]>> {
  try {
    const { data, error } = await client
      .from("audio_exports")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 100));

    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      data: ((data ?? []) as AudioExportRow[]).map(mapRow),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to list audio exports.",
    };
  }
}

/**
 * Delete audio export rows for a document storage path (all path variants).
 */
export async function deleteAudioExportsByStoragePath(
  storagePath: string,
  userId: string,
  client: SupabaseClient,
): Promise<PersistenceResult<{ deletedCount: number; objectKeys: string[] }>> {
  try {
    const pathVariants = uniqueStoragePathVariants(storagePath);

    const { data: existing, error: selectError } = await client
      .from("audio_exports")
      .select("id, object_key")
      .eq("user_id", userId)
      .in("document_storage_path", pathVariants);

    if (selectError) {
      return { ok: false, error: selectError.message };
    }

    const rows = (existing ?? []) as Array<{ id: string; object_key: string }>;
    const objectKeys = rows.map((row) => row.object_key).filter(Boolean);
    const ids = rows.map((row) => row.id);

    if (ids.length === 0) {
      return { ok: true, data: { deletedCount: 0, objectKeys: [] } };
    }

    const { error: deleteError } = await client
      .from("audio_exports")
      .delete()
      .eq("user_id", userId)
      .in("id", ids);

    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }

    return {
      ok: true,
      data: { deletedCount: ids.length, objectKeys },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete audio export records.",
    };
  }
}
