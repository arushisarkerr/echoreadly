"use client";

import { Suspense } from "react";
import Link from "next/link";

import { ROUTES } from "@/constants";
import { AccountMenu } from "@/features/auth";
import { BillingSettingsCard } from "@/features/billing";
import { WorkspaceCanvas } from "@/features/dashboard/workspace-canvas";
import { TTS_PLAYBACK_SPEEDS } from "@/features/tts";
import { cn } from "@/utils";

import {
  EXPORT_FORMAT_PREFERENCES,
  FONT_SIZE_PREFERENCES,
  MAX_DISPLAY_NAME_LENGTH,
  READING_WIDTH_PREFERENCES,
  THEME_PREFERENCES,
  type FontSizePreference,
  type ReadingWidthPreference,
  type ThemePreference,
} from "./types";
import { useSettings } from "./use-settings";

/**
 * Account — playback, language, voice, billing, profile, downloads, display.
 */
export function SettingsWorkspace() {
  const settings = useSettings();
  const loading = settings.status === "loading";
  const saving = settings.status === "saving";

  return (
    <WorkspaceCanvas
      kicker="Account"
      title="Your listening preferences."
      description="Language, voice, playback, downloads, and plan — keep listening effortless."
      actionHref={ROUTES.library}
      actionLabel="Open Library"
      wide={false}
    >
      {loading ? (
        <p role="status" className="text-sm text-muted">
          Loading your account…
        </p>
      ) : null}

      {settings.status === "error" && !settings.saved ? (
        <div
          role="alert"
          className="rounded-[1.5rem] border border-danger/30 bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-4"
        >
          <p className="text-sm font-semibold text-danger">
            Couldn’t load settings
          </p>
          <p className="mt-1 text-sm text-muted">{settings.error}</p>
          <button
            type="button"
            onClick={() => {
              void settings.refresh();
            }}
            className="mt-3 inline-flex h-9 items-center rounded-full border border-border px-3.5 text-xs font-semibold text-foreground"
          >
            Try again
          </button>
        </div>
      ) : null}

      {settings.saved || settings.status === "ready" || settings.status === "saving" || settings.status === "saved" || (settings.status === "error" && settings.saved) ? (
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            void settings.save();
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-h-5" aria-live="polite">
              {settings.isDirty ? (
                <p className="text-sm font-medium text-warning">
                  You have unsaved changes.
                </p>
              ) : null}
              {settings.status === "saving" ? (
                <p className="text-sm text-muted">Saving…</p>
              ) : null}
              {settings.status === "saved" && !settings.isDirty ? (
                <p className="text-sm font-medium text-success">
                  Settings saved.
                </p>
              ) : null}
              {settings.status === "error" && settings.error ? (
                <p className="text-sm font-medium text-danger">
                  {settings.error}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={settings.discard}
                disabled={!settings.isDirty || saving}
                className="inline-flex h-10 items-center justify-center rounded-full border border-border/80 bg-background/50 px-4 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-45"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={!settings.canSave}
                className="inline-flex h-10 items-center justify-center rounded-full border border-foreground bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {saving ? "Saving…" : "Save settings"}
              </button>
            </div>
          </div>

          <section className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5 sm:px-6">
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Playback
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Default speed for the player. Auto-play continues to the next page
              after page audio ends.
            </p>
            <fieldset className="mt-4">
              <legend className="text-xs font-semibold tracking-wide text-subtle uppercase">
                Playback speed
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {TTS_PLAYBACK_SPEEDS.map((speed) => (
                  <ChoiceChip
                    key={speed}
                    label={`${speed}×`}
                    selected={settings.draft.playbackSpeed === speed}
                    disabled={saving}
                    onSelect={() => {
                      settings.setField("playbackSpeed", speed);
                    }}
                  />
                ))}
              </div>
            </fieldset>
            <label className="mt-5 flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-4 rounded border-border"
                checked={settings.draft.autoPlayNextPage}
                disabled={saving}
                onChange={(event) => {
                  settings.setField("autoPlayNextPage", event.target.checked);
                }}
              />
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  Auto-play next page
                </span>
                <span className="mt-1 block text-sm text-muted">
                  After a page finishes playing, continue with the next page
                  when available.
                </span>
              </span>
            </label>
          </section>

          <section className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5 sm:px-6">
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Language
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              বাংলা is the primary listening language. Change language per listen
              from Listen options → Listening Language.
            </p>
            <p className="mt-4 inline-flex rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs font-semibold text-foreground">
              Default · বাংলা (bn)
            </p>
          </section>

          <section className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5 sm:px-6">
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Voice
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Used when you listen. Preview and pick a narrator in Voice.
            </p>
            <label className="mt-4 block">
              <span className="text-xs font-semibold tracking-wide text-subtle uppercase">
                Narrator
              </span>
              <select
                value={settings.draft.preferredTtsVoice}
                disabled={saving || settings.voices.length === 0}
                onChange={(event) => {
                  settings.setField(
                    "preferredTtsVoice",
                    event.target.value as typeof settings.draft.preferredTtsVoice,
                  );
                }}
                className="mt-2 w-full rounded-2xl border border-border/80 bg-background/60 px-4 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {settings.voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </label>
            <Link
              href={ROUTES.voices}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-border/80 px-4 text-xs font-semibold text-foreground no-underline transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Browse voices
            </Link>
          </section>

          <Suspense
            fallback={
              <section className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5 sm:px-6">
                <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                  Billing
                </h2>
                <p className="mt-2 text-sm text-muted">Loading plan…</p>
              </section>
            }
          >
            <BillingSettingsCard />
          </Suspense>

          <section className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5 sm:px-6">
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Profile
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Display name shown in your greeting and account menu.
            </p>
            <label className="mt-4 block">
              <span className="text-xs font-semibold tracking-wide text-subtle uppercase">
                Display name
              </span>
              <input
                type="text"
                value={settings.draft.displayName}
                maxLength={MAX_DISPLAY_NAME_LENGTH}
                disabled={saving}
                onChange={(event) => {
                  settings.setField("displayName", event.target.value);
                }}
                className="mt-2 w-full rounded-2xl border border-border/80 bg-background/60 px-4 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Your name"
                autoComplete="nickname"
              />
            </label>
            {settings.fieldErrors.displayName ? (
              <p className="mt-2 text-xs text-danger" role="alert">
                {settings.fieldErrors.displayName}
              </p>
            ) : null}
            <div className="mt-4 max-w-xs">
              <AccountMenu />
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5 sm:px-6">
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Downloads
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Preferred format for audio you take with you.
            </p>
            <fieldset className="mt-4">
              <legend className="text-xs font-semibold tracking-wide text-subtle uppercase">
                Preferred format
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXPORT_FORMAT_PREFERENCES.map((format) => (
                  <ChoiceChip
                    key={format}
                    label={format.toUpperCase()}
                    selected={
                      settings.draft.preferredExportFormat === format
                    }
                    disabled={saving}
                    onSelect={() => {
                      settings.setField("preferredExportFormat", format);
                    }}
                  />
                ))}
              </div>
            </fieldset>
            <p className="mt-3 text-xs text-subtle">
              MP3 is the only download format currently supported.
            </p>
            <Link
              href={ROUTES.exports}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-border/80 px-4 text-xs font-semibold text-foreground no-underline transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Open Downloads
            </Link>
          </section>

          <section className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5 sm:px-6">
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Display
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Text size, content width, and theme for comfortable listening
              alongside the document.
            </p>
            <fieldset className="mt-4">
              <legend className="text-xs font-semibold tracking-wide text-subtle uppercase">
                Font size
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {FONT_SIZE_PREFERENCES.map((size) => (
                  <ChoiceChip
                    key={size}
                    label={fontSizeLabel(size)}
                    selected={settings.draft.fontSize === size}
                    disabled={saving}
                    onSelect={() => {
                      settings.setField("fontSize", size);
                    }}
                  />
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-5">
              <legend className="text-xs font-semibold tracking-wide text-subtle uppercase">
                Content width
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {READING_WIDTH_PREFERENCES.map((width) => (
                  <ChoiceChip
                    key={width}
                    label={readingWidthLabel(width)}
                    selected={settings.draft.readingWidth === width}
                    disabled={saving}
                    onSelect={() => {
                      settings.setField("readingWidth", width);
                    }}
                  />
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-5">
              <legend className="text-xs font-semibold tracking-wide text-subtle uppercase">
                Theme
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {THEME_PREFERENCES.map((theme) => (
                  <ChoiceChip
                    key={theme}
                    label={themeLabel(theme)}
                    selected={settings.draft.themePreference === theme}
                    disabled={saving}
                    onSelect={() => {
                      settings.setField("themePreference", theme);
                    }}
                  />
                ))}
              </div>
            </fieldset>
          </section>
        </form>
      ) : null}
    </WorkspaceCanvas>
  );
}

function fontSizeLabel(size: FontSizePreference): string {
  switch (size) {
    case "sm":
      return "Small";
    case "md":
      return "Medium";
    case "lg":
      return "Large";
  }
}

function readingWidthLabel(width: ReadingWidthPreference): string {
  switch (width) {
    case "narrow":
      return "Narrow";
    case "default":
      return "Default";
    case "wide":
      return "Wide";
  }
}

function themeLabel(theme: ThemePreference): string {
  switch (theme) {
    case "light":
      return "Light";
    case "dark":
      return "Dark";
    case "system":
      return "System";
  }
}

function ChoiceChip({
  label,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border/80 bg-background/50 text-foreground hover:bg-surface-muted",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {label}
    </button>
  );
}
