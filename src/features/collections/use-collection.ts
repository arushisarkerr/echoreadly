"use client";

import { useCallback, useEffect, useState } from "react";

import {
  addDocumentToCollection,
  getCollection,
  listCollectionMembers,
  moveDocumentBetweenCollections,
  removeDocumentFromCollection,
  renameCollection,
} from "./collections-service";
import type { CollectionMember, CollectionSummary } from "./types";

type UseCollectionState = {
  collection: CollectionSummary | null;
  members: CollectionMember[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  rename: (name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  addDocument: (
    storagePath: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  removeDocument: (
    storagePath: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  moveDocument: (
    storagePath: string,
    toCollectionId: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

/**
 * Loads one collection and its document memberships.
 */
export function useCollection(collectionId: string): UseCollectionState {
  const [collection, setCollection] = useState<CollectionSummary | null>(null);
  const [members, setMembers] = useState<CollectionMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [collectionResult, membersResult] = await Promise.all([
      getCollection(collectionId),
      listCollectionMembers(collectionId),
    ]);

    if (!collectionResult.ok) {
      setCollection(null);
      setMembers([]);
      setError(collectionResult.error);
      setLoading(false);
      return;
    }

    if (!membersResult.ok) {
      setCollection(collectionResult.data);
      setMembers([]);
      setError(membersResult.error);
      setLoading(false);
      return;
    }

    setCollection({
      ...collectionResult.data,
      documentCount: membersResult.data.length,
    });
    setMembers(membersResult.data);
    setError(null);
    setLoading(false);
  }, [collectionId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [collectionResult, membersResult] = await Promise.all([
        getCollection(collectionId),
        listCollectionMembers(collectionId),
      ]);

      if (cancelled) {
        return;
      }

      if (!collectionResult.ok) {
        setCollection(null);
        setMembers([]);
        setError(collectionResult.error);
        setLoading(false);
        return;
      }

      if (!membersResult.ok) {
        setCollection(collectionResult.data);
        setMembers([]);
        setError(membersResult.error);
        setLoading(false);
        return;
      }

      setCollection({
        ...collectionResult.data,
        documentCount: membersResult.data.length,
      });
      setMembers(membersResult.data);
      setError(null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [collectionId]);

  const rename = useCallback(
    async (name: string) => {
      const previous = collection;
      if (previous) {
        setCollection({
          ...previous,
          name: name.trim(),
          updatedAt: new Date().toISOString(),
        });
      }

      const result = await renameCollection(collectionId, name);
      if (!result.ok) {
        setCollection(previous);
        return { ok: false as const, error: result.error };
      }

      setCollection(result.data);
      return { ok: true as const };
    },
    [collection, collectionId],
  );

  const addDocument = useCallback(
    async (storagePath: string) => {
      const result = await addDocumentToCollection(collectionId, storagePath);
      if (!result.ok) {
        return { ok: false as const, error: result.error };
      }

      let inserted = false;
      setMembers((current) => {
        if (
          current.some(
            (entry) => entry.storagePath === result.data.storagePath,
          )
        ) {
          return current;
        }
        inserted = true;
        return [result.data, ...current];
      });
      if (inserted) {
        setCollection((current) =>
          current
            ? {
                ...current,
                documentCount: current.documentCount + 1,
                updatedAt: new Date().toISOString(),
              }
            : current,
        );
      }
      return { ok: true as const };
    },
    [collectionId],
  );

  const removeDocument = useCallback(
    async (storagePath: string) => {
      let snapshot: CollectionMember | null = null;
      setMembers((current) => {
        snapshot =
          current.find((entry) => entry.storagePath === storagePath) ?? null;
        return current.filter((entry) => entry.storagePath !== storagePath);
      });
      setCollection((current) =>
        current
          ? {
              ...current,
              documentCount: Math.max(0, current.documentCount - 1),
            }
          : current,
      );

      const result = await removeDocumentFromCollection(
        collectionId,
        storagePath,
      );
      if (!result.ok) {
        if (snapshot) {
          const restored = snapshot;
          setMembers((current) => [restored, ...current]);
          setCollection((current) =>
            current
              ? { ...current, documentCount: current.documentCount + 1 }
              : current,
          );
        }
        return { ok: false as const, error: result.error };
      }

      return { ok: true as const };
    },
    [collectionId],
  );

  const moveDocument = useCallback(
    async (storagePath: string, toCollectionId: string) => {
      const result = await moveDocumentBetweenCollections({
        fromCollectionId: collectionId,
        toCollectionId,
        storagePath,
      });
      if (!result.ok) {
        return { ok: false as const, error: result.error };
      }

      setMembers((current) =>
        current.filter((entry) => entry.storagePath !== storagePath),
      );
      setCollection((current) =>
        current
          ? {
              ...current,
              documentCount: Math.max(0, current.documentCount - 1),
            }
          : current,
      );
      return { ok: true as const };
    },
    [collectionId],
  );

  return {
    collection,
    members,
    loading,
    error,
    refresh,
    rename,
    addDocument,
    removeDocument,
    moveDocument,
  };
}
