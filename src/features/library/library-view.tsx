"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

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
import { Dialog } from "@/components/ui";
import { Dropdown, DropdownItem, SelectField } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/constants";
import { labelForMimeType } from "@/features/import/formats/registry";
import { formatFileSize } from "@/features/import/utils/format-file-size";
import { DocumentCard } from "@/features/library/document-card";
import { useLibraryDocuments } from "@/features/library/hooks/use-library-documents";
import { processingStatusLabel } from "@/features/library/status-labels";
import { cn } from "@/utils";

const LIBRARY_VIEW_KEY = "echoreadly-library-view";

type LibraryViewMode = "grid" | "list";

const viewListeners = new Set<() => void>();

function emitViewChange() {
  viewListeners.forEach((listener) => listener());
}

function readStoredView(): LibraryViewMode {
  if (typeof window === "undefined") {
    return "list";
  }
  try {
    const stored = window.localStorage.getItem(LIBRARY_VIEW_KEY);
    if (stored === "grid" || stored === "list") {
      return stored;
    }
  } catch {
    // Ignore storage failures; fall back to List.
  }
  return "list";
}

function subscribeView(listener: () => void) {
  viewListeners.add(listener);
  return () => {
    viewListeners.delete(listener);
  };
}

function writeStoredView(view: LibraryViewMode) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(LIBRARY_VIEW_KEY, view);
  } catch {
    // Preference persistence is best-effort.
  }
  emitViewChange();
}

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
  const router = useRouter();
  const view = useSyncExternalStore(
    subscribeView,
    readStoredView,
    (): LibraryViewMode => "list",
  );
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [filter, setFilter] = useState("all");
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { documents, loading, error, deleting, deleteDocuments } =
    useLibraryDocuments();

  function changeView(next: LibraryViewMode) {
    writeStoredView(next);
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = documents.filter((document) => {
    const source = document.sourceFormat ?? "";
    if (filter === "pdf") {
      const isPdf =
        source === "pdf" ||
        (!source && document.mimeType === "application/pdf");
      if (!isPdf) {
        return false;
      }
    }
    if (filter === "docx" && source !== "docx") {
      return false;
    }
    if (filter === "epub" && source !== "epub") {
      return false;
    }
    if (filter === "txt" && source !== "txt") {
      return false;
    }
    if (filter === "web" && source !== "website") {
      return false;
    }
    if (filter === "youtube" && source !== "youtube") {
      return false;
    }
    if (filter === "ocr" && source !== "ocr") {
      return false;
    }
    if (filter === "favorites") {
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

  const selectedCount = selectedIds.length;

  function toggleSelecting() {
    setSelecting((value) => {
      if (value) {
        setSelectedIds([]);
      }
      return !value;
    });
    setActionError(null);
  }

  function toggleSelected(documentId: string) {
    setSelectedIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId],
    );
  }

  async function handleDeleteOne(documentId: string) {
    setActionError(null);
    try {
      await deleteDocuments([documentId]);
      setSelectedIds((current) => current.filter((id) => id !== documentId));
    } catch (cause) {
      setActionError(
        cause instanceof Error && cause.message
          ? cause.message
          : "Unable to delete document.",
      );
    }
  }

  function requestBulkDelete() {
    if (!selecting) {
      setSelecting(true);
      setActionError("Select documents, then confirm delete.");
      return;
    }
    if (selectedCount === 0) {
      setActionError("Select at least one document to delete.");
      return;
    }
    setActionError(null);
    setConfirmBulkDelete(true);
  }

  async function confirmDeleteSelected() {
    setActionError(null);
    try {
      await deleteDocuments(selectedIds);
      setSelectedIds([]);
      setSelecting(false);
      setConfirmBulkDelete(false);
    } catch (cause) {
      setActionError(
        cause instanceof Error && cause.message
          ? cause.message
          : "Unable to delete documents.",
      );
      setConfirmBulkDelete(false);
    }
  }

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
              onClick={() => changeView("grid")}
            >
              <IconGrid />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => changeView("list")}
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
            { value: "docx", label: "DOCX" },
            { value: "epub", label: "EPUB" },
            { value: "txt", label: "TXT" },
            { value: "web", label: "Websites" },
            { value: "youtube", label: "YouTube" },
            { value: "ocr", label: "OCR" },
            { value: "favorites", label: "Favorites" },
          ]}
        />
        <Dropdown label="Bulk actions" align="right">
          <DropdownItem onClick={toggleSelecting}>
            {selecting ? "Cancel multi select" : "Multi select"}
          </DropdownItem>
          <DropdownItem>Rename</DropdownItem>
          <DropdownItem>Duplicate</DropdownItem>
          <DropdownItem onClick={requestBulkDelete}>Delete</DropdownItem>
        </Dropdown>
      </div>

      {selecting ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">
            {selectedCount} selected
          </Badge>
          <Button
            variant="danger"
            size="sm"
            disabled={selectedCount === 0 || deleting}
            onClick={requestBulkDelete}
          >
            Delete selected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={deleting}
            onClick={toggleSelecting}
          >
            Cancel
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Badge>Tags</Badge>
        <Badge tone="accent">Favorites</Badge>
        <Badge>Language</Badge>
        <Badge>Duration</Badge>
      </div>

      {actionError || error ? (
        <p className="text-sm text-danger" role="alert">
          {actionError || error}
        </p>
      ) : null}

      {loading ? (
        <EmptyState
          icon={<IconFile />}
          title="Loading library"
          description="Fetching your uploaded documents."
        />
      ) : error && documents.length === 0 ? (
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
            view === "grid"
              ? "sm:grid-cols-2 xl:grid-cols-6"
              : "grid-cols-1",
          )}
        >
          {sorted.map((document) => (
            <DocumentCard
              key={document.id}
              title={document.filename}
              language={labelForMimeType(
                document.mimeType,
                document.sourceFormat,
              )}
              duration={formatFileSize(document.fileSize)}
              createdAt={formatUploadedAt(document.uploadedAt)}
              tags={[processingStatusLabel(document.processingStatus)]}
              layout={view}
              selecting={selecting}
              selected={selectedIds.includes(document.id)}
              onToggleSelect={() => toggleSelected(document.id)}
              onOpen={() => {
                router.push(`${ROUTES.reader}?id=${encodeURIComponent(document.id)}`);
              }}
              onDelete={() => {
                void handleDeleteOne(document.id);
              }}
              deleteDisabled={deleting}
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

      <Dialog
        open={confirmBulkDelete}
        onClose={() => {
          if (!deleting) {
            setConfirmBulkDelete(false);
          }
        }}
        title="Delete selected documents?"
        description={`This permanently removes ${selectedCount} document${selectedCount === 1 ? "" : "s"} from your library and storage.`}
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="ghost"
            disabled={deleting}
            onClick={() => setConfirmBulkDelete(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={deleting || selectedCount === 0}
            onClick={() => {
              void confirmDeleteSelected();
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
