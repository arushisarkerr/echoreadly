"use client";

import { useCallback, useEffect, useState } from "react";

import {
  downloadAudioFile,
  listAudioExports,
} from "./export-client";
import type { AudioExportListItem } from "./types";

export type UseExportsListState = {
  items: AudioExportListItem[];
  loading: boolean;
  error: string | null;
  downloadingId: string | null;
  statusMessage: string | null;
  refresh: () => Promise<void>;
  download: (item: AudioExportListItem) => Promise<void>;
};

/**
 * Load and re-download the signed-in user's cached audio exports.
 */
export function useExportsList(): UseExportsListState {
  const [items, setItems] = useState<AudioExportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await listAudioExports();
    if (!result.ok) {
      setError(result.error);
      setItems([]);
      setLoading(false);
      return;
    }
    setItems(result.data);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await listAudioExports();
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setError(result.error);
        setItems([]);
      } else {
        setItems(result.data);
        setError(null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const download = useCallback(async (item: AudioExportListItem) => {
    setDownloadingId((current) => {
      if (current) {
        return current;
      }
      return item.exportId;
    });

    setStatusMessage(null);
    const result = await downloadAudioFile(item.downloadUrl, item.fileName);
    if (!result.ok) {
      setStatusMessage(result.error);
    } else {
      setStatusMessage(`Downloaded ${item.fileName}`);
    }
    setDownloadingId(null);
  }, []);

  return {
    items,
    loading,
    error,
    downloadingId,
    statusMessage,
    refresh,
    download,
  };
}
