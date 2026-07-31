"use client";

import { useEffect, useState } from "react";

import { getImportOwnerId } from "@/features/import/utils/pdf-upload-store";
import type { DocumentRecord } from "@/features/library/types";

type LibraryDocumentsState = {
  documents: DocumentRecord[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  deleting: boolean;
  refresh: () => Promise<void>;
  deleteDocuments: (documentIds: string[]) => Promise<void>;
};

/**
 * Loads library document records for the current import owner.
 */
export function useLibraryDocuments(): LibraryDocumentsState {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const ownerId = getImportOwnerId();
        const response = await fetch(
          `/api/library/documents?ownerId=${encodeURIComponent(ownerId)}`,
          { method: "GET", cache: "no-store" },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          documents?: DocumentRecord[];
          error?: string;
        };

        if (!response.ok || !payload.ok || !payload.documents) {
          throw new Error(payload.error || "Unable to load library documents.");
        }

        if (!cancelled) {
          setDocuments(payload.documents);
          setError(null);
          setLoading(false);
          setRefreshing(false);
        }
      } catch (cause) {
        if (!cancelled) {
          setDocuments([]);
          setError(
            cause instanceof Error && cause.message
              ? cause.message
              : "Unable to load library documents.",
          );
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function refresh() {
    setRefreshing(true);
    setLoading(true);
    setReloadKey((value) => value + 1);
  }

  async function deleteDocuments(documentIds: string[]) {
    const uniqueIds = [...new Set(documentIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const ownerId = getImportOwnerId();
      const response = await fetch("/api/library/documents", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerId,
          documentIds: uniqueIds,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        deletedIds?: string[];
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to delete documents.");
      }

      const deleted = new Set(payload.deletedIds ?? uniqueIds);
      setDocuments((current) => current.filter((document) => !deleted.has(document.id)));
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "Unable to delete documents.",
      );
      throw cause;
    } finally {
      setDeleting(false);
    }
  }

  return {
    documents,
    loading,
    error,
    refreshing,
    deleting,
    refresh,
    deleteDocuments,
  };
}
