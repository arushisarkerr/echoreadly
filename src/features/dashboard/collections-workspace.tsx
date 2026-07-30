import { ROUTES } from "@/constants";
import { WorkspaceCanvas } from "@/features/dashboard/workspace-canvas";

const FOLDERS = [
  { name: "Pinned", note: "Keep close", accent: true },
  { name: "Favorites", note: "Starred listens", accent: false },
  { name: "Recently played", note: "Last session", accent: false },
  { name: "Study", note: "Deep work", accent: false },
  { name: "Briefings", note: "Daily pulse", accent: false },
  { name: "Longform", note: "Chapters", accent: false },
] as const;

/**
 * Collections mosaic — frontend-only visual folders.
 */
export function CollectionsWorkspace() {
  return (
    <WorkspaceCanvas
      kicker="Collections"
      title="Rooms for your listening."
      description="Pinned, favorites, and recently played — crafted as visual rooms. Persistence arrives with the next data layer."
      actionHref={ROUTES.library}
      actionLabel="Fill from shelf"
    >
      <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {FOLDERS.map((folder, i) => (
          <li key={folder.name}>
            <article
              className={`relative flex min-h-[12rem] flex-col justify-between overflow-hidden rounded-[1.85rem] border border-border/70 p-6 ${
                folder.accent
                  ? "bg-foreground text-background"
                  : "bg-surface/55"
              }`}
            >
              <div
                aria-hidden="true"
                className={`absolute -right-8 -top-10 size-32 rounded-full blur-3xl ${
                  folder.accent
                    ? "bg-[color-mix(in_srgb,var(--accent-soft)_50%,transparent)]"
                    : "bg-[color:var(--glow)]"
                }`}
                style={{ opacity: 0.7 - i * 0.05 }}
              />
              <p
                className={`relative text-[0.65rem] font-semibold tracking-[0.18em] uppercase ${
                  folder.accent ? "text-background/55" : "text-accent"
                }`}
              >
                Collection
              </p>
              <div className="relative">
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  {folder.name}
                </h2>
                <p
                  className={`mt-2 text-sm ${
                    folder.accent ? "text-background/65" : "text-muted"
                  }`}
                >
                  {folder.note} · 0 items
                </p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </WorkspaceCanvas>
  );
}
