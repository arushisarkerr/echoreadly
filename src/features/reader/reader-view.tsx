"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

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
import { labelForMimeType } from "@/features/import/formats/registry";
import { getImportOwnerId } from "@/features/import/utils/pdf-upload-store";
import type { DocumentRecord } from "@/features/library/types";
import { processingStatusLabel } from "@/features/library/status-labels";

const SIDE_PANELS = [
  "Table of contents",
  "Bookmarks",
  "Highlights",
  "Notes",
  "Metadata",
  "Reading time",
  "Smart chapters",
] as const;

/**
 * Shared Reader for every import source — displays extracted text.
 */
export function ReaderView() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get("id")?.trim() ?? "";
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(Boolean(documentId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!documentId) {
        setDocument(null);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const ownerId = getImportOwnerId();
        const response = await fetch(
          `/api/library/documents/${encodeURIComponent(documentId)}?ownerId=${encodeURIComponent(ownerId)}`,
          { method: "GET", cache: "no-store" },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          document?: DocumentRecord;
          error?: string;
        };

        if (!response.ok || !payload.ok || !payload.document) {
          throw new Error(payload.error || "Unable to load document.");
        }

        if (!cancelled) {
          setDocument(payload.document);
          setLoading(false);
        }
      } catch (cause) {
        if (!cancelled) {
          setDocument(null);
          setLoading(false);
          setError(
            cause instanceof Error && cause.message
              ? cause.message
              : "Unable to load document.",
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const sourceLabel = document
    ? labelForMimeType(document.mimeType, document.sourceFormat)
    : "Untitled";
  const bodyText = document?.extractedText?.trim() || "";

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
              {document?.filename || "Document header"}
            </h2>
            <Badge>{sourceLabel}</Badge>
            {document ? (
              <Badge tone="accent">
                {processingStatusLabel(document.processingStatus)}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted">
            {document?.sourceUrl ||
              "Title, source, and reading controls will sit here."}
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
          {!documentId ? (
            <EmptyState
              icon={<IconReader />}
              title="Open a document to read"
              description="The reading area stays wide and quiet — search, bookmarks, and highlights attach around it."
              className="min-h-[22rem] border-0 bg-transparent py-16"
            />
          ) : loading ? (
            <EmptyState
              icon={<IconReader />}
              title="Loading document"
              description="Fetching extracted text for this import."
              className="min-h-[22rem] border-0 bg-transparent py-16"
            />
          ) : error ? (
            <EmptyState
              icon={<IconReader />}
              title="Unable to open document"
              description={error}
              className="min-h-[22rem] border-0 bg-transparent py-16"
            />
          ) : !bodyText ? (
            <EmptyState
              icon={<IconReader />}
              title="No extracted text yet"
              description="Processing may still be running, or extraction failed for this source."
              className="min-h-[22rem] border-0 bg-transparent py-16"
            />
          ) : (
            <article className="prose prose-neutral max-w-none whitespace-pre-wrap text-sm leading-7 text-foreground">
              {bodyText}
            </article>
          )}
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
