"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

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
import { SelectField } from "@/components/ui/dropdown";
import { ROUTES } from "@/constants";
import { TRANSLATION_LANGUAGES } from "@/constants/languages";
import { getImportOwnerId } from "@/features/import/utils/pdf-upload-store";

const TEXT_FORMATS = [
  { format: "txt", title: "Export TXT", description: "Plain text file." },
  { format: "md", title: "Export Markdown", description: "Markdown document." },
  { format: "docx", title: "Export DOCX", description: "Word-compatible document." },
  { format: "pdf", title: "Export PDF", description: "Portable PDF document." },
] as const;

type ExportRow = {
  id: string;
  filename: string;
  format: string;
  languageCode: string;
  createdAt: string;
};

export function ExportView() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get("id")?.trim() ?? "";
  const [languageCode, setLanguageCode] = useState("original");
  const [busyFormat, setBusyFormat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<ExportRow[]>([]);

  async function loadRecent() {
    try {
      const response = await fetch(
        `/api/documents/export?ownerId=${encodeURIComponent(getImportOwnerId())}`,
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        exports?: ExportRow[];
      };
      if (payload.ok && payload.exports) {
        setRecent(payload.exports);
      }
    } catch {
      // keep empty
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/documents/export?ownerId=${encodeURIComponent(getImportOwnerId())}`,
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          exports?: ExportRow[];
        };
        if (!cancelled && payload.ok && payload.exports) {
          setRecent(payload.exports);
        }
      } catch {
        // keep empty
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function prepareExport(format: string) {
    if (!documentId) {
      setError("Open Export from a Library/Reader document (?id=…).");
      return;
    }
    setBusyFormat(format);
    setError(null);
    try {
      const response = await fetch("/api/documents/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: getImportOwnerId(),
          documentId,
          format,
          languageCode,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        downloadUrl?: string | null;
        dataUrl?: string;
        filename?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Export failed.");
      }
      const href = payload.downloadUrl || payload.dataUrl;
      if (href) {
        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.download = payload.filename || `export.${format}`;
        anchor.click();
      }
      await loadRecent();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export failed.");
    } finally {
      setBusyFormat(null);
    }
  }

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

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <SelectField
            label="Content language"
            value={languageCode}
            onChange={setLanguageCode}
            options={[
              { value: "original", label: "Original" },
              ...TRANSLATION_LANGUAGES.map((item) => ({
                value: item.code,
                label: item.label,
              })),
            ]}
          />
        </div>
        <p className="text-sm text-muted sm:pb-2">
          {documentId
            ? `Document ${documentId.slice(0, 8)}…`
            : "Pass ?id=documentId from Library/Reader."}
        </p>
      </Card>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card interactive>
          <div className="flex items-start gap-4">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-muted text-foreground">
              <IconListen />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-base font-semibold text-foreground">
                Export audio
              </h3>
              <p className="mt-1 text-sm text-muted">
                Generate and download narration from Listen.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                disabled={busyFormat === "mp3"}
                onClick={() => {
                  void prepareExport("mp3");
                }}
              >
                {busyFormat === "mp3" ? "Preparing…" : "Prepare export"}
              </Button>
            </div>
          </div>
        </Card>

        {TEXT_FORMATS.map((option) => (
          <Card key={option.format} interactive>
            <div className="flex items-start gap-4">
              <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-muted text-foreground">
                <IconFile />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base font-semibold text-foreground">
                  {option.title}
                </h3>
                <p className="mt-1 text-sm text-muted">{option.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  disabled={busyFormat === option.format}
                  onClick={() => {
                    void prepareExport(option.format);
                  }}
                >
                  {busyFormat === option.format
                    ? "Preparing…"
                    : "Prepare export"}
                </Button>
              </div>
            </div>
          </Card>
        ))}

        <Card interactive>
          <div className="flex items-start gap-4">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-muted text-foreground">
              <IconSpark />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-base font-semibold text-foreground">
                Export summary
              </h3>
              <p className="mt-1 text-sm text-muted">
                Share a concise summary of the document.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  window.location.href = documentId
                    ? `${ROUTES.ai}?id=${encodeURIComponent(documentId)}`
                    : ROUTES.ai;
                }}
              >
                Open AI
              </Button>
            </div>
          </div>
        </Card>

        <Card interactive>
          <div className="flex items-start gap-4">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-muted text-foreground">
              <IconExport />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-base font-semibold text-foreground">
                Export notes
              </h3>
              <p className="mt-1 text-sm text-muted">
                Bundle highlights and notes into one file.
              </p>
              <Button variant="outline" size="sm" className="mt-4" disabled>
                Coming later
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recent exports"
          description="A downloadable history of completed exports."
        />
        {recent.length === 0 ? (
          <EmptyState
            icon={<IconExport />}
            title="No exports yet"
            description="Completed audio and text exports will list here with timestamps and formats."
            className="py-12"
          />
        ) : (
          <ul className="space-y-2 p-0">
            {recent.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-border/70 bg-surface-muted/40 px-3 py-2.5 text-sm"
              >
                <span className="font-medium text-foreground">{item.filename}</span>
                <span className="ml-2 text-muted">
                  {item.format.toUpperCase()} · {item.languageCode} ·{" "}
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
