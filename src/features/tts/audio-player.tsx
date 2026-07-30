"use client";

import { useEffect, useId, useRef } from "react";

import { cn } from "@/utils";

import type { TtsPlaybackSpeed, TtsPlaybackStatus, TtsSource } from "./types";

type AudioPlayerProps = {
  status: TtsPlaybackStatus;
  source: TtsSource | null;
  error: string | null;
  currentTime: number;
  duration: number | null;
  speed: TtsPlaybackSpeed;
  speeds: TtsPlaybackSpeed[];
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSpeedChange: (speed: TtsPlaybackSpeed) => void;
  onSeek: (time: number) => void;
};

function formatTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return "--:--";
  }

  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function friendlyError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("generate a summary")) {
    return "Choose a listening mode first, then tap Listen.";
  }
  if (normalized.includes("rate") || normalized.includes("429")) {
    return "Too many requests. Wait a moment, then try Listen again.";
  }
  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "Network issue while generating speech. Check your connection and retry.";
  }
  if (normalized.includes("empty")) {
    return "There’s nothing to narrate on this selection.";
  }
  return message || "Unable to generate or play speech.";
}

/**
 * Sticky listen transport — same TTS callbacks; presentation/a11y polish only.
 */
export function AudioPlayer({
  status,
  source,
  error,
  currentTime,
  duration,
  speed,
  speeds,
  onPlay,
  onPause,
  onResume,
  onStop,
  onSpeedChange,
  onSeek,
}: AudioPlayerProps) {
  const regionId = useId();
  const progressId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "loading";
  const isPlaying = status === "playing";
  const isPaused = status === "paused";
  const isGenerationError = status === "error";
  const hasSoftPlaybackError =
    Boolean(error) && !isGenerationError && status !== "loading";
  const showError = isGenerationError || hasSoftPlaybackError;
  const hasAudio = status === "ready" || isPlaying || isPaused;
  const progressMax = duration && duration > 0 ? duration : 0;
  const atStart = hasAudio && progressMax > 0 && currentTime <= 0.15;
  const sourceLabel =
    source === "summary"
      ? "Listen mode"
      : source === "page"
        ? "This page"
        : null;

  const statusAnnouncement = isLoading
    ? "Generating audio"
    : isPlaying
      ? `Playing ${sourceLabel ?? "audio"}`
      : isPaused
        ? "Paused"
        : isGenerationError
          ? "Speech error"
          : status === "ready"
            ? "Audio ready"
            : "";

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const root = rootRef.current;
      if (!root || !root.contains(document.activeElement)) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }

      if (event.key === " " || event.key === "k" || event.key === "K") {
        event.preventDefault();
        if (isPlaying) {
          onPause();
        } else if (isPaused) {
          onResume();
        } else if (status === "ready") {
          onPlay();
        }
      }

      if (event.key === "Home" && hasAudio) {
        event.preventDefault();
        onSeek(0);
      }

      if (event.key === "End" && hasAudio && progressMax) {
        event.preventDefault();
        onSeek(progressMax);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    hasAudio,
    isPaused,
    isPlaying,
    onPause,
    onPlay,
    onResume,
    onSeek,
    progressMax,
    status,
  ]);

  if (status === "idle" && !error) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className="sticky bottom-0 z-30 border-t border-border/60 bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-3 py-3.5 backdrop-blur-xl sm:px-5 sm:py-4"
      role="region"
      aria-labelledby={regionId}
      tabIndex={-1}
    >
      <p id={regionId} className="sr-only">
        Audio player
      </p>
      <p className="sr-only" aria-live="polite">
        {statusAnnouncement}
      </p>

      <div className="mx-auto flex w-full max-w-none flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              aria-hidden="true"
              className={cn(
                "flex h-11 w-14 items-end gap-0.5 rounded-2xl px-2 py-1.5",
                isGenerationError ? "bg-danger/90" : "bg-foreground",
              )}
            >
              {[35, 60, 42, 75, 48].map((h, i) => (
                <span
                  key={i}
                  className={cn(
                    "er-wave-bar flex-1 rounded-full",
                    isGenerationError ? "bg-background/80" : "bg-background/85",
                  )}
                  style={{
                    height: `${h}%`,
                    animationPlayState: isPlaying ? "running" : "paused",
                  }}
                />
              ))}
            </div>

            <div className="min-w-0">
              <p className="text-[0.6rem] font-semibold tracking-[0.16em] text-accent uppercase">
                Now playing
              </p>
              <p className="truncate text-sm font-semibold text-foreground">
                {isLoading
                  ? "Preparing audio…"
                  : isGenerationError
                    ? "Speech unavailable"
                    : sourceLabel
                      ? `Listening · ${sourceLabel}`
                      : "Audio ready"}
              </p>
              {showError && error ? (
                <p className="mt-0.5 text-xs text-danger" role="alert">
                  {friendlyError(error)}
                  {isGenerationError
                    ? " Use Listen again to retry."
                    : ""}
                </p>
              ) : null}
              {isLoading ? (
                <p className="mt-0.5 text-xs text-muted" role="status">
                  Please keep this tab open…
                </p>
              ) : null}
              {status === "ready" && !isGenerationError ? (
                <p className="mt-0.5 text-xs text-muted" role="status">
                  Ready to play
                </p>
              ) : null}
            </div>
          </div>

          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Playback controls"
          >
            {isLoading ? (
              <span className="inline-flex h-10 min-h-10 items-center rounded-full border border-border bg-background/50 px-3.5 text-xs font-semibold text-muted">
                Loading…
              </span>
            ) : null}

            {isPlaying ? (
              <PlayerButton
                label="Pause"
                ariaLabel="Pause playback"
                onClick={onPause}
                primary
              />
            ) : null}

            {isPaused ? (
              <PlayerButton
                label="Resume"
                ariaLabel="Resume playback"
                onClick={onResume}
                primary
              />
            ) : null}

            {status === "ready" ? (
              <PlayerButton
                label={atStart ? "Replay" : "Play"}
                ariaLabel={atStart ? "Replay from the beginning" : "Play audio"}
                onClick={onPlay}
                primary
              />
            ) : null}

            {hasAudio ? (
              <PlayerButton
                label="Restart"
                ariaLabel="Restart from the beginning"
                onClick={() => {
                  onSeek(0);
                  if (!isPlaying) {
                    onPlay();
                  }
                }}
              />
            ) : null}

            {hasAudio || isLoading || isGenerationError || hasSoftPlaybackError ? (
              <PlayerButton
                label={isGenerationError ? "Dismiss" : "Stop"}
                ariaLabel={
                  isGenerationError
                    ? "Dismiss speech error"
                    : isLoading
                      ? "Cancel speech generation"
                      : "Stop and clear audio"
                }
                onClick={onStop}
              />
            ) : null}

            <label className="inline-flex h-10 min-h-10 items-center gap-2 rounded-full border border-border/80 bg-background/50 px-3 text-xs text-muted">
              <span className="sr-only">Playback speed</span>
              <span aria-hidden="true" className="font-medium">
                Speed
              </span>
              <select
                value={speed}
                disabled={isLoading}
                aria-label="Playback speed"
                onChange={(event) => {
                  onSpeedChange(Number(event.target.value) as TtsPlaybackSpeed);
                }}
                className="h-7 rounded-full border-0 bg-transparent text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {speeds.map((value) => (
                  <option key={value} value={value}>
                    {value}x
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <span
            className="w-10 shrink-0 text-right text-[0.7rem] tabular-nums text-muted sm:w-11 sm:text-xs"
            aria-hidden="true"
          >
            {formatTime(currentTime)}
          </span>
          <input
            id={progressId}
            type="range"
            min={0}
            max={progressMax || 1}
            step={0.1}
            value={Math.min(currentTime, progressMax || 0)}
            disabled={!hasAudio || !progressMax}
            onChange={(event) => {
              onSeek(Number(event.target.value));
            }}
            className="h-2.5 w-full cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Playback progress"
            aria-valuemin={0}
            aria-valuemax={progressMax || 0}
            aria-valuenow={Math.min(currentTime, progressMax || 0)}
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          />
          <span
            className="w-10 shrink-0 text-[0.7rem] tabular-nums text-muted sm:w-11 sm:text-xs"
            aria-hidden="true"
          >
            {formatTime(duration)}
          </span>
        </div>

        <p className="sr-only">
          When the player is focused: Space or K toggles play and pause. Home
          restarts. End jumps to the end.
        </p>
      </div>
    </div>
  );
}

function PlayerButton({
  label,
  ariaLabel,
  onClick,
  disabled,
  primary,
}: {
  label: string;
  ariaLabel?: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      className={cn(
        "inline-flex h-10 min-h-10 items-center justify-center rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        primary
          ? "border-foreground bg-foreground text-background hover:opacity-90"
          : "border-border bg-background/50 text-foreground hover:bg-surface-muted",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {label}
    </button>
  );
}
