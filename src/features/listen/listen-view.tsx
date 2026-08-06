"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  IconListen,
  IconPause,
  IconPlay,
  IconStar,
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
  labelForLanguageCode,
} from "@/constants/languages";
import { getImportOwnerId } from "@/features/import/utils/pdf-upload-store";
import {
  buildAudioDownloadFilename,
  downloadAudioFromUrl,
} from "@/features/listen/download-audio";
import {
  GEMINI_TTS_VOICES,
  orderVoicesWithPins,
  readPinnedVoices,
  storePinnedVoices,
  togglePinnedVoice,
} from "@/features/listen/gemini-voices";
import {
  STYLE_PRESETS,
  readStoredStyleCustomText,
  readStoredStylePresetId,
  resolveStyleInstruction,
  storeStyleCustomText,
  storeStylePresetId,
  type StylePresetId,
} from "@/features/listen/style-presets";
import { cn } from "@/utils";

const SPEED_OPTIONS = [
  { value: "0.75", label: "0.75×" },
  { value: "1", label: "1.0×" },
  { value: "1.25", label: "1.25×" },
  { value: "1.5", label: "1.5×" },
  { value: "2", label: "2.0×" },
];

/** Matches TTS API paste limit (8 × 4000 chunk cap). */
const MAX_PASTE_CHARS = 32_000;

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

function estimateAudioDurationLabel(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) {
    return "Estimated audio duration: —";
  }
  // ~150 words/minute speaking rate.
  const totalSeconds = Math.max(1, Math.round((words / 150) * 60));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `Estimated audio duration: ~${seconds}s`;
  }
  return `Estimated audio duration: ~${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

/** Pause and rewind without clearing src (keeps React-bound URL in sync). */
function pauseHtmlAudio(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }
  audio.pause();
  try {
    audio.currentTime = 0;
  } catch {
    // ignore if not seekable yet
  }
}

/** Stop playback and fully reset an HTMLAudioElement (prevents orphan audio). */
function haltHtmlAudio(audio: HTMLAudioElement | null) {
  pauseHtmlAudio(audio);
  if (!audio) {
    return;
  }
  audio.removeAttribute("src");
  audio.load();
}

/**
 * Listening player — existing translation → TTS → cached audio → playback.
 * Cache key: documentId + language + voice. Never regenerates cached audio.
 * Paste Text uses the same TTS API with rawText (no Library document).
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
  const [originalText, setOriginalText] = useState("");
  const [translations, setTranslations] = useState<TranslationItem[]>([]);
  const [audioCache, setAudioCache] = useState<AudioItem[]>([]);
  const [language, setLanguage] = useState("original");
  const [voice, setVoice] = useState<string>(GEMINI_TTS_VOICES[0]);
  const [speed, setSpeed] = useState("1");
  const [generating, setGenerating] = useState(false);
  const [generateFailed, setGenerateFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(Boolean(documentId));
  const [downloading, setDownloading] = useState(false);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadedDocumentId, setLoadedDocumentId] = useState(documentId);

  const pasteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pasteTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [pasteVoice, setPasteVoice] = useState<string>(GEMINI_TTS_VOICES[0]);
  const [pasteSpeed, setPasteSpeed] = useState("1");
  const [pasteGenerating, setPasteGenerating] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteAudioUrl, setPasteAudioUrl] = useState<string | null>(null);
  const [pastePlaying, setPastePlaying] = useState(false);
  const [pasteDownloading, setPasteDownloading] = useState(false);

  const [pinnedVoices, setPinnedVoices] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : readPinnedVoices(),
  );
  // Stable SSR defaults — load localStorage only after mount (hydration-safe).
  const [stylePresetId, setStylePresetId] =
    useState<StylePresetId>("warm_friendly");
  const [styleCustomText, setStyleCustomText] = useState("");
  const [styleHydrated, setStyleHydrated] = useState(false);

  // Reset listen state when the route document id changes (render-time sync).
  if (documentId !== loadedDocumentId) {
    setLoadedDocumentId(documentId);
    setTitle(documentId ? "Loading…" : "No track selected");
    setOriginalLanguageCode("auto");
    setHasOriginalText(false);
    setOriginalText("");
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

  useEffect(() => {
    storePinnedVoices(pinnedVoices);
  }, [pinnedVoices]);

  useEffect(() => {
    // Restore persisted style only after mount so SSR HTML matches the first client paint.
    const preset = readStoredStylePresetId();
    const custom = readStoredStyleCustomText();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe localStorage restore
    setStylePresetId(preset);
    setStyleCustomText(custom);
    setStyleHydrated(true);
  }, []);

  useEffect(() => {
    if (!styleHydrated) {
      return;
    }
    storeStylePresetId(stylePresetId);
  }, [styleHydrated, stylePresetId]);

  useEffect(() => {
    if (!styleHydrated) {
      return;
    }
    storeStyleCustomText(styleCustomText);
  }, [styleHydrated, styleCustomText]);

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

  const orderedVoices = useMemo(
    () => orderVoicesWithPins(pinnedVoices),
    [pinnedVoices],
  );

  const styleInstruction = useMemo(
    () => resolveStyleInstruction(stylePresetId, styleCustomText),
    [styleCustomText, stylePresetId],
  );

  // Style changes must allow regenerate (cached audio has no style key in UI).
  const styleKey = `${stylePresetId}\0${styleCustomText}`;
  const previousStyleKeyRef = useRef(styleKey);
  useEffect(() => {
    if (previousStyleKeyRef.current === styleKey) {
      return;
    }
    previousStyleKeyRef.current = styleKey;
    // Stop any in-flight playback before clearing cached document audio.
    haltHtmlAudio(audioRef.current);
    // Paste URL stays bound — only pause/rewind so React src stays in sync.
    pauseHtmlAudio(pasteAudioRef.current);
    setPlaying(false);
    setPastePlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioCache((current) =>
      current.filter(
        (item) => !(item.languageCode === language && item.voice === voice),
      ),
    );
    // Keep paste player URL until Generate replaces it (avoids hidden player + orphan audio).
    setGenerateFailed(false);
  }, [language, styleKey, voice]);

  const documentSourceText = useMemo(() => {
    if (isOriginal) {
      return originalText;
    }
    return selectedTranslation?.text ?? originalText;
  }, [isOriginal, originalText, selectedTranslation]);

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
        const extracted = docPayload.document?.extractedText?.trim() || "";
        const originalTextReady = Boolean(extracted);

        setTitle(docPayload.document?.filename || "Untitled document");
        setOriginalLanguageCode(detected);
        setHasOriginalText(originalTextReady);
        setOriginalText(extracted);
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

  // If the bound URL is cleared while an element still has buffered media, force halt.
  useEffect(() => {
    if (audioUrl || generating) {
      return;
    }
    haltHtmlAudio(audioRef.current);
  }, [audioUrl, generating]);

  useEffect(() => {
    if (pasteAudioUrl || pasteGenerating) {
      return;
    }
    haltHtmlAudio(pasteAudioRef.current);
  }, [pasteAudioUrl, pasteGenerating]);

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

  useEffect(() => {
    const audio = pasteAudioRef.current;
    if (!audio) {
      return;
    }
    audio.playbackRate = Number(pasteSpeed) || 1;
  }, [pasteSpeed, pasteAudioUrl]);

  useEffect(() => {
    const el = pasteTextareaRef.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 480)}px`;
  }, [pasteText]);

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

    // Stop any in-flight playback before (re)generation.
    pauseHtmlAudio(audioRef.current);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
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
          prompt: styleInstruction || undefined,
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

  function toggleVoicePin(targetVoice: string) {
    setPinnedVoices((current) => togglePinnedVoice(targetVoice, current));
  }

  async function handleDocumentDownload() {
    if (!audioUrl) {
      return;
    }
    setDownloading(true);
    setError(null);
    try {
      await downloadAudioFromUrl(
        audioUrl,
        buildAudioDownloadFilename(documentSourceText, "mp3"),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to download audio.",
      );
    } finally {
      setDownloading(false);
    }
  }

  async function handlePasteDownload() {
    if (!pasteAudioUrl) {
      return;
    }
    setPasteDownloading(true);
    setPasteError(null);
    try {
      await downloadAudioFromUrl(
        pasteAudioUrl,
        buildAudioDownloadFilename(pasteText, "mp3"),
      );
    } catch (cause) {
      setPasteError(
        cause instanceof Error ? cause.message : "Unable to download audio.",
      );
    } finally {
      setPasteDownloading(false);
    }
  }

  async function generatePasteAudio() {
    const text = pasteText;
    if (!text.trim()) {
      setPasteError("Paste or write text before generating audio.");
      return;
    }
    if (text.length > MAX_PASTE_CHARS) {
      setPasteError(
        `Text is too long (${text.length.toLocaleString()} characters). Maximum is ${MAX_PASTE_CHARS.toLocaleString()}.`,
      );
      return;
    }

    // Stop playback immediately; keep existing URL until the new audio is ready
    // so the player never disappears while audio could still be playing.
    pauseHtmlAudio(pasteAudioRef.current);
    setPastePlaying(false);
    setPasteGenerating(true);
    setPasteError(null);
    try {
      const response = await fetch("/api/documents/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: getImportOwnerId(),
          rawText: text,
          voice: pasteVoice,
          speed: Number(pasteSpeed) || 1,
          format: "mp3",
          prompt: styleInstruction || undefined,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        audio?: { url?: string };
      };
      if (!response.ok || !payload.ok || !payload.audio?.url) {
        throw new Error(payload.error || "Unable to generate audio.");
      }
      // Full reset then bind the newly generated audio.
      haltHtmlAudio(pasteAudioRef.current);
      setPasteAudioUrl(payload.audio.url);
    } catch (cause) {
      // Keep previous URL on failure so the player stays bound and visible.
      setPasteError(
        cause instanceof Error ? cause.message : "Unable to generate audio.",
      );
    } finally {
      setPasteGenerating(false);
    }
  }

  function togglePastePlay() {
    if (!pasteAudioUrl) {
      void generatePasteAudio();
      return;
    }
    const audio = pasteAudioRef.current;
    if (!audio) {
      return;
    }
    if (pastePlaying) {
      audio.pause();
      setPastePlaying(false);
      return;
    }
    void audio.play().then(() => setPastePlaying(true));
  }

  const pasteCharCount = pasteText.length;
  const pasteDurationLabel = estimateAudioDurationLabel(pasteText);

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
                    haltHtmlAudio(audioRef.current);
                    resetPlaybackClock();
                  }}
                  options={languageOptions}
                />
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Voice
                    </span>
                    <button
                      type="button"
                      aria-label={
                        pinnedVoices.includes(voice)
                          ? "Unpin voice"
                          : "Pin voice"
                      }
                      className="inline-flex size-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-muted"
                      onClick={() => toggleVoicePin(voice)}
                    >
                      <IconStar
                        className={cn(
                          "size-4",
                          pinnedVoices.includes(voice)
                            ? "fill-[var(--accent)] text-[var(--accent)]"
                            : "text-muted",
                        )}
                      />
                    </button>
                  </div>
                  <select
                    value={voice}
                    onChange={(event) => {
                      setVoice(event.target.value);
                      setError(null);
                      setGenerateFailed(false);
                      haltHtmlAudio(audioRef.current);
                      resetPlaybackClock();
                    }}
                    className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {orderedVoices.map((item) => {
                      const cached = audioCache.some(
                        (row) =>
                          row.languageCode === language &&
                          row.voice === item &&
                          row.status === "ready" &&
                          Boolean(row.url),
                      );
                      const pinned = pinnedVoices.includes(item);
                      const label = cached
                        ? `${item}${pinned ? " ★" : ""} ✓ Ready`
                        : `${item}${pinned ? " ★" : ""}`;
                      return (
                        <option key={item} value={item}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <SelectField
                  label="Speed"
                  value={speed}
                  onChange={setSpeed}
                  options={SPEED_OPTIONS}
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <SelectField
                  label="Style"
                  value={stylePresetId}
                  onChange={(value) => {
                    setStylePresetId(value as StylePresetId);
                  }}
                  options={[
                    ...STYLE_PRESETS.map((item) => ({
                      value: item.id,
                      label: item.label,
                    })),
                    { value: "custom", label: "Custom..." },
                  ]}
                />
                <p className="text-xs text-muted">
                  Style instructions influence delivery, pacing, and tone. They
                  do not change the text content.
                </p>
                {stylePresetId === "custom" ? (
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-foreground">
                      Custom style instruction
                    </span>
                    <textarea
                      value={styleCustomText}
                      onChange={(event) => {
                        setStyleCustomText(event.target.value);
                      }}
                      rows={3}
                      placeholder="Example: Read like a professional news anchor with calm, confident delivery"
                      className="min-h-[5rem] w-full resize-y rounded-xl border border-border bg-surface px-3 py-3 text-sm text-foreground outline-none transition-[box-shadow,border-color] placeholder:text-muted focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]"
                    />
                  </label>
                ) : (
                  <p className="text-xs text-muted">{styleInstruction}</p>
                )}
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
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={downloading}
                        onClick={() => {
                          void handleDocumentDownload();
                        }}
                      >
                        {downloading ? "Downloading..." : "Download MP3"}
                      </Button>
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

      <div className="flex items-center gap-3 py-1" aria-hidden>
        <div className="h-px flex-1 bg-border/70" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          OR
        </span>
        <div className="h-px flex-1 bg-border/70" />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border/70 px-5 py-5 sm:px-6">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Paste Text
          </h2>
          <p className="mt-1 text-sm text-muted">
            Paste or write text and generate audio with the same Piper pipeline.
            Nothing is added to your Library.
          </p>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <audio
            ref={pasteAudioRef}
            src={pasteAudioUrl ?? undefined}
            preload="metadata"
            onEnded={() => setPastePlaying(false)}
            onPause={() => setPastePlaying(false)}
            onPlay={() => setPastePlaying(true)}
          />

          <label className="block space-y-2">
            <span className="sr-only">Paste text</span>
            <textarea
              ref={pasteTextareaRef}
              value={pasteText}
              onChange={(event) => {
                setPasteText(event.target.value);
                setPasteError(null);
                haltHtmlAudio(pasteAudioRef.current);
                setPasteAudioUrl(null);
                setPastePlaying(false);
              }}
              placeholder="Paste or write your text here..."
              rows={6}
              className="min-h-[9rem] w-full resize-none overflow-hidden rounded-xl border border-border bg-surface px-3 py-3 text-sm text-foreground outline-none transition-[box-shadow,border-color] placeholder:text-muted focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>
              Characters: {pasteCharCount.toLocaleString()}
              {pasteCharCount > MAX_PASTE_CHARS ? (
                <span className="text-danger">
                  {" "}
                  (max {MAX_PASTE_CHARS.toLocaleString()})
                </span>
              ) : null}
            </span>
            <span>{pasteDurationLabel}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  Voice
                </span>
                <button
                  type="button"
                  aria-label={
                    pinnedVoices.includes(pasteVoice)
                      ? "Unpin voice"
                      : "Pin voice"
                  }
                  className="inline-flex size-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-muted"
                  onClick={() => toggleVoicePin(pasteVoice)}
                >
                  <IconStar
                    className={cn(
                      "size-4",
                      pinnedVoices.includes(pasteVoice)
                        ? "fill-[var(--accent)] text-[var(--accent)]"
                        : "text-muted",
                    )}
                  />
                </button>
              </div>
              <select
                value={pasteVoice}
                onChange={(event) => {
                  setPasteVoice(event.target.value);
                  haltHtmlAudio(pasteAudioRef.current);
                  setPasteAudioUrl(null);
                  setPastePlaying(false);
                  setPasteError(null);
                }}
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {orderedVoices.map((item) => (
                  <option key={item} value={item}>
                    {item}
                    {pinnedVoices.includes(item) ? " ★" : ""}
                  </option>
                ))}
              </select>
            </div>
            <SelectField
              label="Speed"
              value={pasteSpeed}
              onChange={setPasteSpeed}
              options={SPEED_OPTIONS}
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <SelectField
              label="Style"
              value={stylePresetId}
              onChange={(value) => {
                setStylePresetId(value as StylePresetId);
              }}
              options={[
                ...STYLE_PRESETS.map((item) => ({
                  value: item.id,
                  label: item.label,
                })),
                { value: "custom", label: "Custom..." },
              ]}
            />
            <p className="text-xs text-muted">
              Style instructions influence delivery, pacing, and tone. They do
              not change the text content.
            </p>
            {stylePresetId === "custom" ? (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">
                  Custom style instruction
                </span>
                <textarea
                  value={styleCustomText}
                  onChange={(event) => {
                    setStyleCustomText(event.target.value);
                  }}
                  rows={3}
                  placeholder="Example: Read like a professional news anchor with calm, confident delivery"
                  className="min-h-[5rem] w-full resize-y rounded-xl border border-border bg-surface px-3 py-3 text-sm text-foreground outline-none transition-[box-shadow,border-color] placeholder:text-muted focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]"
                />
              </label>
            ) : (
              <p className="text-xs text-muted">{styleInstruction}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={pasteGenerating}
              onClick={() => {
                void generatePasteAudio();
              }}
            >
              {pasteGenerating
                ? "Generating audio..."
                : "Generate Audio"}
            </Button>
            {pasteAudioUrl ? (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label={pastePlaying ? "Pause" : "Play"}
                  disabled={pasteGenerating}
                  onClick={togglePastePlay}
                >
                  {pastePlaying ? <IconPause /> : <IconPlay />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pasteDownloading || pasteGenerating}
                  onClick={() => {
                    void handlePasteDownload();
                  }}
                >
                  {pasteDownloading ? "Downloading..." : "Download MP3"}
                </Button>
              </>
            ) : null}
          </div>

          {pasteError ? (
            <p className="text-sm text-danger" role="alert">
              {pasteError}
            </p>
          ) : null}
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
