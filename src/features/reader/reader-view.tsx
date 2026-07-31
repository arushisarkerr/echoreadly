import {
  IconReader,
  IconSearch,
} from "@/components/icons/dashboard-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/constants";

const SIDE_PANELS = [
  "Table of contents",
  "Bookmarks",
  "Highlights",
  "Notes",
  "Metadata",
  "Reading time",
  "Smart chapters",
] as const;

export function ReaderView() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reader"
        description="A focused reading layout with room for navigation and annotations."
        breadcrumbs={[
          { label: "Home", href: ROUTES.dashboard },
          { label: "Reader" },
        ]}
        actions={
          <Button variant="outline" leftIcon={<IconSearch className="size-3.5" />}>
            Search in document
          </Button>
        }
      />

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Document header
            </h2>
            <Badge>Untitled</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            Title, source, and reading controls will sit here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm">
            Contents
          </Button>
          <Button variant="ghost" size="sm">
            Notes
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[16rem_minmax(0,1fr)_16rem]">
        <Card>
          <CardHeader title="Contents" description="Chapter outline placeholder." />
          <EmptyState
            title="No chapters yet"
            description="A table of contents will appear for long documents."
            className="py-8"
          />
        </Card>

        <Card padding="lg" className="min-h-[28rem]">
          <EmptyState
            icon={<IconReader />}
            title="Open a document to read"
            description="The reading area stays wide and quiet — search, bookmarks, and highlights attach around it."
            className="min-h-[22rem] border-0 bg-transparent py-16"
          />
        </Card>

        <Card>
          <CardHeader title="Annotations" description="Side tools for deep reading." />
          <ul className="space-y-2 p-0">
            {SIDE_PANELS.map((panel) => (
              <li
                key={panel}
                className="rounded-xl border border-border/70 bg-surface-muted/40 px-3 py-2.5 text-sm text-muted"
              >
                {panel}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
