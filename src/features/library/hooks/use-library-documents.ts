"use client";

import { useEffect, useState } from "react";

import { getImportOwnerId } from "@/features/import/utils/pdf-upload-store";
import type { DocumentRecord } from "@/features/library/types";

type LibraryDocumentsState = {
  documents: DocumentRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/**
 * Loads library document records for the current import owner.
 */
export function useLibraryDocuments(): LibraryDocumentsState {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
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
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function refresh() {
    setLoading(true);
    setReloadKey((value) => value + 1);
  }

  return {
    documents,
    loading,
    error,
    refresh,
  };
}
