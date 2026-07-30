"use client";

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

/**
 * Floating studio transport — same TTS hooks, refreshed chrome.
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
  const isLoading = status === "loading";
  const isPlaying = status === "playing";
  const isPaused = status === "paused";
  const hasAudio = status === "ready" || isPlaying || isPaused;
  const progressMax = duration && duration > 0 ? duration : 0;
  const sourceLabel =
    source === "summary"
      ? "Summary"
      : source === "page"
        ? "Current page"
        : null;

  if (status === "idle" && !error) {
    return null;
  }

  return (
    <div
      className="sticky bottom-0 z-30 border-t border-border/60 bg-[color-mix(in_srgb,var(--surface)_82%,transparent)] px-4 py-3 backdrop-blur-xl sm:px-6"
      aria-label="Audio player"
    >
      <div className="mx-auto flex w-full max-w-none flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-10 w-14 items-end gap-0.5 rounded-xl bg-foreground px-2 py-1.5"
            >
              {[35, 60, 42, 75, 48].map((h, i) => (
                <span
                  key={i}
                  className="er-wave-bar flex-1 rounded-full bg-background/85"
                  style={{
                    height: `${h}%`,
                    animationPlayState: isPlaying ? "running" : "paused",
                  }}
                />
              ))}
            </div>
            <div className="min-w-0">
              <p className="text-[0.6rem] font-semibold tracking-[0.16em] text-accent uppercase">
                Transport
              </p>
              <p className="truncate text-sm font-semibold text-foreground">
                {isLoading
                  ? "Generating audio…"
                  : sourceLabel
                    ? `Listening · ${sourceLabel}`
                    : "Audio"}
              </p>
              {error ? (
                <p className="mt-0.5 text-xs text-danger" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isLoading ? (
              <span className="inline-flex h-9 items-center rounded-full border border-border bg-background/50 px-3 text-xs text-muted">
                Loading…
              </span>
            ) : null}

            {isPlaying ? (
              <PlayerButton label="Pause" onClick={onPause} primary />
            ) : null}

            {isPaused ? (
              <PlayerButton label="Resume" onClick={onResume} primary />
            ) : null}

            {status === "ready" ? (
              <PlayerButton label="Play" onClick={onPlay} primary />
            ) : null}

            {hasAudio || isLoading ? (
              <PlayerButton label="Stop" onClick={onStop} />
            ) : null}

            <label className="inline-flex items-center gap-2 text-xs text-muted">
              <span className="sr-only">Playback speed</span>
              <select
                value={speed}
                disabled={isLoading}
                onChange={(event) => {
                  onSpeedChange(Number(event.target.value) as TtsPlaybackSpeed);
                }}
                className="h-9 rounded-full border border-border bg-background/50 px-3 text-xs font-semibold text-foreground disabled:opacity-50"
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

        <div className="flex items-center gap-3">
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={progressMax || 1}
            step={0.1}
            value={Math.min(currentTime, progressMax || 0)}
            disabled={!hasAudio || !progressMax}
            onChange={(event) => {
              onSeek(Number(event.target.value));
            }}
            className="h-1.5 w-full cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Playback progress"
          />
          <span className="w-10 shrink-0 text-xs tabular-nums text-muted">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

function PlayerButton({
  label,
  onClick,
  disabled,
  primary,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        primary
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background/50 text-foreground hover:bg-surface-muted",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {label}
    </button>
  );
}
