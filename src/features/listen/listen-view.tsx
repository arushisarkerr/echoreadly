"use client";

import { useEffect, useRef, useState } from "react";
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
import { TTS_LANGUAGES, TTS_VOICES } from "@/constants/languages";
import { getImportOwnerId } from "@/features/import/utils/pdf-upload-store";

export function ListenView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const documentId = searchParams.get("id")?.trim() ?? "";
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("1");
  const [voice, setVoice] = useState("alloy");
  const [language, setLanguage] = useState("bn");
  const [volume, setVolume] = useState(80);
  const [progress, setProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("No track selected");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) {
      return;
    }
    let cancelled = false;
    async function loadMeta() {
      try {
        const ownerId = getImportOwnerId();
        const response = await fetch(
          `/api/library/documents/${encodeURIComponent(documentId)}?ownerId=${encodeURIComponent(ownerId)}`,
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          document?: { filename?: string };
        };
        if (!cancelled && payload.document?.filename) {
          setTitle(payload.document.filename);
        }
      } catch {
        // keep default title
      }
    }
    void loadMeta();
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
    audio.volume = Math.min(1, Math.max(0, volume / 100));
  }, [speed, volume, audioUrl]);

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

  async function generateAndLoad() {
    if (!documentId) {
      setError("Open a document from the Library or Reader first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/documents/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: getImportOwnerId(),
          documentId,
          languageCode: language,
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
      setError(cause instanceof Error ? cause.message : "Unable to generate audio.");
    } finally {
      setBusy(false);
    }
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !audioUrl) {
      void generateAndLoad();
      return;
    }
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play().then(() => setPlaying(true));
    }
  }

  function stop() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
    setProgress(0);
  }

  function seek(percent: number) {
    const audio = audioRef.current;
    if (!audio || !audio.duration) {
      return;
    }
    audio.currentTime = (percent / 100) * audio.duration;
    setProgress(percent);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Listen"
        description="A premium player surface for natural AI audio."
        breadcrumbs={[
          { label: "Home", href: ROUTES.dashboard },
          { label: "Listen" },
        ]}
      />

      <audio ref={audioRef} src={audioUrl ?? undefined} preload="metadata" />

      <Card className="overflow-hidden">
        <div className="border-b border-border/70 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--accent)_16%,transparent),_transparent_60%)] px-5 py-6 sm:px-6">
          <Badge tone="accent">Now playing</Badge>
          <h2 className="font-display mt-3 text-2xl font-semibold text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {documentId
              ? "Generate speech from original or translated text."
              : "Current track metadata will appear here."}
          </p>
        </div>

        <div className="space-y-5 px-5 py-6 sm:px-6">
          <button
            type="button"
            className="block w-full text-left"
            aria-label="Seek"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const percent = Math.round(
                ((event.clientX - rect.left) / rect.width) * 100,
              );
              seek(Math.min(100, Math.max(0, percent)));
            }}
          >
            <ProgressBar value={progress} label="Playback position" />
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="icon"
              aria-label={playing ? "Pause" : "Play"}
              onClick={togglePlay}
              disabled={busy}
            >
              {playing ? <IconPause /> : <IconPlay />}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Stop"
              onClick={stop}
            >
              <IconStop />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || !documentId}
              onClick={() => {
                void generateAndLoad();
              }}
            >
              {busy ? "Generating…" : "Generate audio"}
            </Button>
            {audioUrl ? (
              <a href={audioUrl} download className="inline-flex">
                <Button variant="outline" size="sm">
                  Download Audio
                </Button>
              </a>
            ) : null}
            {!documentId ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(ROUTES.library)}
              >
                Choose document
              </Button>
            ) : null}
            <label className="ml-auto flex items-center gap-2 text-xs text-muted">
              Volume
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="w-28 accent-[var(--accent)]"
                aria-label="Volume"
              />
            </label>
          </div>

          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <SelectField
              label="Speed"
              value={speed}
              onChange={setSpeed}
              options={[
                { value: "0.75", label: "0.75×" },
                { value: "1", label: "1×" },
                { value: "1.25", label: "1.25×" },
                { value: "1.5", label: "1.5×" },
                { value: "2", label: "2×" },
              ]}
            />
            <SelectField
              label="Voice"
              value={voice}
              onChange={setVoice}
              options={TTS_VOICES.slice(0, 6).map((item) => ({
                value: item,
                label: item[0].toUpperCase() + item.slice(1),
              }))}
            />
            <SelectField
              label="Language"
              value={language}
              onChange={setLanguage}
              options={[
                { value: "original", label: "Original" },
                ...TTS_LANGUAGES.map((item) => ({
                  value: item.code,
                  label: item.label,
                })),
              ]}
            />
          </div>
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
