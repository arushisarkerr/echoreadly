"use client";

import Link from "next/link";

import { ROUTES } from "@/constants";
import { WorkspaceCanvas } from "@/features/dashboard/workspace-canvas";
import { useVoicePreference } from "@/features/tts/use-voice-preference";
import { cn } from "@/utils";

/**
 * Voice — browse, preview, and persist the studio narrator.
 */
export function VoicesWorkspace() {
  const {
    voices,
    selectedVoice,
    selectedDefinition,
    loading,
    saving,
    previewingId,
    previewLoading,
    error,
    fallbackNotice,
    selectVoice,
    previewVoice,
    stopPreview,
    refresh,
  } = useVoicePreference();

  return (
    <WorkspaceCanvas
      kicker="Voice"
      title="Cast the narrator."
      description="Choose the OpenAI listening voice used for page and summary listening. Previews play a short sample. Changing voice applies to the next listen — current playback is left alone."
      actionHref={ROUTES.listen}
      actionLabel="Open Listen"
    >
      <div className="rounded-[1.5rem] border border-border/70 bg-surface/45 px-4 py-4 sm:px-5">
        <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-accent uppercase">
          Current voice
        </p>
        {loading ? (
          <div className="mt-3 h-8 w-48 animate-pulse rounded-full bg-surface-muted" />
        ) : (
          <>
            <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
              {selectedDefinition.name}
            </p>
            <p className="mt-1 text-sm text-muted">
              {selectedDefinition.description}
              {saving ? " · Saving…" : ""}
            </p>
          </>
        )}
        {fallbackNotice ? (
          <p role="status" className="mt-2 text-sm text-muted">
            {fallbackNotice}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}{" "}
            <button
              type="button"
              onClick={() => {
                void refresh();
              }}
              className="font-semibold underline-offset-2 hover:underline"
            >
              Retry
            </button>
          </p>
        ) : null}
      </div>

      {loading ? (
        <ul
          aria-hidden="true"
          className="mt-8 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <li
              key={index}
              className="min-h-[14rem] animate-pulse rounded-[1.65rem] border border-border/70 bg-surface/50"
            />
          ))}
        </ul>
      ) : (
        <ul className="mt-8 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {voices.map((voice) => {
            const selected = selectedVoice === voice.id;
            const previewing = previewingId === voice.id;

            return (
              <li key={voice.id}>
                <article
                  className={cn(
                    "group relative overflow-hidden rounded-[1.65rem] border p-5",
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border/70 bg-surface/50",
                  )}
                >
                  <div
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-0 top-0 h-20",
                      selected
                        ? "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent-soft)_35%,transparent),transparent)]"
                        : "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_14%,transparent),transparent)]",
                    )}
                  />
                  <div
                    className={cn(
                      "relative flex size-12 items-center justify-center rounded-2xl font-display text-lg font-bold",
                      selected
                        ? "bg-background text-foreground"
                        : "bg-foreground text-background",
                    )}
                  >
                    {voice.name.slice(0, 1)}
                  </div>
                  <h2 className="relative mt-4 font-display text-xl font-semibold tracking-tight">
                    {voice.name}
                  </h2>
                  <p
                    className={cn(
                      "relative mt-1 text-sm",
                      selected ? "text-background/70" : "text-muted",
                    )}
                  >
                    {voice.tone} · {voice.presentation}
                  </p>
                  <p
                    className={cn(
                      "relative mt-2 text-sm leading-relaxed",
                      selected ? "text-background/75" : "text-muted",
                    )}
                  >
                    {voice.description}
                  </p>
                  <div className="relative mt-4 flex h-10 items-end gap-0.5">
                    {[40, 65, 45, 80, 50, 70, 42, 75].map((h, i) => (
                      <span
                        key={i}
                        className={cn(
                          "er-wave-bar flex-1 rounded-full",
                          selected ? "bg-background/70" : "bg-accent/70",
                        )}
                        style={{
                          height: `${h}%`,
                          animationPlayState:
                            previewing && !previewLoading
                              ? "running"
                              : "paused",
                        }}
                      />
                    ))}
                  </div>
                  <div className="relative mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        void selectVoice(voice.id);
                      }}
                      className={cn(
                        "inline-flex h-9 items-center rounded-full px-3.5 text-xs font-semibold transition disabled:opacity-55",
                        selected
                          ? "bg-background text-foreground"
                          : "bg-foreground text-background",
                      )}
                    >
                      {selected ? "Selected" : "Use voice"}
                    </button>
                    <button
                      type="button"
                      disabled={previewLoading && previewing}
                      onClick={() => {
                        if (previewing) {
                          stopPreview();
                          return;
                        }
                        void previewVoice(voice.id);
                      }}
                      className={cn(
                        "inline-flex h-9 items-center rounded-full border px-3.5 text-xs font-semibold transition disabled:opacity-55",
                        selected
                          ? "border-background/30 text-background"
                          : "border-border text-foreground",
                      )}
                    >
                      {previewLoading && previewing
                        ? "Loading…"
                        : previewing
                          ? "Stop preview"
                          : "Preview"}
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10 rounded-[1.5rem] border border-border/70 bg-background/40 px-4 py-5 sm:px-5">
        <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
          Where this applies
        </h3>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Listening uses your selected
          voice. Open a document from the{" "}
          <Link
            href={ROUTES.library}
            className="font-semibold text-foreground underline-offset-2 hover:underline"
          >
            library
          </Link>{" "}
          to hear the change on the next narration.
        </p>
      </div>
    </WorkspaceCanvas>
  );
}
