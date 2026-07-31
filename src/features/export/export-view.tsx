import {
  IconExport,
  IconFile,
  IconListen,
  IconSpark,
} from "@/components/icons/dashboard-icons";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/constants";

const EXPORT_OPTIONS = [
  {
    title: "Export audio",
    description: "Download narration as an audio file.",
    icon: IconListen,
  },
  {
    title: "Export text",
    description: "Save cleaned document text for reuse.",
    icon: IconFile,
  },
  {
    title: "Export summary",
    description: "Share a concise summary of the document.",
    icon: IconSpark,
  },
  {
    title: "Export notes",
    description: "Bundle highlights and notes into one file.",
    icon: IconExport,
  },
] as const;

export function ExportView() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Export"
        description="Prepare audio, text, summaries, and notes for download."
        breadcrumbs={[
          { label: "Home", href: ROUTES.dashboard },
          { label: "Export" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {EXPORT_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <Card key={option.title} interactive>
              <div className="flex items-start gap-4">
                <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-muted text-foreground">
                  <Icon />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base font-semibold text-foreground">
                    {option.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted">{option.description}</p>
                  <Button variant="outline" size="sm" className="mt-4">
                    Prepare export
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader
          title="Recent exports"
          description="A downloadable history of completed exports."
        />
        <EmptyState
          icon={<IconExport />}
          title="No exports yet"
          description="Completed audio and text exports will list here with timestamps and formats."
          className="py-12"
        />
      </Card>
    </div>
  );
}
