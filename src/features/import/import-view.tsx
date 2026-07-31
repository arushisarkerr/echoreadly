"use client";

import { useState } from "react";

import {
  IconFile,
  IconImport,
  IconLink,
} from "@/components/icons/dashboard-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { ROUTES } from "@/constants";

const FORMATS = [
  "PDF",
  "DOC",
  "DOCX",
  "TXT",
  "Markdown",
  "EPUB",
  "Website URL",
  "Blog URL",
  "YouTube URL",
  "OCR",
] as const;

export function ImportView() {
  const [dragging, setDragging] = useState(false);
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

      <Tabs defaultValue="files">
        <TabsList>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="ocr">OCR</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="mt-5 space-y-5">
          <Card
            padding="lg"
            className={
              dragging
                ? "border-accent bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface))]"
                : undefined
            }
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
            }}
          >
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-surface-muted text-foreground">
                <IconImport className="size-5" />
              </div>
              <h2 className="font-display mt-5 text-xl font-semibold text-foreground">
                Drop files to import
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted">
                PDF, DOC, DOCX, TXT, Markdown, and EPUB are welcome. This area is
                visual-only for now.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <Button leftIcon={<IconFile className="size-3.5" />}>
                  Choose files
                </Button>
                <Button variant="outline">Browse samples</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="mt-5 space-y-5">
          <Card>
            <CardHeader
              title="Import from the web"
              description="Website, blog, or YouTube URLs."
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <Input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://…"
                  leftSlot={<IconLink />}
                  aria-label="Import URL"
                />
              </div>
              <Button>Add link</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ocr" className="mt-5">
          <Card>
            <CardHeader
              title="OCR import"
              description="Scan image-based documents into readable text later."
            />
            <EmptyState
              icon={<IconFile />}
              title="OCR is a placeholder"
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
            <Badge key={format} tone="neutral">
              {format}
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
