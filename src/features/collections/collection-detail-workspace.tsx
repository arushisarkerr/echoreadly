"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ROUTES, readerPathForStorage } from "@/constants";
import { useLibrary } from "@/features/library";
import { formatFileSize } from "@/utils";

import {
  listCollections,
  toCollectionStoragePath,
} from "./collections-service";
import { useCollection } from "./use-collection";
import type { CollectionSummary } from "./types";

type CollectionDetailWorkspaceProps = {
  collectionId: string;
};

/**
 * Opened collection — membership add/remove/move against the library shelf.
 */
export function CollectionDetailWorkspace({
  collectionId,
}: CollectionDetailWorkspaceProps) {
  const {
    collection,
    members,
    loading,
    error,
    refresh,
    addDocument,
    removeDocument,
    moveDocument,
  } = useCollection(collectionId);
  const { items: libraryItems, loading: libraryLoading } = useLibrary();
  const [otherCollections, setOtherCollections] = useState<CollectionSummary[]>(
    [],
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<Record<string, string>>({});
  const [addingPath, setAddingPath] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    void listCollections().then((result) => {
      if (cancelled || !result.ok) {
        return;
      }
      setOtherCollections(
        result.data.filter((entry) => entry.id !== collectionId),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [collectionId, members.length]);

  const memberPathSet = useMemo(() => {
    const set = new Set<string>();
    for (const member of members) {
      set.add(toCollectionStoragePath(member.storagePath));
    }
    return set;
  }, [members]);

  const addableItems = useMemo(
    () =>
      libraryItems.filter(
        (item) => !memberPathSet.has(toCollectionStoragePath(item.storagePath)),
      ),
    [libraryItems, memberPathSet],
  );

  async function handleAdd() {
    if (!addingPath) {
      return;
    }
    setBusyPath(addingPath);
    setActionError(null);
    const result = await addDocument(addingPath);
    setBusyPath(null);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setStatusMessage("Document added.");
    setAddingPath("");
  }

  async function handleRemove(storagePath: string) {
    setBusyPath(storagePath);
    setActionError(null);
    const result = await removeDocument(storagePath);
    setBusyPath(null);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setStatusMessage("Document removed.");
  }

  async function handleMove(storagePath: string) {
    const target = moveTarget[storagePath];
    if (!target) {
      setActionError("Choose a collection to move into.");
      return;
    }
    setBusyPath(storagePath);
    setActionError(null);
    const result = await moveDocument(storagePath, target);
    setBusyPath(null);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setStatusMessage("Document moved.");
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-[96rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="h-8 w-40 animate-pulse rounded-full bg-surface-muted" />
        <div className="mt-4 h-12 w-72 animate-pulse rounded-full bg-surface-muted" />
        <div className="mt-10 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-[1.25rem] border border-border/70 bg-surface/50"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error || !collection) {
    return (
      <section className="mx-auto w-full max-w-[96rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <p role="alert" className="text-sm text-danger">
          {error || "Collection not found."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void refresh();
            }}
            className="inline-flex h-10 items-center rounded-full bg-foreground px-4 text-xs font-semibold text-background"
          >
            Try again
          </button>
          <Link
            href={ROUTES.collections}
            className="inline-flex h-10 items-center rounded-full border border-border px-4 text-xs font-semibold text-foreground no-underline"
          >
            Back to collections
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[96rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href={ROUTES.collections}
            className="text-[0.65rem] font-semibold tracking-[0.18em] text-accent uppercase no-underline"
          >
            ← Collections
          </Link>
          <h1 className="font-display mt-2 text-[clamp(2rem,3vw,3.25rem)] font-bold tracking-[-0.045em] text-foreground">
            {collection.name}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {collection.documentCount}{" "}
            {collection.documentCount === 1 ? "document" : "documents"}
          </p>
        </div>
        <Link
          href={ROUTES.library}
          className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background no-underline"
        >
          Browse shelf
        </Link>
      </div>

      {(statusMessage || actionError) && (
        <p
          role={actionError ? "alert" : "status"}
          className={`mt-4 text-sm ${actionError ? "text-danger" : "text-muted"}`}
        >
          {actionError || statusMessage}
        </p>
      )}

      <div className="mt-8 rounded-[1.5rem] border border-border/70 bg-surface/45 p-4 sm:p-5">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Add from library
        </h2>
        <p className="mt-1 text-sm text-muted">
          Choose a shelf PDF that is not already in this collection.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={addingPath}
            onChange={(event) => setAddingPath(event.target.value)}
            disabled={libraryLoading || addableItems.length === 0}
            className="h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-55"
            aria-label="Document to add"
          >
            <option value="">
              {libraryLoading
                ? "Loading library…"
                : addableItems.length === 0
                  ? "No available documents"
                  : "Select a document"}
            </option>
            {addableItems.map((item) => (
              <option key={item.storagePath} value={item.storagePath}>
                {item.name} ({formatFileSize(item.size)})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!addingPath || busyPath === addingPath}
            onClick={() => {
              void handleAdd();
            }}
            className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-55"
          >
            {busyPath === addingPath ? "Adding…" : "Add"}
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Documents in this collection
        </h2>

        {members.length === 0 ? (
          <div className="mt-4 rounded-[1.5rem] border border-dashed border-border px-5 py-10 text-center">
            <p className="text-sm text-muted">
              This collection is empty. Add a document from your library above.
            </p>
          </div>
        ) : (
          <ul className="mt-4 list-none space-y-3 p-0">
            {members.map((member) => {
              const libraryMatch = libraryItems.find(
                (item) =>
                  toCollectionStoragePath(item.storagePath) ===
                  toCollectionStoragePath(member.storagePath),
              );
              const label = libraryMatch?.name ?? member.name;
              const busy = busyPath === member.storagePath;

              return (
                <li
                  key={member.id}
                  className="flex flex-col gap-3 rounded-[1.25rem] border border-border/70 bg-surface/50 p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={readerPathForStorage(member.storagePath)}
                      className="block truncate font-semibold text-foreground no-underline hover:underline"
                    >
                      {label}
                    </Link>
                    <p className="mt-1 text-xs text-muted">
                      Added {new Date(member.addedAt).toLocaleString()}
                      {libraryMatch
                        ? ` · ${formatFileSize(libraryMatch.size)}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {otherCollections.length > 0 ? (
                      <>
                        <select
                          value={moveTarget[member.storagePath] ?? ""}
                          onChange={(event) =>
                            setMoveTarget((current) => ({
                              ...current,
                              [member.storagePath]: event.target.value,
                            }))
                          }
                          className="h-10 rounded-full border border-border bg-background px-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Move ${label} to collection`}
                        >
                          <option value="">Move to…</option>
                          {otherCollections.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={busy || !moveTarget[member.storagePath]}
                          onClick={() => {
                            void handleMove(member.storagePath);
                          }}
                          className="inline-flex h-10 items-center rounded-full border border-border px-3 text-xs font-semibold text-foreground disabled:opacity-55"
                        >
                          Move
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void handleRemove(member.storagePath);
                      }}
                      className="inline-flex h-10 items-center rounded-full border border-border px-3 text-xs font-semibold text-muted hover:text-danger disabled:opacity-55"
                    >
                      {busy ? "Working…" : "Remove"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
