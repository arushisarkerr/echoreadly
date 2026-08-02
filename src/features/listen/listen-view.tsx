"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  IconListen,
  IconPause,
  IconPlay,
  IconStop,
} from "@/components/icons/dashboard-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress";
import { SelectField } from "@/components/ui/dropdown";
import { ROUTES } from "@/constants";
import {
  TRANSLATION_LANGUAGES,
  TTS_VOICES,
  labelForLanguageCode,
} from "@/constants/languages";
import { getImportOwnerId } from "@/features/import/utils/pdf-upload-store";
import { cn } from "@/utils";

const SPEED_OPTIONS = [
  { value: "0.75", label: "0.75×" },
  { value: "1", label: "1.0×" },
  { value: "1.25", label: "1.25×" },
  { value: "1.5", label: "1.5×" },
  { value: "2", label: "2.0×" },
];

type TranslationItem = {
  id: string;
  languageCode: string;
  languageLabel: string;
  text: string;
  status: string;
};

type AudioItem = {
  id: string;
  languageCode: string;
  voice: string;
  status: string;
  url?: string | null;
};

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function isReadyTranslation(item: TranslationItem): boolean {
  return item.status === "ready" && Boolean(item.text.trim());
}

/**
 * Listening player — existing translation → TTS → cached audio → playback.
 * Cache key: documentId + language + voice. Never regenerates cached audio.
 */
export function ListenView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const documentId = searchParams.get("id")?.trim() ?? "";
  const languageFromQuery = searchParams.get("language")?.trim() ?? "";
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [title, setTitle] = useState("No track selected");
  const [originalLanguageCode, setOriginalLanguageCode] = useState("auto");
  const [hasOriginalText, setHasOriginalText] = useState(false);
  const [translations, setTranslations] = useState<TranslationItem[]>([]);
  const [audioCache, setAudioCache] = useState<AudioItem[]>([]);
  const [language, setLanguage] = useState("original");
  const [voice, setVoice] = useState<string>(TTS_VOICES[0]);
  const [speed, setSpeed] = useState("1");
  const [generating, setGenerating] = useState(false);
  const [generateFailed, setGenerateFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(Boolean(documentId));

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadedDocumentId, setLoadedDocumentId] = useState(documentId);

  // Reset listen state when the route document id changes (render-time sync).
  if (documentId !== loadedDocumentId) {
    setLoadedDocumentId(documentId);
    setTitle(documentId ? "Loading…" : "No track selected");
    setOriginalLanguageCode("auto");
    setHasOriginalText(false);
    setTranslations([]);
    setAudioCache([]);
    setLanguage("original");
    setError(null);
    setGenerateFailed(false);
    setGenerating(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoadingMeta(Boolean(documentId));
  }

  const isOriginal = language === "original";
  const selectedTranslation = useMemo(() => {
    if (!language || isOriginal) {
      return null;
    }
    return (
      translations.find(
        (item) => item.languageCode === language && isReadyTranslation(item),
      ) ?? null
    );
  }, [isOriginal, language, translations]);

  const canListen =
    Boolean(documentId) &&
    (isOriginal ? hasOriginalText : Boolean(selectedTranslation));

  // Instant cache hit: Document + Language + Voice (never regenerate when present).
  const cachedAudio = useMemo(() => {
    if (!canListen) {
      return null;
    }
    return (
      audioCache.find(
        (item) =>
          item.languageCode === language &&
          item.voice === voice &&
          item.status === "ready" &&
          Boolean(item.url),
      ) ?? null
    );
  }, [audioCache, canListen, language, voice]);

  const audioUrl = cachedAudio?.url ?? null;
  const audioReady = Boolean(audioUrl);
  const translationRequired =
    Boolean(documentId) && !isOriginal && !selectedTranslation;

  const progressPercent =
    duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

  const originalOptionLabel = useMemo(() => {
    if (!originalLanguageCode || originalLanguageCode === "auto") {
      return "Original";
    }
    return `${labelForLanguageCode(originalLanguageCode)} (Original)`;
  }, [originalLanguageCode]);

  const languageLabel = isOriginal
    ? originalOptionLabel
    : labelForLanguageCode(language);

  const languageOptions = useMemo(
    () => [
      { value: "original", label: originalOptionLabel },
      ...TRANSLATION_LANGUAGES.map((item) => {
        const ready = translations.some(
          (row) => row.languageCode === item.code && isReadyTranslation(row),
        );
        return {
          value: item.code,
          label: ready ? `${item.label} ✓ Ready` : item.label,
        };
      }),
    ],
    [originalOptionLabel, translations],
  );

  useEffect(() => {
    if (!documentId) {
      return;
    }

    let cancelled = false;
    async function loadMeta() {
      setLoadingMeta(true);
      setError(null);
      setGenerateFailed(false);
      const ownerId = getImportOwnerId();
      try {
        const [docResponse, translationResponse, audioResponse] =
          await Promise.all([
            fetch(
              `/api/library/documents/${encodeURIComponent(documentId)}?ownerId=${encodeURIComponent(ownerId)}`,
            ),
            fetch(
              `/api/documents/translate?ownerId=${encodeURIComponent(ownerId)}&documentId=${encodeURIComponent(documentId)}`,
            ),
            fetch(
              `/api/documents/tts?ownerId=${encodeURIComponent(ownerId)}&documentId=${encodeURIComponent(documentId)}`,
            ),
          ]);

        const docPayload = (await docResponse.json()) as {
          ok?: boolean;
          document?: {
            filename?: string;
            originalLanguage?: string | null;
            extractedText?: string | null;
          };
          error?: string;
        };
        const translationPayload = (await translationResponse.json()) as {
          ok?: boolean;
          translations?: TranslationItem[];
        };
        const audioPayload = (await audioResponse.json()) as {
          ok?: boolean;
          audio?: AudioItem[];
        };

        if (cancelled) {
          return;
        }

        if (!docResponse.ok || !docPayload.ok) {
          throw new Error(docPayload.error || "Unable to load document.");
        }

        const nextTranslations = translationPayload.translations ?? [];
        const nextAudio = (audioPayload.audio ?? []).filter(
          (item) => item.status === "ready" && Boolean(item.url),
        );
        const detected =
          docPayload.document?.originalLanguage?.trim() || "auto";
        const originalTextReady = Boolean(
          docPayload.document?.extractedText?.trim(),
        );

        setTitle(docPayload.document?.filename || "Untitled document");
        setOriginalLanguageCode(detected);
        setHasOriginalText(originalTextReady);
        setTranslations(nextTranslations);
        setAudioCache(nextAudio);

        // Reader language (?language=) → first ready translation → Original.
        const ready = nextTranslations.filter(isReadyTranslation);
        const query = languageFromQuery;
        if (
          query === "original" ||
          ready.some((item) => item.languageCode === query)
        ) {
          setLanguage(query);
        } else if (ready[0]) {
          setLanguage(ready[0].languageCode);
        } else {
          setLanguage("original");
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load listening data.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingMeta(false);
        }
      }
    }

    void loadMeta();
    return () => {
      cancelled = true;
    };
  }, [documentId, languageFromQuery]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.playbackRate = Number(speed) || 1;
  }, [speed, audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    function onTime() {
      if (!audio) {
        return;
      }
      setCurrentTime(audio.currentTime || 0);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    }
    function onLoaded() {
      if (!audio) {
        return;
      }
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    }
    function onEnded() {
      setPlaying(false);
      if (audio) {
        setCurrentTime(audio.duration || 0);
      }
    }

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audioUrl]);

  async function refreshAudioCache(): Promise<AudioItem[]> {
    if (!documentId) {
      return [];
    }
    const response = await fetch(
      `/api/documents/tts?ownerId=${encodeURIComponent(getImportOwnerId())}&documentId=${encodeURIComponent(documentId)}`,
    );
    const payload = (await response.json()) as {
      ok?: boolean;
      audio?: AudioItem[];
    };
    const list = (payload.audio ?? []).filter(
      (item) => item.status === "ready" && Boolean(item.url),
    );
    setAudioCache(list);
    return list;
  }

  async function generateAudio(options?: { autoPlay?: boolean }) {
    if (!documentId || !canListen) {
      setError(
        isOriginal
          ? "No original text available for listening."
          : "Translation required before listening.",
      );
      return;
    }

    // Never regenerate when this Document + Language + Voice is cached.
    if (audioUrl) {
      setError(null);
      setGenerateFailed(false);
      if (options?.autoPlay) {
        requestAnimationFrame(() => {
          void audioRef.current?.play().then(() => setPlaying(true));
        });
      }
      return;
    }

    setGenerating(true);
    setGenerateFailed(false);
    setError(null);
    // Snapshot cache so a failed generate never wipes existing entries.
    const cacheSnapshot = audioCache;
    try {
      const response = await fetch("/api/documents/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: getImportOwnerId(),
          documentId,
          // original | translated code — API uses stored text only (no re-translate).
          languageCode: language,
          voice,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        audio?: AudioItem & { url?: string };
      };
      if (!response.ok || !payload.ok || !payload.audio?.url) {
        throw new Error(payload.error || "Unable to generate audio.");
      }

      const list = await refreshAudioCache();
      const ready = list.find(
        (item) =>
          item.languageCode === language &&
          item.voice === voice &&
          item.status === "ready" &&
          item.url,
      );

      if (!ready && payload.audio.url) {
        setAudioCache((current) => {
          const without = current.filter(
            (item) =>
              !(item.languageCode === language && item.voice === voice),
          );
          return [
            ...without,
            {
              id: payload.audio!.id,
              languageCode: language,
              voice,
              status: "ready",
              url: payload.audio!.url,
            },
          ];
        });
      }

      if (options?.autoPlay) {
        requestAnimationFrame(() => {
          void audioRef.current?.play().then(() => setPlaying(true));
        });
      }
    } catch (cause) {
      // Keep any previously cached audio playable (other voices/languages).
      setAudioCache(cacheSnapshot);
      setGenerateFailed(true);
      setError(
        cause instanceof Error ? cause.message : "Unable to generate audio.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleTranslate() {
    if (!documentId || isOriginal) {
      return;
    }
    setTranslating(true);
    setError(null);
    try {
      const response = await fetch("/api/documents/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: getImportOwnerId(),
          documentId,
          languageCode: language,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        translation?: TranslationItem;
      };
      if (!response.ok || !payload.ok || !payload.translation) {
        throw new Error(payload.error || "Translation failed.");
      }
      setTranslations((current) => {
        const without = current.filter(
          (item) => item.languageCode !== payload.translation!.languageCode,
        );
        return [...without, payload.translation!];
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Translation failed.",
      );
    } finally {
      setTranslating(false);
    }
  }

  function resetPlaybackClock() {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }

  function togglePlay() {
    if (translationRequired) {
      setError("Translation required before listening.");
      return;
    }
    if (!canListen) {
      setError("No text available for listening.");
      return;
    }
    if (!audioUrl) {
      void generateAudio({ autoPlay: true });
      return;
    }
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    void audio.play().then(() => setPlaying(true));
  }

  function pause() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.pause();
    setPlaying(false);
  }

  function stop() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
    setCurrentTime(0);
  }

  function seekToPercent(percent: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }
    const next = (Math.min(100, Math.max(0, percent)) / 100) * audio.duration;
    audio.currentTime = next;
    setCurrentTime(next);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Listen"
        description="Play natural speech from an existing translation."
        breadcrumbs={[
          { label: "Home", href: ROUTES.dashboard },
          { label: "Listen" },
        ]}
      />

      <audio ref={audioRef} src={audioUrl ?? undefined} preload="metadata" />

      <Card className="overflow-hidden">
        <div className="border-b border-border/70 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--accent)_16%,transparent),_transparent_60%)] px-5 py-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">Listening</Badge>
            {audioReady ? (
              <Badge tone="success">✓ Audio Ready</Badge>
            ) : generating ? (
              <Badge>Generating audio...</Badge>
            ) : null}
          </div>
          <h2 className="font-display mt-3 text-2xl font-semibold text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {documentId
              ? isOriginal
                ? "Playing original document text → TTS → audio. Cache key: document + language + voice."
                : `Uses stored ${languageLabel} translation → TTS → audio. Never translates again.`
              : "Open a document from the Library or Reader to listen."}
          </p>
        </div>

        <div className="space-y-5 px-5 py-6 sm:px-6">
          {!documentId ? (
            <EmptyState
              icon={<IconListen />}
              title="No document selected"
              description="Pick a document from your library to start listening."
              className="py-10"
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(ROUTES.library)}
                >
                  Choose document
                </Button>
              }
            />
          ) : loadingMeta ? (
            <EmptyState
              icon={<IconListen />}
              title="Loading"
              description="Fetching translations and cached audio."
              className="py-10"
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <SelectField
                  label="Language"
                  value={language}
                  onChange={(value) => {
                    setLanguage(value);
                    setError(null);
                    setGenerateFailed(false);
                    resetPlaybackClock();
                  }}
                  options={languageOptions}
                />
                <SelectField
                  label="Voice"
                  value={voice}
                  onChange={(value) => {
                    // Regenerates only when this exact voice is not cached.
                    setVoice(value);
                    setError(null);
                    setGenerateFailed(false);
                    resetPlaybackClock();
                  }}
                  options={TTS_VOICES.map((item) => {
                    const cached = audioCache.some(
                      (row) =>
                        row.languageCode === language &&
                        row.voice === item &&
                        row.status === "ready" &&
                        Boolean(row.url),
                    );
                    return {
                      value: item,
                      label: cached
                        ? `${item[0].toUpperCase()}${item.slice(1)} ✓ Ready`
                        : item[0].toUpperCase() + item.slice(1),
                    };
                  })}
                />
                <SelectField
                  label="Speed"
                  value={speed}
                  onChange={setSpeed}
                  options={SPEED_OPTIONS}
                />
              </div>

              {translationRequired ? (
                <EmptyState
                  icon={<IconListen />}
                  title="Translation required before listening."
                  description="Listening uses stored translated text only. Translate this language first — TTS will not translate."
                  className="py-8"
                  action={
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={translating}
                        onClick={() => {
                          void handleTranslate();
                        }}
                      >
                        {translating ? "Translating..." : "Translate"}
                      </Button>
                      <Link
                        href={`${ROUTES.reader}?id=${encodeURIComponent(documentId)}`}
                      >
                        <Button variant="outline" size="sm">
                          Open Reader
                        </Button>
                      </Link>
                    </div>
                  }
                />
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-xs text-muted">
                      <span>Progress</span>
                      <span className="tabular-nums">
                        {formatClock(currentTime)} / {formatClock(duration)}
                      </span>
                    </div>
                    <ProgressBar value={progressPercent} />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={progressPercent}
                      disabled={!audioUrl || duration <= 0}
                      aria-label="Seek"
                      className="h-1.5 w-full cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed"
                      onChange={(event) => {
                        seekToPercent(Number(event.target.value));
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="icon"
                      aria-label={playing ? "Pause" : "Play"}
                      disabled={generating || !canListen}
                      onClick={togglePlay}
                    >
                      {playing ? <IconPause /> : <IconPlay />}
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label="Pause"
                      disabled={!audioUrl || !playing}
                      onClick={pause}
                    >
                      <IconPause />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label="Stop"
                      disabled={!audioUrl}
                      onClick={stop}
                    >
                      <IconStop />
                    </Button>

                    {audioReady ? (
                      <Button variant="outline" size="sm" disabled>
                        ✓ Audio Ready
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={generating || !canListen}
                        onClick={() => {
                          void generateAudio();
                        }}
                      >
                        {generating ? "Generating audio..." : "Generate audio"}
                      </Button>
                    )}

                    {audioUrl ? (
                      <a
                        href={audioUrl}
                        download={`${title || "audio"}-${language}-${voice}.mp3`}
                        className={cn(
                          "inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted",
                        )}
                      >
                        Download MP3
                      </a>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        Download MP3
                      </Button>
                    )}
                  </div>

                  {audioReady ? (
                    <p className="text-xs font-medium text-success">
                      ✓ Audio Ready
                    </p>
                  ) : canListen ? (
                    <p className="text-xs text-muted">
                      No cached audio for this voice yet. Generate once, then
                      reuse for this document + language + voice.
                    </p>
                  ) : null}
                </>
              )}

              {error || generateFailed ? (
                <div className="flex flex-wrap items-center gap-3" role="alert">
                  <p className="text-sm text-danger">
                    {generateFailed
                      ? "Unable to generate audio."
                      : error}
                  </p>
                  {generateFailed ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={generating}
                      onClick={() => {
                        void generateAudio();
                      }}
                    >
                      Retry
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Queue" description="Up next while you listen." />
          <EmptyState
            icon={<IconListen />}
            title="Queue is empty"
            description="Queued chapters and documents will show here."
            className="py-10"
          />
        </Card>
        <Card>
          <CardHeader title="Playlist" description="Saved listening sets." />
          <EmptyState
            title="No playlists yet"
            description="Create playlists later to group related listens."
            className="py-10"
          />
        </Card>
      </div>
    </div>
  );
}
