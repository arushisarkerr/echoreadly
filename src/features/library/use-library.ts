"use client";

import { useCallback, useEffect, useState } from "react";

import { listPdfs, type StoredPdfObject } from "@/lib/storage";

import { LIBRARY_CHANGED_EVENT } from "./library-events";

type LibraryState = {
  items: StoredPdfObject[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  removeItem: (storagePath: string) => void;
};

async function fetchLibrary(): Promise<{
  items: StoredPdfObject[];
  error: string | null;
}> {
  const result = await listPdfs();
  return {
    items: result.items,
    error: result.error,
  };
}

/**
 * Loads PDF objects from Supabase Storage and refreshes after upload/delete events.
 */
export function useLibrary(): LibraryState {
  const [items, setItems] = useState<StoredPdfObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await fetchLibrary();
    setItems(result.items);
    setError(result.error);
    setLoading(false);
  }, []);

  const removeItem = useCallback((storagePath: string) => {
    setItems((current) =>
      current.filter((item) => item.storagePath !== storagePath),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await fetchLibrary();
      if (cancelled) {
        return;
      }

      setItems(result.items);
      setError(result.error);
      setLoading(false);
    }

    void load();

    function onLibraryChanged() {
      setLoading(true);
      void (async () => {
        const result = await fetchLibrary();
        if (cancelled) {
          return;
        }

        setItems(result.items);
        setError(result.error);
        setLoading(false);
      })();
    }

    window.addEventListener(LIBRARY_CHANGED_EVENT, onLibraryChanged);

    return () => {
      cancelled = true;
      window.removeEventListener(LIBRARY_CHANGED_EVENT, onLibraryChanged);
    };
  }, []);

  return {
    items,
    loading,
    error,
    refresh,
    removeItem,
  };
}
