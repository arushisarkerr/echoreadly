"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  LIBRARY_PAGE_SIZE,
  listPdfsPage,
  type ListPdfsSort,
  type StoredPdfObject,
} from "@/lib/storage";

import { LIBRARY_CHANGED_EVENT } from "./library-events";

export type UseLibraryOptions = {
  /** Page size for each Storage list request. */
  pageSize?: number;
  /** Server-side sort. Changing sort resets to page 1. */
  sort?: ListPdfsSort;
};

type LibraryState = {
  items: StoredPdfObject[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  nextOffset: number | null;
  loadedCount: number;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  removeItem: (storagePath: string) => void;
};

function mergeUnique(
  current: StoredPdfObject[],
  incoming: StoredPdfObject[],
): StoredPdfObject[] {
  if (incoming.length === 0) {
    return current;
  }

  const seen = new Set(current.map((item) => item.storagePath));
  const next = [...current];

  for (const item of incoming) {
    if (seen.has(item.storagePath)) {
      continue;
    }
    seen.add(item.storagePath);
    next.push(item);
  }

  return next;
}

/**
 * Loads PDF objects from Supabase Storage one page at a time.
 * Supports Load More without re-fetching already loaded pages.
 */
export function useLibrary(options: UseLibraryOptions = {}): LibraryState {
  const pageSize = options.pageSize ?? LIBRARY_PAGE_SIZE;
  const sort = options.sort ?? "newest";

  const [items, setItems] = useState<StoredPdfObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);

  const inFlightRef = useRef(false);
  const requestIdRef = useRef(0);
  const nextOffsetRef = useRef<number | null>(null);
  const hasMoreRef = useRef(false);

  useEffect(() => {
    nextOffsetRef.current = nextOffset;
  }, [nextOffset]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const loadInitial = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    inFlightRef.current = true;
    setLoading(true);
    setLoadingMore(false);
    setError(null);

    const result = await listPdfsPage({
      limit: pageSize,
      offset: 0,
      sort,
    });

    if (requestId !== requestIdRef.current) {
      return;
    }

    setItems(result.items);
    setHasMore(result.hasMore);
    setNextOffset(result.nextOffset);
    hasMoreRef.current = result.hasMore;
    nextOffsetRef.current = result.nextOffset;
    setError(result.error);
    setLoading(false);
    inFlightRef.current = false;
  }, [pageSize, sort]);

  const refresh = useCallback(async () => {
    await loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (
      inFlightRef.current ||
      !hasMoreRef.current ||
      nextOffsetRef.current == null
    ) {
      return;
    }

    const requestId = ++requestIdRef.current;
    inFlightRef.current = true;
    setLoadingMore(true);
    setError(null);

    const offset = nextOffsetRef.current;
    const result = await listPdfsPage({
      limit: pageSize,
      offset,
      sort,
    });

    if (requestId !== requestIdRef.current) {
      return;
    }

    if (result.error) {
      setError(result.error);
      setLoadingMore(false);
      inFlightRef.current = false;
      return;
    }

    setItems((current) => mergeUnique(current, result.items));
    setHasMore(result.hasMore);
    setNextOffset(result.nextOffset);
    hasMoreRef.current = result.hasMore;
    nextOffsetRef.current = result.nextOffset;
    setLoadingMore(false);
    inFlightRef.current = false;
  }, [pageSize, sort]);

  const removeItem = useCallback((storagePath: string) => {
    setItems((current) =>
      current.filter((item) => item.storagePath !== storagePath),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await loadInitial();
      if (cancelled) {
        return;
      }
    })();

    function onLibraryChanged() {
      void loadInitial();
    }

    window.addEventListener(LIBRARY_CHANGED_EVENT, onLibraryChanged);

    return () => {
      cancelled = true;
      requestIdRef.current += 1;
      inFlightRef.current = false;
      window.removeEventListener(LIBRARY_CHANGED_EVENT, onLibraryChanged);
    };
  }, [loadInitial]);

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    nextOffset,
    loadedCount: items.length,
    refresh,
    loadMore,
    removeItem,
  };
}
