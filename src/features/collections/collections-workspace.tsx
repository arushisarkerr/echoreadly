"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import { ROUTES } from "@/constants";
import { WorkspaceCanvas } from "@/features/dashboard/workspace-canvas";
import { cn } from "@/utils";

import { MAX_COLLECTION_NAME_LENGTH } from "./collections-service";
import { useCollections } from "./use-collections";

/**
 * Collections mosaic — create, open, rename, and delete owned rooms.
 */
export function CollectionsWorkspace() {
  const { collections, loading, error, create, rename, remove, refresh } =
    useCollections();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const sorted = useMemo(() => collections, [collections]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (creating) {
      return;
    }
    setCreating(true);
    setFormError(null);
    const result = await create(name);
    setCreating(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setName("");
  }

  async function handleRename(id: string) {
    setBusyId(id);
    setActionError(null);
    const result = await rename(id, renameValue);
    setBusyId(null);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setRenamingId(null);
    setRenameValue("");
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    setActionError(null);
    const result = await remove(id);
    setBusyId(null);
    setConfirmDeleteId(null);
    if (!result.ok) {
      setActionError(result.error);
    }
  }

  return (
    <WorkspaceCanvas
      kicker="Collections"
      title="Rooms for your listening."
      description="Group Library items into collections. Membership is yours alone — open a room to add, remove, or move documents."
      actionHref={ROUTES.library}
      actionLabel="Open Library"
    >
      <form
        onSubmit={(event) => {
          void handleCreate(event);
        }}
        className="flex flex-col gap-3 rounded-[1.5rem] border border-border/70 bg-surface/45 p-4 sm:flex-row sm:items-end sm:p-5"
      >
        <label className="min-w-0 flex-1 text-sm text-muted">
          <span className="mb-2 block text-[0.65rem] font-semibold tracking-[0.14em] text-subtle uppercase">
            New collection
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={MAX_COLLECTION_NAME_LENGTH}
            placeholder="e.g. Study notes"
            className="h-11 w-full rounded-full border border-border bg-background px-4 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="inline-flex h-11 min-h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55"
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </form>
      {formError ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}
      {actionError ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {actionError}
        </p>
      ) : null}

      {loading ? (
        <ul
          aria-hidden="true"
          className="mt-8 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3"
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <li
              key={index}
              className="min-h-[12.5rem] animate-pulse rounded-[1.85rem] border border-border/70 bg-surface/50"
            />
          ))}
        </ul>
      ) : null}

      {!loading && error ? (
        <div
          role="alert"
          className="mt-8 rounded-[1.5rem] border border-danger/35 bg-[color-mix(in_srgb,var(--danger)_7%,transparent)] px-5 py-6"
        >
          <p className="font-display text-lg font-semibold text-foreground">
            Couldn’t load collections
          </p>
          <p className="mt-2 text-sm text-danger">{error}</p>
          <button
            type="button"
            onClick={() => {
              void refresh();
            }}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-xs font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !error && sorted.length === 0 ? (
        <div className="mt-8 rounded-[1.5rem] border border-dashed border-border bg-surface/40 px-5 py-10 text-center">
          <p className="font-display text-xl font-semibold text-foreground">
            No collections yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Create a room above, then open it to add documents from Library.
          </p>
        </div>
      ) : null}

      {!loading && !error && sorted.length > 0 ? (
        <ul
          className="mt-8 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="Your collections"
        >
          {sorted.map((folder, index) => {
            const accent = index === 0;
            const isRenaming = renamingId === folder.id;
            const isConfirming = confirmDeleteId === folder.id;
            const busy = busyId === folder.id;

            return (
              <li key={folder.id}>
                <article
                  className={cn(
                    "relative flex min-h-[12.5rem] flex-col justify-between overflow-hidden rounded-[1.85rem] border border-border/70 p-5 sm:p-6",
                    accent
                      ? "bg-foreground text-background"
                      : "bg-surface/55",
                  )}
                >
                  <div
                    aria-hidden="true"
                    className={cn(
                      "absolute -top-10 -right-8 size-32 rounded-full blur-3xl",
                      accent
                        ? "bg-[color-mix(in_srgb,var(--accent-soft)_50%,transparent)]"
                        : "bg-[color:var(--glow)]",
                    )}
                  />

                  <div className="relative flex items-start justify-between gap-3">
                    <p
                      className={cn(
                        "text-[0.65rem] font-semibold tracking-[0.18em] uppercase",
                        accent ? "text-background/55" : "text-accent",
                      )}
                    >
                      Collection
                    </p>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase",
                        accent
                          ? "border-background/25 text-background/65"
                          : "border-border text-subtle",
                      )}
                    >
                      {folder.documentCount === 0
                        ? "Empty"
                        : `${folder.documentCount}`}
                    </span>
                  </div>

                  <div className="relative mt-8">
                    {isRenaming ? (
                      <div className="space-y-2">
                        <input
                          value={renameValue}
                          onChange={(event) =>
                            setRenameValue(event.target.value)
                          }
                          maxLength={MAX_COLLECTION_NAME_LENGTH}
                          className={cn(
                            "h-10 w-full rounded-full border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            accent
                              ? "border-background/30 bg-background/10 text-background"
                              : "border-border bg-background text-foreground",
                          )}
                          autoFocus
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy || !renameValue.trim()}
                            onClick={() => {
                              void handleRename(folder.id);
                            }}
                            className={cn(
                              "inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold",
                              accent
                                ? "bg-background text-foreground"
                                : "bg-foreground text-background",
                            )}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingId(null);
                              setRenameValue("");
                            }}
                            className={cn(
                              "inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold",
                              accent
                                ? "border-background/30 text-background"
                                : "border-border text-foreground",
                            )}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h2 className="font-display text-2xl font-semibold tracking-tight">
                          {folder.name}
                        </h2>
                        <p
                          className={cn(
                            "mt-3 text-xs font-medium tabular-nums",
                            accent ? "text-background/50" : "text-subtle",
                          )}
                        >
                          {folder.documentCount}{" "}
                          {folder.documentCount === 1
                            ? "document"
                            : "documents"}
                        </p>
                      </>
                    )}
                  </div>

                  {!isRenaming ? (
                    <div className="relative mt-5 flex flex-wrap gap-2">
                      <Link
                        href={`${ROUTES.collections}/${folder.id}`}
                        className={cn(
                          "inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold no-underline",
                          accent
                            ? "bg-background text-foreground"
                            : "bg-foreground text-background",
                        )}
                      >
                        Open
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteId(null);
                          setRenamingId(folder.id);
                          setRenameValue(folder.name);
                        }}
                        className={cn(
                          "inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold",
                          accent
                            ? "border-background/30 text-background"
                            : "border-border text-foreground",
                        )}
                      >
                        Rename
                      </button>
                      {isConfirming ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              void handleDelete(folder.id);
                            }}
                            className="inline-flex h-9 items-center rounded-full bg-[color:var(--danger)] px-3 text-xs font-semibold text-white"
                          >
                            Confirm delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className={cn(
                              "inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold",
                              accent
                                ? "border-background/30 text-background"
                                : "border-border text-foreground",
                            )}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(folder.id)}
                          className={cn(
                            "inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold",
                            accent
                              ? "border-background/30 text-background/80"
                              : "border-border text-muted hover:text-danger",
                          )}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      ) : null}
    </WorkspaceCanvas>
  );
}
