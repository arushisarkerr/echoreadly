import { ROUTES } from "@/constants";
import { WorkspaceCanvas } from "@/features/dashboard/workspace-canvas";

const FORMATS = [
  { name: "MP3", line: "Everywhere" },
  { name: "M4A", line: "Efficient" },
  { name: "WAV", line: "Master" },
] as const;

/**
 * Export desk — queue / processing / completed presentation.
 */
export function ExportsWorkspace() {
  return (
    <WorkspaceCanvas
      kicker="Exports"
      title="Ship the sound."
      description="Format desk and queue board. Generation still rides the existing TTS path inside the studio."
      actionHref={ROUTES.listen}
      actionLabel="Generate in Listen"
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <ul className="list-none space-y-3 p-0">
          {FORMATS.map((format) => (
            <li
              key={format.name}
              className="flex items-center justify-between rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5"
            >
              <div>
                <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
                  {format.name}
                </h2>
                <p className="mt-1 text-sm text-muted">{format.line}</p>
              </div>
              <button
                type="button"
                disabled
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted"
              >
                Queue
              </button>
            </li>
          ))}
        </ul>

        <div className="er-glass rounded-[2rem] p-6">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Board
          </h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {["Queue", "Processing", "Completed"].map((column, i) => (
              <div
                key={column}
                className="rounded-2xl border border-border/60 bg-background/40 p-4"
              >
                <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-subtle uppercase">
                  {column}
                </p>
                <div className="mt-4 h-16 rounded-xl border border-dashed border-border/80" />
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${12 + i * 36}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
            >
              Download
            </button>
            <button
              type="button"
              disabled
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted"
            >
              Share
            </button>
          </div>
        </div>
      </div>
    </WorkspaceCanvas>
  );
}
