"use client";

import { ImportSourceCards } from "@/features/import/components/import-source-cards";
import { LinkImportPanel } from "@/features/import/components/link-import-panel";
import { PdfImportPanel } from "@/features/import/components/pdf-import-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { ROUTES } from "@/constants";

const FORMATS = [
  { label: "PDF", available: true },
  { label: "DOC", available: false },
  { label: "DOCX", available: true },
  { label: "TXT", available: true },
  { label: "Markdown", available: false },
  { label: "EPUB", available: true },
  { label: "Website URL", available: true },
  { label: "Blog URL", available: true },
  { label: "YouTube URL", available: true },
  { label: "OCR", available: true },
] as const;

export function ImportView() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Import"
        description="Drop files or paste a link. Every source uses the same import pipeline."
        breadcrumbs={[
          { label: "Home", href: ROUTES.dashboard },
          { label: "Import" },
        ]}
      />

      <ImportSourceCards />

      <Tabs defaultValue="files">
        <TabsList>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="ocr">OCR</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="mt-5 space-y-5">
          <PdfImportPanel />
        </TabsContent>

        <TabsContent value="links" className="mt-5 space-y-5">
          <LinkImportPanel />
        </TabsContent>

        <TabsContent value="ocr" className="mt-5">
          <PdfImportPanel preferOcr />
        </TabsContent>
      </Tabs>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Supported formats
        </h2>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((format) => (
            <Badge
              key={format.label}
              tone={format.available ? "accent" : "neutral"}
            >
              {format.label}
              {!format.available ? " · Coming Soon" : ""}
            </Badge>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader
          title="Import history"
          description="A chronological list of recent imports will appear here."
        />
        <EmptyState
          title="No imports yet"
          description="Once imports begin, you’ll see status, source type, and timestamps in this list."
          className="py-12"
        />
      </Card>
    </div>
  );
}
