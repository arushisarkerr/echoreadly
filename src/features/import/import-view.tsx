"use client";

import { useState } from "react";

import {
  IconFile,
  IconLink,
} from "@/components/icons/dashboard-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { ImportSourceCards } from "@/features/import/components/import-source-cards";
import { PdfImportPanel } from "@/features/import/components/pdf-import-panel";
import { ROUTES } from "@/constants";

const FORMATS = [
  { label: "PDF", available: true },
  { label: "DOC", available: false },
  { label: "DOCX", available: false },
  { label: "TXT", available: false },
  { label: "Markdown", available: false },
  { label: "EPUB", available: false },
  { label: "Website URL", available: false },
  { label: "Blog URL", available: false },
  { label: "YouTube URL", available: false },
  { label: "OCR", available: false },
] as const;

export function ImportView() {
  const [url, setUrl] = useState("");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Import"
        description="Drop files or paste a link. Everything stays in the UI until a backend is connected."
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
          <Card className="opacity-70">
            <CardHeader
              title="Import from the web"
              description="Website, blog, or YouTube URLs."
              action={<Badge>Coming Soon</Badge>}
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <Input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://…"
                  leftSlot={<IconLink />}
                  aria-label="Import URL"
                  disabled
                />
              </div>
              <Button disabled>Add link</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ocr" className="mt-5">
          <Card className="opacity-70">
            <CardHeader
              title="OCR import"
              description="Scan image-based documents into readable text later."
              action={<Badge>Coming Soon</Badge>}
            />
            <EmptyState
              icon={<IconFile />}
              title="OCR is coming soon"
              description="The surface is ready for scanned PDFs and image pages when processing is connected."
              className="py-12"
            />
          </Card>
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
