"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { SelectField } from "@/components/ui/dropdown";
import { ROUTES } from "@/constants";
import { TRANSLATION_LANGUAGES } from "@/constants/languages";
import { labelForMimeType } from "@/features/import/formats/registry";
import { getImportOwnerId } from "@/features/import/utils/pdf-upload-store";
import type { DocumentRecord } from "@/features/library/types";
import { processingStatusLabel } from "@/features/library/status-labels";
import { processingStageLabel } from "@/features/processing/stages";

const SIDE_PANELS = [
  "Table of contents",
  "Bookmarks",
  "Highlights",
  "Notes",
  "Metadata",
  "Reading time",
  "Smart chapters",
] as const;

type TranslationItem = {
  id: string;
  languageCode: string;
  languageLabel: string;
  text: string;
  status: string;
};

/**
 * Shared Reader for every import source — original + translation switcher.
 */
export function ReaderView() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get("id")?.trim() ?? "";
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [translations, setTranslations] = useState<TranslationItem[]>([]);
  const [language, setLanguage] = useState("original");
  const [loading, setLoading] = useState(Boolean(documentId));
  const [translating, setTranslating] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadedDocumentId, setLoadedDocumentId] = useState(documentId);

  // Reset reader state when the route document id changes (render-time sync).
  if (documentId !== loadedDocumentId) {
    setLoadedDocumentId(documentId);
    setDocument(null);
    setTranslations([]);
    setLanguage("original");
    setLoading(Boolean(documentId));
    setError(null);
    setActionError(null);
  }

  async function loadDocument() {
    if (!documentId) {
      setDocument(null);
      setTranslations([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const ownerId = getImportOwnerId();

    try {
      const [docResponse, translationResponse] = await Promise.all([
        fetch(
          `/api/library/documents/${encodeURIComponent(documentId)}?ownerId=${encodeURIComponent(ownerId)}`,
          { cache: "no-store" },
        ),
        fetch(
          `/api/documents/translate?ownerId=${encodeURIComponent(ownerId)}&documentId=${encodeURIComponent(documentId)}`,
          { cache: "no-store" },
        ),
      ]);

      const docPayload = (await docResponse.json()) as {
        ok?: boolean;
        document?: DocumentRecord;
        error?: string;
      };
      if (!docResponse.ok || !docPayload.ok || !docPayload.document) {
        throw new Error(docPayload.error || "Unable to load document.");
      }

      const translationPayload = (await translationResponse.json()) as {
        ok?: boolean;
        translations?: TranslationItem[];
      };

      setDocument(docPayload.document);
      setTranslations(translationPayload.translations ?? []);
      setLoading(false);
    } catch (cause) {
      setDocument(null);
      setLoading(false);
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "Unable to load document.",
      );
    }
  }

  useEffect(() => {
    if (!documentId) {
      return;
    }

    let cancelled = false;

    async function load() {
      const ownerId = getImportOwnerId();

      try {
        const [docResponse, translationResponse] = await Promise.all([
          fetch(
            `/api/library/documents/${encodeURIComponent(documentId)}?ownerId=${encodeURIComponent(ownerId)}`,
            { cache: "no-store" },
          ),
          fetch(
            `/api/documents/translate?ownerId=${encodeURIComponent(ownerId)}&documentId=${encodeURIComponent(documentId)}`,
            { cache: "no-store" },
          ),
        ]);

        const docPayload = (await docResponse.json()) as {
          ok?: boolean;
          document?: DocumentRecord;
          error?: string;
        };
        if (!docResponse.ok || !docPayload.ok || !docPayload.document) {
          throw new Error(docPayload.error || "Unable to load document.");
        }

        const translationPayload = (await translationResponse.json()) as {
          ok?: boolean;
          translations?: TranslationItem[];
        };

        if (cancelled) {
          return;
        }

        setDocument(docPayload.document);
        setTranslations(translationPayload.translations ?? []);
        setLoading(false);
      } catch (cause) {
        if (cancelled) {
          return;
        }
        setDocument(null);
        setLoading(false);
        setError(
          cause instanceof Error && cause.message
            ? cause.message
            : "Unable to load document.",
        );
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const activeDocument = documentId ? document : null;
  const activeTranslations = useMemo(
    () => (documentId ? translations : []),
    [documentId, translations],
  );
  const activeLoading = Boolean(documentId) && loading;
  const activeError = documentId ? error : null;

  const languageOptions = useMemo(() => {
    const options = [{ value: "original", label: "Original" }];
    for (const item of activeTranslations) {
      if (item.status === "ready") {
        options.push({
          value: item.languageCode,
          label: item.languageLabel,
        });
      }
    }
    return options;
  }, [activeTranslations]);

  const bodyText = useMemo(() => {
    if (!activeDocument) {
      return "";
    }
    if (language === "original") {
      return activeDocument.extractedText?.trim() || "";
    }
    return (
      activeTranslations
        .find((item) => item.languageCode === language)
        ?.text.trim() || ""
    );
  }, [activeDocument, language, activeTranslations]);

  const sourceLabel = activeDocument
    ? labelForMimeType(activeDocument.mimeType, activeDocument.sourceFormat)
    : "Untitled";

  async function handleTranslate(targetCode: string) {
    if (!documentId || !targetCode) {
      return;
    }
    setTranslating(true);
    setActionError(null);
    try {
      const response = await fetch("/api/documents/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: getImportOwnerId(),
          documentId,
          languageCode: targetCode,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        translation?: TranslationItem;
      };
      if (!response.ok || !payload.ok || !payload.translation) {
        throw new Error(payload.error || "Translation failed.");
      }
      setTranslations((current) => {
        const without = current.filter(
          (item) => item.languageCode !== payload.translation!.languageCode,
        );
        return [...without, payload.translation!];
      });
      setLanguage(payload.translation.languageCode);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Translation failed.",
      );
    } finally {
      setTranslating(false);
    }
  }

  async function handleRetry() {
    if (!documentId) {
      return;
    }
    setRetrying(true);
    setActionError(null);
    try {
      const response = await fetch("/api/documents/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: getImportOwnerId(),
          documentId,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Retry failed.");
      }
      await loadDocument();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Retry failed.");
    } finally {
      setRetrying(false);
    }
  }

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
              {activeDocument?.filename || "Document header"}
            </h2>
            <Badge>{sourceLabel}</Badge>
            {activeDocument ? (
              <Badge tone="accent">
                {processingStatusLabel(activeDocument.processingStatus)}
              </Badge>
            ) : null}
            {activeDocument?.processingStage &&
            activeDocument.processingStatus === "processing" ? (
              <Badge>
                {processingStageLabel(activeDocument.processingStage)}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted">
            {activeDocument?.sourceUrl ||
              "Title, source, and reading controls will sit here."}
          </p>
          {activeDocument?.processingError ? (
            <p className="mt-2 text-sm text-danger" role="alert">
              {activeDocument.processingError}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm">
            Contents
          </Button>
          <Button variant="ghost" size="sm">
            Notes
          </Button>
          {documentId ? (
            <>
              <Link href={`${ROUTES.listen}?id=${encodeURIComponent(documentId)}`}>
                <Button variant="outline" size="sm">
                  Listen
                </Button>
              </Link>
              <Link href={`${ROUTES.export}?id=${encodeURIComponent(documentId)}`}>
                <Button variant="outline" size="sm">
                  Export
                </Button>
              </Link>
              <Link href={`${ROUTES.ai}?id=${encodeURIComponent(documentId)}`}>
                <Button variant="outline" size="sm">
                  AI
                </Button>
              </Link>
            </>
          ) : null}
          {activeDocument?.processingStatus === "failed" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={retrying}
              onClick={() => {
                void handleRetry();
              }}
            >
              {retrying ? "Retrying…" : "Retry"}
            </Button>
          ) : null}
        </div>
      </Card>

      {documentId ? (
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <SelectField
              label="Language"
              value={language}
              onChange={setLanguage}
              options={languageOptions}
            />
          </div>
          <div className="flex-1">
            <SelectField
              label="Translate to"
              value="__choose__"
              onChange={(value) => {
                if (value && value !== "__choose__") {
                  void handleTranslate(value);
                }
              }}
              options={[
                {
                  value: "__choose__",
                  label: translating ? "Translating…" : "Choose language",
                },
                ...TRANSLATION_LANGUAGES.map((item) => ({
                  value: item.code,
                  label: item.label,
                })),
              ]}
            />
          </div>
          {actionError ? (
            <p className="w-full text-sm text-danger" role="alert">
              {actionError}
            </p>
          ) : null}
        </Card>
      ) : null}

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
          ) : activeLoading ? (
            <EmptyState
              icon={<IconReader />}
              title="Loading document"
              description="Fetching extracted text for this import."
              className="min-h-[22rem] border-0 bg-transparent py-16"
            />
          ) : activeError ? (
            <EmptyState
              icon={<IconReader />}
              title="Unable to open document"
              description={activeError}
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
