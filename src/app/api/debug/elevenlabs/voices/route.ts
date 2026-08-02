export const runtime = "nodejs";

type ElevenLabsVoice = {
  name?: unknown;
  voice_id?: unknown;
  category?: unknown;
  labels?: unknown;
  available_for_tiers?: unknown;
  sharing?: unknown;
  preview_url?: unknown;
};

export async function GET() {
  const apiKey = process.env.ELEVENLABS_KEY_1?.trim();
  if (!apiKey) {
    return Response.json(
      { ok: false as const, error: "ELEVENLABS_KEY_1 is not set." },
      { status: 500 },
    );
  }

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as {
      voices?: ElevenLabsVoice[];
      detail?: unknown;
    } | null;

    if (!response.ok) {
      return Response.json(
        {
          ok: false as const,
          error: "ElevenLabs voices request failed.",
          status: response.status,
          detail: payload?.detail ?? payload,
        },
        { status: response.status },
      );
    }

    const voices = (payload?.voices ?? []).map((voice) => ({
      name: voice.name ?? null,
      voice_id: voice.voice_id ?? null,
      category: voice.category ?? null,
      labels: voice.labels ?? null,
      available_for_tiers: voice.available_for_tiers ?? null,
      sharing: voice.sharing ?? null,
      preview_url: voice.preview_url ?? null,
    }));

    return Response.json({ ok: true as const, voices });
  } catch (cause) {
    return Response.json(
      {
        ok: false as const,
        error:
          cause instanceof Error
            ? cause.message
            : "Unable to fetch ElevenLabs voices.",
      },
      { status: 500 },
    );
  }
}
