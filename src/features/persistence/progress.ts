/**
 * Per-user listening / reading progress (Supabase `document_listening_progress`).
 * Uses the authenticated user client only — never the service role.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

import { normalizeStoragePath, uniqueStoragePathVariants } from "./storage-path";
import type {
  DocumentListeningProgressRow,
  PersistenceResult,
  UpsertListeningProgressInput,
} from "./types";

function resolveClient(client?: SupabaseClient) {
  return client ?? createClient();
}

function clampScrollRatio(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function clampPlaybackSeconds(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

function toUpsertRow(
  input: UpsertListeningProgressInput,
): Record<string, unknown> {
  return {
    user_id: input.userId,
    storage_path: normalizeStoragePath(input.storagePath),
    document_id: input.documentId ?? null,
    page_number: Math.max(1, Math.floor(input.pageNumber) || 1),
    page_count:
      typeof input.pageCount === "number" && input.pageCount >= 1
        ? Math.floor(input.pageCount)
        : null,
    scroll_ratio: clampScrollRatio(input.scrollRatio),
    playback_seconds: clampPlaybackSeconds(input.playbackSeconds),
    playback_source: input.playbackSource ?? null,
    last_opened_at: input.lastOpenedAt ?? new Date().toISOString(),
  };
}

/**
 * Fetch progress for one storage path owned by the signed-in user.
 */
export async function getListeningProgressByStoragePath(
  storagePath: string,
  userId: string,
  client?: SupabaseClient,
): Promise<PersistenceResult<DocumentListeningProgressRow | null>> {
  try {
    const supabase = resolveClient(client);
    const paths = uniqueStoragePathVariants(storagePath);

    const { data, error } = await supabase
      .from("document_listening_progress")
      .select("*")
      .eq("user_id", userId)
      .in("storage_path", paths)
      .order("last_opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      data: (data as DocumentListeningProgressRow | null) ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load listening progress.",
    };
  }
}

/**
 * List all listening progress rows for the signed-in user (newest first).
 */
export async function listListeningProgressForUser(
  userId: string,
  client?: SupabaseClient,
): Promise<PersistenceResult<DocumentListeningProgressRow[]>> {
  try {
    const supabase = resolveClient(client);
    const { data, error } = await supabase
      .from("document_listening_progress")
      .select("*")
      .eq("user_id", userId)
      .order("last_opened_at", { ascending: false });

    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      data: (data as DocumentListeningProgressRow[]) ?? [],
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to list listening progress.",
    };
  }
}

/**
 * Upsert progress for the signed-in user + storage path.
 */
export async function upsertListeningProgress(
  input: UpsertListeningProgressInput,
  client?: SupabaseClient,
): Promise<PersistenceResult<DocumentListeningProgressRow>> {
  try {
    const supabase = resolveClient(client);
    const row = toUpsertRow(input);

    const { data, error } = await supabase
      .from("document_listening_progress")
      .upsert(row, { onConflict: "user_id,storage_path" })
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: data as DocumentListeningProgressRow };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save listening progress.",
    };
  }
}

/**
 * Delete progress rows for this user + storage path (all path variants).
 */
export async function deleteListeningProgressByStoragePath(
  storagePath: string,
  userId: string,
  client?: SupabaseClient,
): Promise<PersistenceResult<{ deletedCount: number }>> {
  try {
    const supabase = resolveClient(client);
    const paths = uniqueStoragePathVariants(storagePath);

    const { data, error } = await supabase
      .from("document_listening_progress")
      .delete()
      .eq("user_id", userId)
      .in("storage_path", paths)
      .select("id");

    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      data: { deletedCount: data?.length ?? 0 },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete listening progress.",
    };
  }
}

/**
 * Progress percent from page position (1-based page over page count).
 */
export function listeningProgressPercent(
  pageNumber: number,
  pageCount: number | null | undefined,
): number | null {
  if (!pageCount || pageCount < 1 || pageNumber < 1) {
    return null;
  }
  return Math.min(100, Math.round((pageNumber / pageCount) * 100));
}
