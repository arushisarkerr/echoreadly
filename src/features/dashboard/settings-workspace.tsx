import { AccountMenu } from "@/features/auth";
import { ThemeToggle } from "@/features/dashboard/theme-toggle";
import { WorkspaceCanvas } from "@/features/dashboard/workspace-canvas";
import { ROUTES } from "@/constants";

const SECTIONS = [
  {
    id: "workspace",
    title: "Workspace",
    body: "Default landing, density, and studio shortcuts.",
  },
  {
    id: "appearance",
    title: "Appearance",
    body: "Light, dark, or follow the system — live theme control below.",
  },
  {
    id: "audio",
    title: "Audio",
    body: "Playback defaults for Listen and the Listening Studio.",
  },
  {
    id: "voices",
    title: "Voices",
    body: "Preferred narrator and style when opening new content.",
  },
  {
    id: "notifications",
    title: "Notifications",
    body: "Export ready, processing finished, and weekly digests.",
  },
  {
    id: "billing",
    title: "Billing",
    body: "Plan and invoices — linked when billing ships.",
  },
  {
    id: "profile",
    title: "Profile",
    body: "Account identity stays in AccountMenu — auth unchanged.",
  },
] as const;

/**
 * Settings atelier — UI sections; account/auth remain via AccountMenu.
 */
export function SettingsWorkspace() {
  return (
    <WorkspaceCanvas
      kicker="Settings"
      title="Tune the workspace."
      description="Appearance, audio, voices, and profile — all presentation. Authentication stays on AccountMenu."
      actionHref={ROUTES.dashboard}
      actionLabel="Back to Home"
      wide={false}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <ul className="list-none space-y-3 p-0">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <article className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5">
                <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {section.body}
                </p>
                {section.id === "appearance" ? (
                  <div className="mt-4">
                    <ThemeToggle />
                  </div>
                ) : null}
                {section.id === "profile" ? (
                  <div className="mt-4 max-w-xs">
                    <AccountMenu />
                  </div>
                ) : null}
              </article>
            </li>
          ))}
        </ul>

        <aside className="er-glass h-fit rounded-[2rem] p-6 lg:sticky lg:top-24">
          <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-accent uppercase">
            Studio note
          </p>
          <p className="mt-4 font-display text-2xl font-semibold tracking-tight text-foreground">
            Preferences here are visual.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Theme toggle writes to local preference. Account session, sign-out,
            and profile actions remain entirely inside AccountMenu.
          </p>
        </aside>
      </div>
    </WorkspaceCanvas>
  );
}
