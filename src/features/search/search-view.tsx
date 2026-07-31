"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { IconSearch, IconSpark } from "@/components/icons/dashboard-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/constants";
import { getImportOwnerId } from "@/features/import/utils/pdf-upload-store";

const SUGGESTIONS = [
  "Continue listening",
  "Bengali summaries",
  "Long PDFs",
  "YouTube imports",
  "Unread documents",
] as const;

type SearchHit = {
  documentId: string;
  filename: string;
  sourceFormat: string | null;
  snippet: string;
  matchSource: string;
  languageCode: string;
};

export function SearchView() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const trimmedQuery = query.trim();
  const visibleHits = trimmedQuery ? hits : [];

  useEffect(() => {
    if (!trimmedQuery) {
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const response = await fetch(
            `/api/search?ownerId=${encodeURIComponent(getImportOwnerId())}&q=${encodeURIComponent(trimmedQuery)}`,
          );
          const payload = (await response.json()) as {
            ok?: boolean;
            hits?: SearchHit[];
          };
          setHits(payload.ok && payload.hits ? payload.hits : []);
        } catch {
          setHits([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [trimmedQuery]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Search"
        description="Find documents, notes, and AI sessions across EchoReadly."
        breadcrumbs={[
          { label: "Home", href: ROUTES.dashboard },
          { label: "Search" },
        ]}
      />

      <Card padding="lg">
        <label className="block">
          <span className="sr-only">Global search</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search library, history, and AI…"
            leftSlot={<IconSearch />}
            className="h-12 text-base"
            autoFocus
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setQuery(suggestion)}
              className="rounded-full border border-border bg-surface-muted/50 px-3 py-1.5 text-xs text-muted transition hover:border-accent/40 hover:text-foreground"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent searches"
            description="Quickly repeat what you looked for before."
          />
          <EmptyState
            title="No recent searches"
            description="Your last queries will show here for one-click reuse."
            className="py-10"
          />
        </Card>
        <Card>
          <CardHeader
            title="Suggested searches"
            description="Starting points while your library is empty."
            action={<Badge tone="accent">Tips</Badge>}
          />
          <ul className="space-y-2 p-0">
            {SUGGESTIONS.map((suggestion) => (
              <li key={suggestion}>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  leftIcon={<IconSpark className="size-3.5" />}
                  onClick={() => setQuery(suggestion)}
                >
                  {suggestion}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Results" description="Matching documents and sessions." />
        {loading ? (
          <EmptyState
            icon={<IconSearch />}
            title="Searching…"
            description="Looking through originals, translations, and chunks."
            className="py-14"
          />
        ) : visibleHits.length > 0 ? (
          <ul className="space-y-2 p-0">
            {visibleHits.map((hit, index) => (
              <li
                key={`${hit.documentId}-${hit.matchSource}-${index}`}
                className="rounded-xl border border-border/70 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`${ROUTES.reader}?id=${encodeURIComponent(hit.documentId)}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {hit.filename}
                  </Link>
                  <Badge>{hit.sourceFormat || "Document"}</Badge>
                  <Badge tone="accent">{hit.matchSource}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{hit.snippet}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<IconSearch />}
            title={
              trimmedQuery
                ? `No results for “${trimmedQuery}”`
                : "Start typing to search"
            }
            description="Result cards will list title, source, tags, and last opened date."
            className="py-14"
          />
        )}
      </Card>
    </div>
  );
}
