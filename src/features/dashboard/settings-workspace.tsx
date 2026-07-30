"use client";

import Link from "next/link";

import { ROUTES } from "@/constants";
import { AccountMenu } from "@/features/auth";
import { ThemeToggle } from "@/features/dashboard/theme-toggle";
import { WorkspaceCanvas } from "@/features/dashboard/workspace-canvas";
import { useVoicePreference } from "@/features/tts/use-voice-preference";

/**
 * Settings atelier — appearance, voice preference link, and account.
 */
export function SettingsWorkspace() {
  const { selectedDefinition, loading } = useVoicePreference();

  return (
    <WorkspaceCanvas
      kicker="Settings"
      title="Tune the workspace."
      description="Appearance and your preferred studio voice are live. Notifications and billing remain planned. Authentication stays on AccountMenu."
      actionHref={ROUTES.dashboard}
      actionLabel="Back to Home"
      wide={false}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <ul className="list-none space-y-3 p-0">
          <li>
            <article className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5">
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                Appearance
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Light, dark, or follow the system — live theme control below.
              </p>
              <div className="mt-4">
                <ThemeToggle />
              </div>
            </article>
          </li>
          <li>
            <article className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5">
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                Voices
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Preferred narrator for page and summary listening.
              </p>
              <p className="mt-3 text-sm font-semibold text-foreground">
                {loading ? "Loading…" : `Current: ${selectedDefinition.name}`}
              </p>
              <Link
                href={ROUTES.voices}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-xs font-semibold text-background no-underline"
              >
                Manage voices
              </Link>
            </article>
          </li>
          <li>
            <article className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5">
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                Notifications · Coming soon
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Export-ready and processing alerts are planned — not wired yet.
              </p>
            </article>
          </li>
          <li>
            <article className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5">
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                Billing · Planned
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Plan and invoices — linked when billing ships.
              </p>
            </article>
          </li>
          <li>
            <article className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5">
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                Profile
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Account identity stays in AccountMenu — auth unchanged.
              </p>
              <div className="mt-4 max-w-xs">
                <AccountMenu />
              </div>
            </article>
          </li>
        </ul>

        <aside className="er-glass h-fit rounded-[2rem] p-6 lg:sticky lg:top-24">
          <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-accent uppercase">
            Studio note
          </p>
          <p className="mt-4 font-display text-2xl font-semibold tracking-tight text-foreground">
            Voice changes apply next listen.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Theme writes locally. Your narrator preference is saved to your
            account and used for every new page or summary narration.
          </p>
        </aside>
      </div>
    </WorkspaceCanvas>
  );
}
