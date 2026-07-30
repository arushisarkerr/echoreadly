"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createCollection,
  deleteCollection,
  listCollections,
  renameCollection,
} from "./collections-service";
import type { CollectionSummary } from "./types";

type UseCollectionsState = {
  collections: CollectionSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  rename: (
    id: string,
    name: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  remove: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
};

/**
 * Lists and mutates the signed-in user's collections.
 */
export function useCollections(): UseCollectionsState {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await listCollections();
    if (!result.ok) {
      setError(result.error);
      setCollections([]);
      setLoading(false);
      return;
    }
    setCollections(result.data);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await listCollections();
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setError(result.error);
        setCollections([]);
      } else {
        setCollections(result.data);
        setError(null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const create = useCallback(async (name: string) => {
    const optimisticId = `temp-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    setCollections((current) => [
      {
        id: optimisticId,
        name: name.trim(),
        createdAt: now,
        updatedAt: now,
        documentCount: 0,
      },
      ...current,
    ]);

    const result = await createCollection(name);
    if (!result.ok) {
      setCollections((current) =>
        current.filter((entry) => entry.id !== optimisticId),
      );
      return { ok: false as const, error: result.error };
    }

    setCollections((current) =>
      current.map((entry) =>
        entry.id === optimisticId ? result.data : entry,
      ),
    );
    setError(null);
    return { ok: true as const };
  }, []);

  const rename = useCallback(async (id: string, name: string) => {
    let previousName = "";
    setCollections((current) =>
      current.map((entry) => {
        if (entry.id !== id) {
          return entry;
        }
        previousName = entry.name;
        return {
          ...entry,
          name: name.trim(),
          updatedAt: new Date().toISOString(),
        };
      }),
    );

    const result = await renameCollection(id, name);
    if (!result.ok) {
      setCollections((current) =>
        current.map((entry) =>
          entry.id === id ? { ...entry, name: previousName } : entry,
        ),
      );
      return { ok: false as const, error: result.error };
    }

    setCollections((current) =>
      current.map((entry) => (entry.id === id ? result.data : entry)),
    );
    return { ok: true as const };
  }, []);

  const remove = useCallback(async (id: string) => {
    let snapshot: CollectionSummary | null = null;
    setCollections((current) => {
      snapshot = current.find((entry) => entry.id === id) ?? null;
      return current.filter((entry) => entry.id !== id);
    });

    const result = await deleteCollection(id);
    if (!result.ok) {
      if (snapshot) {
        const restored = snapshot;
        setCollections((current) => [restored, ...current]);
      }
      return { ok: false as const, error: result.error };
    }

    return { ok: true as const };
  }, []);

  return {
    collections,
    loading,
    error,
    refresh,
    create,
    rename,
    remove,
  };
}
