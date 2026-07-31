"use client";

import { useState } from "react";

import {
  IconFile,
  IconGrid,
  IconList,
  IconSearch,
  IconStar,
} from "@/components/icons/dashboard-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dropdown, DropdownItem, SelectField } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/constants";
import { DocumentCard } from "@/features/library/document-card";
import { useLibraryDocuments } from "@/features/library/hooks/use-library-documents";
import { formatFileSize } from "@/features/import/utils/format-file-size";
import { cn } from "@/utils";

function formatUploadedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function LibraryView() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [filter, setFilter] = useState("all");
  const { documents, loading, error } = useLibraryDocuments();

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = documents.filter((document) => {
    if (filter === "pdf" && document.mimeType !== "application/pdf") {
      return false;
    }
    if (filter === "web" || filter === "youtube" || filter === "favorites") {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    return (
      document.filename.toLowerCase().includes(normalizedQuery) ||
      document.originalFilename.toLowerCase().includes(normalizedQuery)
    );
  });

  const sorted = [...filtered].sort((left, right) => {
    if (sort === "oldest") {
      return left.uploadedAt.localeCompare(right.uploadedAt);
    }
    if (sort === "title") {
      return left.filename.localeCompare(right.filename);
    }
    if (sort === "duration") {
      return right.fileSize - left.fileSize;
    }
    return right.uploadedAt.localeCompare(left.uploadedAt);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library"
        description="Search, sort, and browse every imported document."
        breadcrumbs={[
          { label: "Home", href: ROUTES.dashboard },
          { label: "Library" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <IconGrid />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <IconList />
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, tag, or language…"
            leftSlot={<IconSearch />}
            aria-label="Search library"
          />
        </div>
        <SelectField
          label="Sort"
          value={sort}
          onChange={setSort}
          className="lg:w-44"
          options={[
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
            { value: "title", label: "Title" },
            { value: "duration", label: "Duration" },
          ]}
        />
        <SelectField
          label="Filter"
          value={filter}
          onChange={setFilter}
          className="lg:w-44"
          options={[
            { value: "all", label: "All sources" },
            { value: "pdf", label: "PDF" },
            { value: "web", label: "Websites" },
            { value: "youtube", label: "YouTube" },
            { value: "favorites", label: "Favorites" },
          ]}
        />
        <Dropdown label="Bulk actions" align="right">
          <DropdownItem>Multi select</DropdownItem>
          <DropdownItem>Rename</DropdownItem>
          <DropdownItem>Duplicate</DropdownItem>
          <DropdownItem>Delete</DropdownItem>
        </Dropdown>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge>Tags</Badge>
        <Badge tone="accent">Favorites</Badge>
        <Badge>Language</Badge>
        <Badge>Duration</Badge>
      </div>

      {loading ? (
        <EmptyState
          icon={<IconFile />}
          title="Loading library"
          description="Fetching your uploaded documents."
        />
      ) : error ? (
        <EmptyState
          icon={<IconFile />}
          title="Unable to load library"
          description={error}
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<IconFile />}
          title="No documents in your library"
          description="Document cards will show a thumbnail, title, language, duration, created date, tags, and favorite controls."
          action={
            <Button
              variant="secondary"
              leftIcon={<IconStar className="size-3.5" />}
            >
              Mark favorites later
            </Button>
          }
        />
      ) : (
        <div
          className={cn(
            "grid gap-3",
            view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1",
          )}
        >
          {sorted.map((document) => (
            <DocumentCard
              key={document.id}
              title={document.filename}
              language="PDF"
              duration={formatFileSize(document.fileSize)}
              createdAt={formatUploadedAt(document.uploadedAt)}
              tags={[document.processingStatus]}
              layout={view}
            />
          ))}
        </div>
      )}

      <Card>
        <p className="text-sm text-muted">
          Pagination controls will appear here when your library grows. Grid and
          list layouts are ready via the view toggles above.
        </p>
      </Card>
    </div>
  );
}
