import { ROUTES } from "@/constants";
import { WorkspaceCanvas } from "@/features/dashboard/workspace-canvas";

const FORMATS = [
  { name: "MP3", line: "Everywhere playback" },
  { name: "M4A", line: "Efficient clarity" },
  { name: "WAV", line: "Studio fidelity" },
] as const;

const BOARD_COLUMNS = ["Queue", "Processing", "Completed"] as const;

/**
 * Export desk preview — layout only. No generation, download, or share APIs.
 */
export function ExportsWorkspace() {
  return (
    <WorkspaceCanvas
      kicker="Exports · Coming soon"
      title="Ship the sound — soon."
      description="Audio file export is not available in this launch. This page is a preview of planned MP3, M4A, and WAV downloads. Listen online in the studio today."
      actionHref={ROUTES.listen}
      actionLabel="Listen online now"
    >
      <div
        role="status"
        className="rounded-[1.5rem] border border-dashed border-border/80 bg-surface/40 px-4 py-4 sm:px-5"
      >
        <p className="text-sm font-semibold text-foreground">
          Preview only — export is not live
        </p>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          You cannot queue, download, or share audio files from this workspace
          yet. Use Listen or the Listening Studio for online playback with the
          existing TTS path.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <ul
          className="list-none space-y-3 p-0"
          aria-label="Planned export formats"
        >
          {FORMATS.map((format) => (
            <li
              key={format.name}
              className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
                    {format.name}
                  </h2>
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-subtle uppercase">
                    Coming soon
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{format.line}</p>
              </div>
              <button
                type="button"
                disabled
                aria-disabled="true"
                aria-label={`${format.name} export coming soon`}
                title="Coming soon"
                className="shrink-0 cursor-not-allowed rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted opacity-70"
              >
                Coming soon
              </button>
            </li>
          ))}
        </ul>

        <div
          className="er-glass rounded-[2rem] p-6"
          aria-label="Export board preview"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-foreground">
              Board
            </h3>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-subtle uppercase">
              Preview
            </span>
          </div>
          <p className="mt-2 text-sm text-muted">
            Empty preview columns — no export jobs run here yet.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {BOARD_COLUMNS.map((column) => (
              <div
                key={column}
                className="rounded-2xl border border-border/60 bg-background/40 p-4"
              >
                <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-subtle uppercase">
                  {column}
                </p>
                <div
                  className="mt-4 flex h-16 items-center justify-center rounded-xl border border-dashed border-border/80"
                  role="status"
                >
                  <span className="text-xs font-medium text-subtle">Empty</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              aria-disabled="true"
              aria-label="Download coming soon"
              title="Coming soon — export downloads are not available"
              className="cursor-not-allowed rounded-full border border-border bg-foreground/10 px-4 py-2 text-xs font-semibold text-muted opacity-70"
            >
              Download · Coming soon
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              aria-label="Share coming soon"
              title="Coming soon — export sharing is not available"
              className="cursor-not-allowed rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted opacity-70"
            >
              Share · Coming soon
            </button>
          </div>
        </div>
      </div>
    </WorkspaceCanvas>
  );
}
