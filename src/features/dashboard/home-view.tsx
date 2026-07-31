import Link from "next/link";
import type { ReactNode } from "react";

import {
  IconExport,
  IconFile,
  IconImport,
  IconLibrary,
  IconListen,
  IconPlus,
  IconReader,
  IconSpark,
  IconStar,
  IconTranslate,
} from "@/components/icons/dashboard-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress";
import { ROUTES } from "@/constants";
import { siteConfig } from "@/config";

const QUICK_ACTIONS = [
  { label: "Import Content", href: ROUTES.import, icon: IconImport },
  { label: "Open Library", href: ROUTES.library, icon: IconLibrary },
  { label: "Continue Reading", href: ROUTES.reader, icon: IconReader },
  { label: "Continue Listening", href: ROUTES.listen, icon: IconListen },
  { label: "Ask AI", href: ROUTES.ai, icon: IconSpark },
  { label: "Translate", href: ROUTES.ai, icon: IconTranslate },
  { label: "Generate Summary", href: ROUTES.ai, icon: IconSpark },
  { label: "Export Audio", href: ROUTES.export, icon: IconExport },
] as const;

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-muted">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DashboardHomeView() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Welcome back"
        description={`${siteConfig.name} is ready when you are. Import something new, or pick up where you left off.`}
        breadcrumbs={[
          { label: "Home", href: ROUTES.dashboard },
          { label: "Dashboard" },
        ]}
        actions={
          <Link href={ROUTES.import}>
            <Button leftIcon={<IconPlus className="size-3.5" />}>
              Quick import
            </Button>
          </Link>
        }
      />

      <Card className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_color-mix(in_srgb,var(--accent)_18%,transparent),_transparent_55%)]"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <Badge tone="accent">Workspace</Badge>
            <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight text-foreground">
              Your listening desk
            </h2>
            <p className="mt-2 text-sm text-muted">
              A calm home for documents, audio, and AI tools. Everything below
              is ready for data once your backend is connected.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={ROUTES.library}>
              <Button variant="secondary">Browse library</Button>
            </Link>
            <Link href={ROUTES.listen}>
              <Button variant="outline">Open player</Button>
            </Link>
          </div>
        </div>
      </Card>

      <Section
        title="Quick actions"
        description="Start the most common flows in one click."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="group rounded-2xl border border-border/80 bg-surface/70 p-4 no-underline shadow-[var(--elevation-sm)] transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-[var(--elevation-md)]"
              >
                <span className="flex size-9 items-center justify-center rounded-xl border border-border bg-surface-muted text-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
                  <Icon />
                </span>
                <span className="mt-3 block text-sm font-semibold text-foreground">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Continue listening"
            description="Resume the last document you played."
            action={<Badge>Ready</Badge>}
          />
          <EmptyState
            icon={<IconListen />}
            title="Nothing playing yet"
            description="When you start listening, your current track and progress will appear here."
            action={
              <Link href={ROUTES.listen}>
                <Button variant="secondary" size="sm">
                  Open Listen
                </Button>
              </Link>
            }
            className="py-10"
          />
        </Card>

        <Card>
          <CardHeader
            title="Recent imports"
            description="Fresh files and URLs that just arrived."
            action={
              <Link
                href={ROUTES.import}
                className="text-xs font-semibold text-muted hover:text-foreground"
              >
                Import more
              </Link>
            }
          />
          <EmptyState
            icon={<IconImport />}
            title="No imports yet"
            description="New uploads will list here with source type and created date."
            className="py-10"
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Reading progress"
            description="Track how far you’ve read across documents."
          />
          <div className="space-y-4">
            <ProgressBar value={0} label="Overall reading progress" />
            <EmptyState
              icon={<IconReader />}
              title="No reading sessions"
              description="Open the reader to start a session. Progress bars will fill in automatically later."
              className="py-8"
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Listening progress"
            description="Audio completion across your library."
          />
          <div className="space-y-4">
            <ProgressBar value={0} label="Overall listening progress" />
            <EmptyState
              icon={<IconListen />}
              title="No listening sessions"
              description="Played tracks will contribute to listening progress here."
              className="py-8"
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent documents"
            description="Your latest files and imports."
            action={
              <Link href={ROUTES.library} className="text-xs font-semibold text-muted hover:text-foreground">
                View all
              </Link>
            }
          />
          <EmptyState
            icon={<IconFile />}
            title="Library is empty"
            description="Imported documents will show as cards with language, duration, and tags."
            action={
              <Link href={ROUTES.import}>
                <Button size="sm">Import your first file</Button>
              </Link>
            }
            className="py-10"
          />
        </Card>

        <Card>
          <CardHeader
            title="Pinned & favorites"
            description="Keep essentials one tap away."
          />
          <EmptyState
            icon={<IconStar />}
            title="No pins yet"
            description="Favorites and pinned items will live in this quiet side panel."
            className="py-10"
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent activity"
            description="Imports, listens, and reading events."
          />
          <EmptyState
            title="Quiet so far"
            description="A lightweight activity stream will appear here once events are available."
            className="py-10"
          />
        </Card>
        <Card>
          <CardHeader
            title="AI activity"
            description="Summaries, translations, and asks."
          />
          <EmptyState
            icon={<IconSpark />}
            title="No AI sessions"
            description="Recent AI runs will land here for quick revisit."
            className="py-10"
          />
        </Card>
      </div>
    </div>
  );
}
