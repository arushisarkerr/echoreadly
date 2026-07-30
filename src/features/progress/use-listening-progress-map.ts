"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  listeningProgressPercent,
  listListeningProgressForUser,
} from "@/features/persistence/progress";
import {
  normalizeStoragePath,
  uniqueStoragePathVariants,
} from "@/features/persistence/storage-path";
import type { DocumentListeningProgressRow } from "@/features/persistence/types";
import { createClient } from "@/lib/supabase/client";
import { LIBRARY_CHANGED_EVENT } from "@/features/library/library-events";

export type LibraryProgressView = {
  storagePath: string;
  pageNumber: number;
  pageCount: number | null;
  progressPercent: number | null;
  lastOpenedAt: string;
  hasProgress: true;
};

type UseListeningProgressMapState = {
  byStoragePath: Map<string, LibraryProgressView>;
  recent: LibraryProgressView[];
  loading: boolean;
  refresh: () => Promise<void>;
};

function rowToView(row: DocumentListeningProgressRow): LibraryProgressView {
  return {
    storagePath: row.storage_path,
    pageNumber: row.page_number,
    pageCount: row.page_count,
    progressPercent: listeningProgressPercent(row.page_number, row.page_count),
    lastOpenedAt: row.last_opened_at,
    hasProgress: true,
  };
}

function indexProgressRows(
  rows: DocumentListeningProgressRow[],
): Map<string, LibraryProgressView> {
  const map = new Map<string, LibraryProgressView>();

  for (const row of rows) {
    const view = rowToView(row);
    for (const variant of uniqueStoragePathVariants(row.storage_path)) {
      map.set(normalizeStoragePath(variant), view);
    }
  }

  return map;
}

/**
 * Loads the signed-in user's listening progress for library / home / history CTAs.
 */
export function useListeningProgressMap(): UseListeningProgressMapState {
  const [rows, setRows] = useState<DocumentListeningProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }

    const result = await listListeningProgressForUser(user.id, supabase);
    setRows(result.ok ? result.data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (!user) {
        setRows([]);
        setLoading(false);
        return;
      }

      const result = await listListeningProgressForUser(user.id, supabase);
      if (cancelled) {
        return;
      }

      setRows(result.ok ? result.data : []);
      setLoading(false);
    }

    void load();

    function onLibraryChanged() {
      setLoading(true);
      void refresh();
    }

    window.addEventListener(LIBRARY_CHANGED_EVENT, onLibraryChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(LIBRARY_CHANGED_EVENT, onLibraryChanged);
    };
  }, [refresh]);

  const byStoragePath = useMemo(() => indexProgressRows(rows), [rows]);
  const recent = useMemo(() => rows.map(rowToView), [rows]);

  return {
    byStoragePath,
    recent,
    loading,
    refresh,
  };
}

export function progressForStoragePath(
  map: Map<string, LibraryProgressView>,
  storagePath: string,
): LibraryProgressView | null {
  for (const variant of uniqueStoragePathVariants(storagePath)) {
    const hit = map.get(normalizeStoragePath(variant));
    if (hit) {
      return hit;
    }
  }
  return null;
}

export function formatLastOpened(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
