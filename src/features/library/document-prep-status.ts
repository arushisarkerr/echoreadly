/**
 * Client helpers for Library Preparing / Ready / Failed badges.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { uniqueStoragePathVariants } from "@/features/persistence/storage-path";
import { getApiErrorMessage } from "@/utils";

export type DocumentPrepStatus = "preparing" | "ready" | "failed";

type StatusPayload = {
  storagePath: string;
  status: DocumentPrepStatus;
};

function buildStatusMap(
  entries: StatusPayload[],
): Map<string, DocumentPrepStatus> {
  const map = new Map<string, DocumentPrepStatus>();
  for (const entry of entries) {
    for (const variant of uniqueStoragePathVariants(entry.storagePath)) {
      map.set(variant, entry.status);
    }
  }
  return map;
}

export function resolveDocumentPrepStatus(
  byPath: Map<string, DocumentPrepStatus>,
  storagePath: string,
): DocumentPrepStatus {
  for (const variant of uniqueStoragePathVariants(storagePath)) {
    const hit = byPath.get(variant);
    if (hit) {
      return hit;
    }
  }
  return "ready";
}

export async function fetchDocumentPrepStatuses(): Promise<
  | { ok: true; statuses: StatusPayload[] }
  | { ok: false; error: string }
> {
  const response = await fetch("/api/documents/status", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const json = (await response.json()) as
    | { ok: true; data: { statuses: StatusPayload[] } }
    | { ok: false; error?: unknown };

  if (!response.ok || !("ok" in json) || !json.ok) {
    return {
      ok: false,
      error: getApiErrorMessage(
        "error" in json ? json.error : undefined,
        "Unable to load preparing status.",
      ),
    };
  }

  return { ok: true, statuses: json.data.statuses };
}

/**
 * Poll document prep status while any item is still preparing.
 */
export function useDocumentPrepStatus(enabled = true): {
  byPath: Map<string, DocumentPrepStatus>;
  statusFor: (storagePath: string) => DocumentPrepStatus;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [entries, setEntries] = useState<StatusPayload[]>([]);
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }
    const result = await fetchDocumentPrepStatuses();
    if (result.ok) {
      setEntries(result.statuses);
    }
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const result = await fetchDocumentPrepStatuses();
      if (cancelled) {
        return;
      }
      if (result.ok) {
        setEntries(result.statuses);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const byPath = useMemo(() => buildStatusMap(entries), [entries]);

  const hasPreparing = useMemo(
    () => entries.some((entry) => entry.status === "preparing"),
    [entries],
  );

  useEffect(() => {
    if (!enabled || !hasPreparing) {
      return;
    }

    const timer = window.setInterval(() => {
      void refresh();
    }, 5_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, hasPreparing, refresh]);

  const statusFor = useCallback(
    (storagePath: string) => resolveDocumentPrepStatus(byPath, storagePath),
    [byPath],
  );

  return { byPath, statusFor, loading, refresh };
}
