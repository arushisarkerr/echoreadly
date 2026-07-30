"use client";

import { useCallback, useEffect, useRef } from "react";

import { upsertListeningProgress } from "@/features/persistence/progress";
import type { ListeningProgressPlaybackSource } from "@/features/persistence/types";
import { createClient } from "@/lib/supabase/client";

type UseProgressPersistenceInput = {
  storagePath: string;
  pageNumber: number;
  pageCount: number | null;
  scrollRatio: number;
  playbackSeconds: number;
  playbackSource: ListeningProgressPlaybackSource | null;
  enabled: boolean;
};

const SAVE_DEBOUNCE_MS = 450;

/**
 * Debounced upsert of reading / listening progress while the reader is open.
 */
export function useProgressPersistence({
  storagePath,
  pageNumber,
  pageCount,
  scrollRatio,
  playbackSeconds,
  playbackSource,
  enabled,
}: UseProgressPersistenceInput) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({
    storagePath,
    pageNumber,
    pageCount,
    scrollRatio,
    playbackSeconds,
    playbackSource,
    enabled,
  });

  useEffect(() => {
    latestRef.current = {
      storagePath,
      pageNumber,
      pageCount,
      scrollRatio,
      playbackSeconds,
      playbackSource,
      enabled,
    };
  }, [
    storagePath,
    pageNumber,
    pageCount,
    scrollRatio,
    playbackSeconds,
    playbackSource,
    enabled,
  ]);

  const flush = useCallback(async () => {
    const latest = latestRef.current;
    if (!latest.enabled) {
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    await upsertListeningProgress(
      {
        userId: user.id,
        storagePath: latest.storagePath,
        pageNumber: latest.pageNumber,
        pageCount: latest.pageCount,
        scrollRatio: latest.scrollRatio,
        playbackSeconds: latest.playbackSeconds,
        playbackSource: latest.playbackSource,
        lastOpenedAt: new Date().toISOString(),
      },
      supabase,
    );
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flush();
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    enabled,
    pageNumber,
    pageCount,
    scrollRatio,
    playbackSeconds,
    playbackSource,
    storagePath,
    flush,
  ]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        void flush();
      }
    }

    function onPageHide() {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      void flush();
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      void flush();
    };
  }, [flush]);
}
