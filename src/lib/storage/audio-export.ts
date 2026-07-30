/**
 * Private audio-export object helpers (upload, signed URLs, cleanup).
 * Objects live under `{userId}/exports/{exportId}.mp3` in `audio-exports`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AUDIO_EXPORT_SIGNED_URL_EXPIRES_IN,
  AUDIO_EXPORTS_BUCKET,
} from "@/constants";

/**
 * True when the object key is owned by `userId` under `/exports/`.
 */
export function isOwnedAudioExportObjectKey(
  objectKey: string,
  userId: string,
): boolean {
  if (!userId || !objectKey) {
    return false;
  }

  if (
    objectKey.includes("..") ||
    objectKey.includes("\0") ||
    objectKey.startsWith("/")
  ) {
    return false;
  }

  const prefix = `${userId}/exports/`;
  if (!objectKey.startsWith(prefix)) {
    return false;
  }

  const fileName = objectKey.slice(prefix.length);
  if (!fileName || fileName.includes("/")) {
    return false;
  }

  return fileName.toLowerCase().endsWith(".mp3");
}

export function buildAudioExportObjectKey(
  userId: string,
  exportId: string,
): string {
  return `${userId}/exports/${exportId}.mp3`;
}

export type AudioExportSignedUrlResult =
  | { ok: true; signedUrl: string; expiresIn: number }
  | { ok: false; error: string };

/**
 * Create a temporary signed download URL for an owned audio export object.
 */
export async function createAudioExportSignedUrl(
  objectKey: string,
  client: SupabaseClient,
  expiresIn = AUDIO_EXPORT_SIGNED_URL_EXPIRES_IN,
): Promise<AudioExportSignedUrlResult> {
  try {
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Authentication required." };
    }

    if (!isOwnedAudioExportObjectKey(objectKey, user.id)) {
      return {
        ok: false,
        error: "You do not have access to this audio export.",
      };
    }

    const { data, error } = await client.storage
      .from(AUDIO_EXPORTS_BUCKET)
      .createSignedUrl(objectKey, expiresIn);

    if (error || !data?.signedUrl) {
      return {
        ok: false,
        error:
          error?.message || "Unable to create a signed URL for this export.",
      };
    }

    return {
      ok: true,
      signedUrl: data.signedUrl,
      expiresIn,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create a signed URL for this export.",
    };
  }
}

export type UploadAudioExportResult =
  | { ok: true; objectKey: string; byteSize: number }
  | { ok: false; error: string };

/**
 * Upload MP3 bytes to the private audio-exports bucket (upsert).
 */
export async function uploadAudioExportObject(
  objectKey: string,
  audio: Uint8Array,
  client: SupabaseClient,
  mimeType = "audio/mpeg",
): Promise<UploadAudioExportResult> {
  try {
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Authentication required." };
    }

    if (!isOwnedAudioExportObjectKey(objectKey, user.id)) {
      return {
        ok: false,
        error: "You do not have access to this audio export path.",
      };
    }

    const { error } = await client.storage
      .from(AUDIO_EXPORTS_BUCKET)
      .upload(
        objectKey,
        Buffer.from(audio),
        {
          contentType: mimeType,
          upsert: true,
          cacheControl: "3600",
        },
      );

    if (error) {
      return {
        ok: false,
        error: error.message || "Unable to store audio export.",
      };
    }

    return {
      ok: true,
      objectKey,
      byteSize: audio.byteLength,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to store audio export.",
    };
  }
}

export type RemoveAudioExportObjectsResult =
  | { ok: true; removedCount: number }
  | { ok: false; error: string };

/**
 * Remove owned audio export objects from Storage.
 */
export async function removeAudioExportObjects(
  objectKeys: string[],
  client: SupabaseClient,
): Promise<RemoveAudioExportObjectsResult> {
  if (objectKeys.length === 0) {
    return { ok: true, removedCount: 0 };
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Authentication required." };
    }

    const owned = objectKeys.filter((key) =>
      isOwnedAudioExportObjectKey(key, user.id),
    );

    if (owned.length === 0) {
      return { ok: true, removedCount: 0 };
    }

    const { error } = await client.storage
      .from(AUDIO_EXPORTS_BUCKET)
      .remove(owned);

    if (error) {
      return {
        ok: false,
        error: error.message || "Unable to delete audio exports from storage.",
      };
    }

    return { ok: true, removedCount: owned.length };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete audio exports from storage.",
    };
  }
}
