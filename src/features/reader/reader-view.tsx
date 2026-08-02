"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  IconPause,
  IconPlay,
  IconReader,
  IconSearch,
} from "@/components/icons/dashboard-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress";
import { SelectField } from "@/components/ui/dropdown";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/overlays";
import { ROUTES } from "@/constants";
import {
  TTS_VOICES,
  TRANSLATION_LANGUAGES,
  labelForLanguageCode,
} from "@/constants/languages";
import { labelForMimeType } from "@/features/import/formats/registry";
import { getImportOwnerId } from "@/features/import/utils/pdf-upload-store";
import type { DocumentRecord } from "@/features/library/types";
import { processingStatusLabel } from "@/features/library/status-labels";
import { processingStageLabel } from "@/features/processing/stages";
import { cn } from "@/utils";

const SIDE_PANELS = [
  "Table of contents",
  "Bookmarks",
  "Highlights",
  "Notes",
  "Metadata",
  "Reading time",
  "Smart chapters",
] as const;

const SPEED_OPTIONS = [
  { value: "0.75", label: "0.75×" },
  { value: "1", label: "1×" },
  { value: "1.25", label: "1.25×" },
  { value: "1.5", label: "1.5×" },
];

type TranslationItem = {
  id: string;
  languageCode: string;
  languageLabel: string;
  text: string;
  status: string;
};

/**
 * Shared Reader for every import source — original + translation UX.
 */
export function ReaderView() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get("id")?.trim() ?? "";
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [translations, setTranslations] = useState<TranslationItem[]>([]);
  const [translateTo, setTranslateTo] = useState("__choose__");
  const [loading, setLoading] = useState(Boolean(documentId));
  const [translating, setTranslating] = useState(false);
  const [translationStatus, setTranslationStatus] = useState<
    "idle" | "ready" | "cached"
  >("idle");
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadedDocumentId, setLoadedDocumentId] = useState(documentId);

  const [voice, setVoice] = useState<string>(TTS_VOICES[0]);
  const [speed, setSpeed] = useState("1");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Reset reader state when the route document id changes (render-time sync).
  if (documentId !== loadedDocumentId) {
    setLoadedDocumentId(documentId);
    setDocument(null);
    setTranslations([]);
    setTranslateTo("__choose__");
    setLoading(Boolean(documentId));
    setError(null);
    setActionError(null);
    setTranslationStatus("idle");
    setAudioUrl(null);
    setPlaying(false);
    setProgress(0);
    setAudioError(null);
  }

  async function loadDocument() {
    if (!documentId) {
      setDocument(null);
      setTranslations([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const ownerId = getImportOwnerId();

    try {
      const [docResponse, translationResponse] = await Promise.all([
        fetch(
          `/api/library/documents/${encodeURIComponent(documentId)}?ownerId=${encodeURIComponent(ownerId)}`,
          { cache: "no-store" },
        ),
        fetch(
          `/api/documents/translate?ownerId=${encodeURIComponent(ownerId)}&documentId=${encodeURIComponent(documentId)}`,
          { cache: "no-store" },
        ),
      ]);

      const docPayload = (await docResponse.json()) as {
        ok?: boolean;
        document?: DocumentRecord;
        error?: string;
      };
      if (!docResponse.ok || !docPayload.ok || !docPayload.document) {
        throw new Error(docPayload.error || "Unable to load document.");
      }

      const translationPayload = (await translationResponse.json()) as {
        ok?: boolean;
        translations?: TranslationItem[];
      };

      setDocument(docPayload.document);
      setTranslations(translationPayload.translations ?? []);
      setLoading(false);
    } catch (cause) {
      setDocument(null);
      setLoading(false);
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "Unable to load document.",
      );
    }
  }

  useEffect(() => {
    if (!documentId) {
      return;
    }

    let cancelled = false;

    async function load() {
      const ownerId = getImportOwnerId();

      try {
        const [docResponse, translationResponse] = await Promise.all([
          fetch(
            `/api/library/documents/${encodeURIComponent(documentId)}?ownerId=${encodeURIComponent(ownerId)}`,
            { cache: "no-store" },
          ),
          fetch(
            `/api/documents/translate?ownerId=${encodeURIComponent(ownerId)}&documentId=${encodeURIComponent(documentId)}`,
            { cache: "no-store" },
          ),
        ]);

        const docPayload = (await docResponse.json()) as {
          ok?: boolean;
          document?: DocumentRecord;
          error?: string;
        };
        if (!docResponse.ok || !docPayload.ok || !docPayload.document) {
          throw new Error(docPayload.error || "Unable to load document.");
        }

        const translationPayload = (await translationResponse.json()) as {
          ok?: boolean;
          translations?: TranslationItem[];
        };

        if (cancelled) {
          return;
        }

        setDocument(docPayload.document);
        setTranslations(translationPayload.translations ?? []);
        setLoading(false);
      } catch (cause) {
        if (cancelled) {
          return;
        }
        setDocument(null);
        setLoading(false);
        setError(
          cause instanceof Error && cause.message
            ? cause.message
            : "Unable to load document.",
        );
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

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
      if (!audio || !audio.duration) {
        return;
      }
      setProgress(Math.round((audio.currentTime / audio.duration) * 100));
    }
    function onEnded() {
      setPlaying(false);
      setProgress(100);
    }
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audioUrl]);

  // (audio reset happens in Translate-to onChange — avoid setState-in-effect)

  const activeDocument = documentId ? document : null;
  const activeTranslations = useMemo(
    () => (documentId ? translations : []),
    [documentId, translations],
  );
  const activeLoading = Boolean(documentId) && loading;
  const activeError = documentId ? error : null;

  const detectedCode = activeDocument?.originalLanguage?.trim() || "auto";
  const detectedLabel =
    detectedCode === "auto"
      ? "Auto Detect"
      : `Auto Detect / ${labelForLanguageCode(detectedCode)}`;

  const selectedTranslation = useMemo(() => {
    if (!translateTo || translateTo === "__choose__") {
      return null;
    }
    return (
      activeTranslations.find((item) => item.languageCode === translateTo) ??
      null
    );
  }, [activeTranslations, translateTo]);

  const originalText = activeDocument?.extractedText?.trim() || "";
  // Translated view must never fall back to originalText.
  const translationText = selectedTranslation?.text?.trim() || "";
  const translationAvailable = Boolean(translationText);
  const alreadyTranslated =
    Boolean(selectedTranslation) &&
    selectedTranslation?.status === "ready" &&
    translationAvailable;

  const sourceLabel = activeDocument
    ? labelForMimeType(activeDocument.mimeType, activeDocument.sourceFormat)
    : "Untitled";

  useEffect(() => {
    if (!activeDocument) {
      return;
    }
    console.info("[translation flow]", "reader render selection", {
      selectedLanguage: translateTo,
      languageCode: translateTo,
      detectedLanguage: detectedCode,
      translationTextChars: translationText.length,
      originalTextChars: originalText.length,
      translationStatus: selectedTranslation?.status ?? null,
      fallbackToOriginal: false,
    });
  }, [
    activeDocument,
    detectedCode,
    originalText.length,
    selectedTranslation?.status,
    translateTo,
    translationText.length,
  ]);

  async function handleTranslate(targetCode: string) {
    if (!documentId || !targetCode || targetCode === "__choose__") {
      return;
    }

    // Instant load from local cache — never call AI again for ready text.
    const cached = activeTranslations.find(
      (item) =>
        item.languageCode === targetCode &&
        item.status === "ready" &&
        item.text.trim(),
    );
    if (cached) {
      setTranslateTo(cached.languageCode);
      setTranslationStatus("cached");
      setActionError(null);
      console.info("[translation flow]", "reader cache hit (no AI)", {
        documentId,
        languageCode: cached.languageCode,
        languageLabel: cached.languageLabel,
        textChars: cached.text.length,
      });
      return;
    }

    const catalog = TRANSLATION_LANGUAGES.find((item) => item.code === targetCode);
    console.info("[translation flow]", "reader language selection", {
      documentId,
      targetLanguage: catalog?.label ?? null,
      languageCode: targetCode,
      languageLabel: catalog?.label ?? null,
    });
    setTranslating(true);
    setTranslationStatus("idle");
    setActionError(null);
    try {
      const requestBody = {
        ownerId: getImportOwnerId(),
        documentId,
        languageCode: targetCode,
      };
      console.info("[translation flow]", "reader API request body", requestBody);
      const response = await fetch("/api/documents/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        translation?: TranslationItem;
      };
      console.info("[translation flow]", "reader API response", {
        httpStatus: response.status,
        ok: payload.ok ?? false,
        error: payload.error ?? null,
        languageCode: payload.translation?.languageCode ?? null,
        languageLabel: payload.translation?.languageLabel ?? null,
        status: payload.translation?.status ?? null,
        textChars: payload.translation?.text?.length ?? 0,
        textPreview: payload.translation?.text?.slice(0, 120) ?? null,
      });
      if (!response.ok || !payload.ok || !payload.translation) {
        throw new Error(payload.error || "Translation failed.");
      }
      setTranslations((current) => {
        const without = current.filter(
          (item) => item.languageCode !== payload.translation!.languageCode,
        );
        return [...without, payload.translation!];
      });
      setTranslateTo(payload.translation.languageCode);
      setTranslationStatus(
        payload.translation.text.trim() ? "ready" : "idle",
      );
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Translation failed.",
      );
      setTranslationStatus("idle");
    } finally {
      setTranslating(false);
    }
  }

  async function handleRetry() {
    if (!documentId) {
      return;
    }
    setRetrying(true);
    setActionError(null);
    try {
      const response = await fetch("/api/documents/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: getImportOwnerId(),
          documentId,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Retry failed.");
      }
      await loadDocument();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Retry failed.");
    } finally {
      setRetrying(false);
    }
  }

  async function generateTranslatedAudio() {
    if (!documentId || !translationAvailable || translateTo === "__choose__") {
      setAudioError("Translate the document before listening.");
      return;
    }
    setAudioBusy(true);
    setAudioError(null);
    try {
      const response = await fetch("/api/documents/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: getImportOwnerId(),
          documentId,
          languageCode: translateTo,
          voice,
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
      setAudioUrl(payload.audio.url);
      setProgress(0);
      setPlaying(false);
    } catch (cause) {
      setAudioError(
        cause instanceof Error ? cause.message : "Unable to generate audio.",
      );
    } finally {
      setAudioBusy(false);
    }
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audioUrl) {
      void generateTranslatedAudio();
      return;
    }
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

  function pauseAudio() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.pause();
    setPlaying(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reader"
        description="A focused reading layout with room for navigation and annotations."
        breadcrumbs={[
          { label: "Home", href: ROUTES.dashboard },
          { label: "Reader" },
        ]}
        actions={
          <Button variant="outline" leftIcon={<IconSearch className="size-3.5" />}>
            Search in document
          </Button>
        }
      />

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {activeDocument?.filename || "Document header"}
            </h2>
            <Badge>{sourceLabel}</Badge>
            {activeDocument ? (
              <Badge tone="accent">
                {processingStatusLabel(activeDocument.processingStatus)}
              </Badge>
            ) : null}
            {activeDocument?.processingStage &&
            activeDocument.processingStatus === "processing" ? (
              <Badge>
                {processingStageLabel(activeDocument.processingStage)}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted">
            {activeDocument?.sourceUrl ||
              "Title, source, and reading controls will sit here."}
          </p>
          {activeDocument?.processingError ? (
            <p className="mt-2 text-sm text-danger" role="alert">
              {activeDocument.processingError}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm">
            Contents
          </Button>
          <Button variant="ghost" size="sm">
            Notes
          </Button>
          {documentId ? (
            <>
              <Link href={`${ROUTES.listen}?id=${encodeURIComponent(documentId)}`}>
                <Button variant="outline" size="sm">
                  Listen
                </Button>
              </Link>
              <Link href={`${ROUTES.export}?id=${encodeURIComponent(documentId)}`}>
                <Button variant="outline" size="sm">
                  Export
                </Button>
              </Link>
              <Link href={`${ROUTES.ai}?id=${encodeURIComponent(documentId)}`}>
                <Button variant="outline" size="sm">
                  AI
                </Button>
              </Link>
            </>
          ) : null}
          {activeDocument?.processingStatus === "failed" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={retrying}
              onClick={() => {
                void handleRetry();
              }}
            >
              {retrying ? "Retrying…" : "Retry"}
            </Button>
          ) : null}
        </div>
      </Card>

      {documentId ? (
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">
                Detected language
              </span>
              <select
                disabled
                value={detectedCode}
                aria-label="Detected language"
                className="h-10 w-full cursor-not-allowed rounded-xl border border-border bg-surface-muted px-3 text-sm text-muted"
              >
                <option value={detectedCode}>{detectedLabel}</option>
              </select>
            </label>
          </div>
          <div className="flex-1">
            <SelectField
              label="Translate to"
              value={translateTo}
              onChange={(value) => {
                setTranslateTo(value);
                setAudioUrl(null);
                setPlaying(false);
                setProgress(0);
                setAudioError(null);
                setActionError(null);

                // Instantly surface an existing ready translation (no AI).
                const cached =
                  value !== "__choose__"
                    ? activeTranslations.find(
                        (item) =>
                          item.languageCode === value &&
                          item.status === "ready" &&
                          item.text.trim(),
                      )
                    : null;
                setTranslationStatus(cached ? "cached" : "idle");
              }}
              options={[
                { value: "__choose__", label: "Choose language" },
                ...TRANSLATION_LANGUAGES.map((item) => ({
                  value: item.code,
                  label: item.label,
                })),
              ]}
            />
          </div>
          <div className="flex flex-col items-stretch gap-1.5 sm:mb-0.5 sm:items-end">
            <Button
              variant="secondary"
              size="sm"
              disabled={
                translating ||
                !translateTo ||
                translateTo === "__choose__" ||
                alreadyTranslated
              }
              onClick={() => {
                void handleTranslate(translateTo);
              }}
            >
              {translating
                ? "Translating..."
                : alreadyTranslated
                  ? "✓ Translation Ready"
                  : "Translate"}
            </Button>
            {!translating && translationStatus === "ready" ? (
              <p className="text-xs font-medium text-success">
                ✓ Translation Ready
              </p>
            ) : !translating &&
              (alreadyTranslated || translationStatus === "cached") ? (
              <p className="text-xs font-medium text-success">
                ✓ Already translated
              </p>
            ) : null}
          </div>
          {actionError ? (
            <p className="w-full text-sm text-danger" role="alert">
              {actionError}
            </p>
          ) : null}
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[16rem_minmax(0,1fr)_16rem]">
        <Card>
          <CardHeader title="Contents" description="Chapter outline placeholder." />
          <EmptyState
            title="No chapters yet"
            description="A table of contents will appear for long documents."
            className="py-8"
          />
        </Card>

        <Card padding="lg" className="min-h-[28rem]">
          {!documentId ? (
            <EmptyState
              icon={<IconReader />}
              title="Open a document to read"
              description="The reading area stays wide and quiet — search, bookmarks, and highlights attach around it."
              className="min-h-[22rem] border-0 bg-transparent py-16"
            />
          ) : activeLoading ? (
            <EmptyState
              icon={<IconReader />}
              title="Loading document"
              description="Fetching extracted text for this import."
              className="min-h-[22rem] border-0 bg-transparent py-16"
            />
          ) : activeError ? (
            <EmptyState
              icon={<IconReader />}
              title="Unable to open document"
              description={activeError}
              className="min-h-[22rem] border-0 bg-transparent py-16"
            />
          ) : translationAvailable ? (
            <Tabs key={translateTo} defaultValue="reading" className="space-y-4">
              <TabsList>
                <TabsTrigger value="reading">Reading</TabsTrigger>
                <TabsTrigger value="listening">Listening</TabsTrigger>
              </TabsList>

              <TabsContent value="reading" className="space-y-3">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <section className="min-h-[20rem] rounded-xl border border-border/70 bg-surface/50 p-4">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                      Original
                    </h3>
                    {originalText ? (
                      <article className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                        {originalText}
                      </article>
                    ) : (
                      <p className="text-sm text-muted">No extracted text yet.</p>
                    )}
                  </section>
                  <section className="min-h-[20rem] rounded-xl border border-border/70 bg-surface/50 p-4">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                      Translated
                      {selectedTranslation?.languageLabel
                        ? ` · ${selectedTranslation.languageLabel}`
                        : ""}
                    </h3>
                    <article className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {translationText}
                    </article>
                  </section>
                </div>
              </TabsContent>

              <TabsContent value="listening" className="space-y-4">
                <p className="text-sm text-muted">
                  Listening uses the existing{" "}
                  {selectedTranslation?.languageLabel || "translated"} text. It
                  does not translate again.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SelectField
                    label="Voice"
                    value={voice}
                    onChange={setVoice}
                    options={TTS_VOICES.slice(0, 8).map((item) => ({
                      value: item,
                      label: item,
                    }))}
                  />
                  <SelectField
                    label="Speed"
                    value={speed}
                    onChange={setSpeed}
                    options={SPEED_OPTIONS}
                  />
                </div>
                <ProgressBar value={progress} label="Playback position" />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={playing ? <IconPause /> : <IconPlay />}
                    disabled={audioBusy}
                    onClick={togglePlay}
                  >
                    {audioBusy
                      ? "Preparing…"
                      : playing
                        ? "Pause"
                        : audioUrl
                          ? "Play"
                          : "Generate & play"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!audioUrl || !playing}
                    onClick={pauseAudio}
                  >
                    Pause
                  </Button>
                  {audioUrl ? (
                    <a
                      href={audioUrl}
                      download
                      className={cn(
                        "inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted",
                      )}
                    >
                      Download audio
                    </a>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      Download audio
                    </Button>
                  )}
                </div>
                {audioError ? (
                  <p className="text-sm text-danger" role="alert">
                    {audioError}
                  </p>
                ) : null}
                {audioUrl ? (
                  <audio ref={audioRef} src={audioUrl} preload="metadata" />
                ) : null}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              <section className="rounded-xl border border-border/70 bg-surface/50 p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  Original
                </h3>
                {originalText ? (
                  <article className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                    {originalText}
                  </article>
                ) : (
                  <EmptyState
                    icon={<IconReader />}
                    title="No extracted text yet"
                    description="Processing may still be running, or extraction failed for this source."
                    className="min-h-[12rem] border-0 bg-transparent py-10"
                  />
                )}
              </section>
              {translateTo !== "__choose__" ? (
                <EmptyState
                  icon={<IconReader />}
                  title="Translation not available yet."
                  description="Choose Translate to generate this language. The original stays visible above."
                  className="min-h-[12rem] border-0 bg-transparent py-10"
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={translating}
                      onClick={() => {
                        void handleTranslate(translateTo);
                      }}
                    >
                      {translating ? "Translating..." : "Translate"}
                    </Button>
                  }
                />
              ) : null}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Annotations" description="Side tools for deep reading." />
          <ul className="space-y-2 p-0">
            {SIDE_PANELS.map((panel) => (
              <li
                key={panel}
                className="rounded-xl border border-border/70 bg-surface-muted/40 px-3 py-2.5 text-sm text-muted"
              >
                {panel}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
