/**
 * Get / set the signed-in user's preferred TTS voice.
 */

import {
  getPreferredTtsVoice,
  setPreferredTtsVoice,
} from "@/features/tts/resolve-preferred-voice";
import {
  isSupportedTtsVoiceId,
  TTS_VOICE_CATALOG,
} from "@/features/tts/voices";
import { requireVoiceAccess } from "@/features/billing/gate";
import {
  getEntitlement,
  hasFeatureAccess,
} from "@/features/billing/entitlements";
import { FREE_TTS_VOICE_IDS } from "@/constants";
import { logger } from "@/lib/logger";
import {
  apiError,
  apiSuccess,
  validateTtsVoiceId,
} from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) {
    return apiError("UNAUTHORIZED", auth.error, auth.status);
  }

  const client = await createClient();
  const preferred = await getPreferredTtsVoice(auth.user.id, client);

  if (!preferred.ok) {
    logger.error("Failed to load voice preference", {
      route: "/api/user/voice",
      userId: auth.user.id,
    }, preferred.error);
    return apiError(
      "INTERNAL",
      "Unable to load voice preference.",
      500,
    );
  }

  const entitlement = await getEntitlement(auth.user.id);
  const voices = hasFeatureAccess(entitlement, "premium_voices")
    ? TTS_VOICE_CATALOG
    : TTS_VOICE_CATALOG.filter((voice) =>
        (FREE_TTS_VOICE_IDS as readonly string[]).includes(voice.id),
      );

  return apiSuccess({
    voice: preferred.data,
    voices,
    planId: entitlement.planId,
  });
}

type PutBody = {
  voice?: unknown;
};

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

  const voiceField = validateTtsVoiceId(body.voice);
  if (!voiceField.ok) {
    return apiError(voiceField.code, voiceField.message, 400);
  }

  if (!isSupportedTtsVoiceId(voiceField.data)) {
    return apiError("VALIDATION", "Unsupported voice.", 400);
  }

  const voiceGate = await requireVoiceAccess(auth.user.id, voiceField.data);
  if (!voiceGate.ok) {
    return voiceGate.response;
  }

  const client = await createClient();
  const saved = await setPreferredTtsVoice(
    auth.user.id,
    voiceField.data,
    client,
  );

  if (!saved.ok) {
    logger.error("Failed to save voice preference", {
      route: "/api/user/voice",
      userId: auth.user.id,
      voice: voiceField.data,
    }, saved.error);
    return apiError(
      "INTERNAL",
      "Unable to save voice preference.",
      500,
    );
  }

  return apiSuccess({
    voice: saved.data,
  });
}
