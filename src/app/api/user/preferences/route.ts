/**
 * Get / update authenticated user settings (single preferences table).
 */

import {
  getUserPreferences,
  upsertUserPreferences,
} from "@/features/settings/preferences-service";
import { validateUserPreferencesUpdate } from "@/features/settings/validate";
import { TTS_VOICE_CATALOG } from "@/features/tts/voices";
import { logger } from "@/lib/logger";
import { apiError, apiSuccess } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) {
    return apiError("UNAUTHORIZED", auth.error, auth.status);
  }

  const client = await createClient();
  const preferences = await getUserPreferences(auth.user.id, client);

  if (!preferences.ok) {
    logger.error(
      "Failed to load user preferences",
      {
        route: "/api/user/preferences",
        userId: auth.user.id,
      },
      preferences.error,
    );
    return apiError("INTERNAL", "Unable to load settings.", 500);
  }

  return apiSuccess({
    preferences: preferences.data,
    voices: TTS_VOICE_CATALOG,
  });
}

type PutBody = Record<string, unknown>;

export async function PUT(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) {
    return apiError("UNAUTHORIZED", auth.error, auth.status);
  }

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return apiError("VALIDATION", "Invalid request body.", 400);
  }

  const validated = validateUserPreferencesUpdate(body);
  if (!validated.ok) {
    return apiError(validated.code, validated.message, 400);
  }

  const client = await createClient();
  const saved = await upsertUserPreferences(
    auth.user.id,
    validated.data,
    client,
  );

  if (!saved.ok) {
    logger.error(
      "Failed to save user preferences",
      {
        route: "/api/user/preferences",
        userId: auth.user.id,
      },
      saved.error,
    );
    return apiError("INTERNAL", "Unable to save settings.", 500);
  }

  return apiSuccess({
    preferences: saved.data,
  });
}
