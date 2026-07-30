/**
 * Preview a supported TTS voice with a fixed server-side sample.
 * Never accepts arbitrary client text.
 */

import { serverEnv } from "@/config";
import { requireVoiceAccess } from "@/features/billing/gate";
import {
  createOpenAiTtsProvider,
} from "@/features/tts";
import {
  isSupportedTtsVoiceId,
  TTS_VOICE_PREVIEW_TEXT,
} from "@/features/tts/voices";
import { logger } from "@/lib/logger";
import {
  apiBinary,
  apiError,
  enforceRateLimit,
  getRequestIp,
  mapDomainFailure,
  rateLimitedResponse,
  validateTtsVoiceId,
} from "@/lib/security";
import { requireUser } from "@/server/auth";

type PreviewBody = {
  voice?: unknown;
};

export async function POST(request: Request) {
  const route = "/api/documents/tts/preview";

  const auth = await requireUser();
  if (!auth.ok) {
    return apiError("UNAUTHORIZED", auth.error, auth.status);
  }

  const rate = await enforceRateLimit({
    bucket: "tts",
    userId: auth.user.id,
    ip: getRequestIp(request),
  });

  if (!rate.ok) {
    logger.warn("TTS preview rate limited", {
      route,
      userId: auth.user.id,
      limitedBy: rate.limitedBy,
    });
    return rateLimitedResponse(rate);
  }

  let body: PreviewBody;
  try {
    body = (await request.json()) as PreviewBody;
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

  try {
    const provider = createOpenAiTtsProvider(serverEnv.openAiApiKey);
    const synthesized = await provider.synthesize({
      text: TTS_VOICE_PREVIEW_TEXT,
      voice: voiceField.data,
    });

    if (!synthesized.ok) {
      logger.ttsFailure("TTS preview failed", {
        route,
        userId: auth.user.id,
        voice: voiceField.data,
      }, synthesized.error.message);
      return mapDomainFailure(synthesized.error.message, "tts");
    }

    return apiBinary(Buffer.from(synthesized.data.audio), {
      status: 200,
      headers: {
        "Content-Type": synthesized.data.mimeType,
        "Cache-Control": "no-store",
        "X-TTS-Source": "preview",
        "X-TTS-Character-Count": String(synthesized.data.characterCount),
        "X-TTS-Model": synthesized.data.model,
        "X-TTS-Voice": synthesized.data.voice,
      },
    });
  } catch (error) {
    logger.ttsFailure("TTS preview threw", {
      route,
      userId: auth.user.id,
      voice: voiceField.data,
    }, error);
    return apiError(
      "TTS_ERROR",
      "Unable to generate speech. Please try again.",
      500,
    );
  }
}
