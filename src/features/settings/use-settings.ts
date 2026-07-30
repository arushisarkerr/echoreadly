"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { TtsVoiceDefinition } from "@/features/tts/voices";

import { createDefaultUserPreferences } from "./defaults";
import {
  loadUserPreferences,
  saveUserPreferences,
} from "./preferences-client";
import {
  applyReadingPreferences,
  persistThemePreference,
} from "./theme";
import type { UserPreferences } from "./types";

export type SettingsFormStatus =
  | "loading"
  | "ready"
  | "saving"
  | "saved"
  | "error";

export type UseSettingsState = {
  status: SettingsFormStatus;
  draft: UserPreferences;
  saved: UserPreferences | null;
  voices: readonly TtsVoiceDefinition[];
  error: string | null;
  fieldErrors: Partial<Record<keyof UserPreferences, string>>;
  isDirty: boolean;
  canSave: boolean;
  setField: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => void;
  save: () => Promise<boolean>;
  discard: () => void;
  refresh: () => Promise<void>;
};

function preferencesEqual(a: UserPreferences, b: UserPreferences): boolean {
  return (
    a.displayName === b.displayName &&
    a.preferredTtsVoice === b.preferredTtsVoice &&
    a.preferredListeningLanguage === b.preferredListeningLanguage &&
    a.playbackSpeed === b.playbackSpeed &&
    a.autoPlayNextPage === b.autoPlayNextPage &&
    a.fontSize === b.fontSize &&
    a.readingWidth === b.readingWidth &&
    a.themePreference === b.themePreference &&
    a.preferredExportFormat === b.preferredExportFormat
  );
}

/**
 * Settings form state — load, edit, save, unsaved-change awareness.
 */
export function useSettings(): UseSettingsState {
  const [status, setStatus] = useState<SettingsFormStatus>("loading");
  const [draft, setDraft] = useState<UserPreferences>(
    createDefaultUserPreferences(),
  );
  const [saved, setSaved] = useState<UserPreferences | null>(null);
  const [voices, setVoices] = useState<readonly TtsVoiceDefinition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof UserPreferences, string>>
  >({});

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);
    const result = await loadUserPreferences();
    if (!result.ok) {
      setError(result.error);
      setStatus("error");
      return;
    }

    setDraft(result.data.preferences);
    setSaved(result.data.preferences);
    setVoices(result.data.voices);
    setFieldErrors({});
    persistThemePreference(result.data.preferences.themePreference);
    applyReadingPreferences({
      fontSize: result.data.preferences.fontSize,
      readingWidth: result.data.preferences.readingWidth,
    });
    setStatus("ready");
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await loadUserPreferences();
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setError(result.error);
        setStatus("error");
        return;
      }
      setDraft(result.data.preferences);
      setSaved(result.data.preferences);
      setVoices(result.data.voices);
      persistThemePreference(result.data.preferences.themePreference);
      applyReadingPreferences({
        fontSize: result.data.preferences.fontSize,
        readingWidth: result.data.preferences.readingWidth,
      });
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!saved) {
      return;
    }

    const savedSnapshot = saved;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!preferencesEqual(draft, savedSnapshot)) {
        event.preventDefault();
        event.returnValue = "";
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [draft, saved]);

  const isDirty = useMemo(
    () => (saved ? !preferencesEqual(draft, saved) : false),
    [draft, saved],
  );

  const canSave = isDirty && status !== "saving" && status !== "loading";

  function setField<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) {
    setDraft((current) => {
      const next = { ...current, [key]: value };

      if (key === "themePreference") {
        persistThemePreference(next.themePreference);
      }
      if (key === "fontSize" || key === "readingWidth") {
        applyReadingPreferences({
          fontSize: next.fontSize,
          readingWidth: next.readingWidth,
        });
      }

      return next;
    });

    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });

    if (status === "saved" || status === "error") {
      setStatus("ready");
      setError(null);
    }
  }

  async function save(): Promise<boolean> {
    if (!canSave) {
      return false;
    }

    if (draft.displayName.trim().length > 80) {
      setFieldErrors({
        displayName: "Display name must be at most 80 characters.",
      });
      setStatus("error");
      setError("Fix the highlighted fields, then try again.");
      return false;
    }

    setStatus("saving");
    setError(null);
    setFieldErrors({});

    const result = await saveUserPreferences({
      displayName: draft.displayName.trim(),
      preferredTtsVoice: draft.preferredTtsVoice,
      preferredListeningLanguage: draft.preferredListeningLanguage,
      playbackSpeed: draft.playbackSpeed,
      autoPlayNextPage: draft.autoPlayNextPage,
      fontSize: draft.fontSize,
      readingWidth: draft.readingWidth,
      themePreference: draft.themePreference,
      preferredExportFormat: draft.preferredExportFormat,
    });

    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return false;
    }

    setDraft(result.data.preferences);
    setSaved(result.data.preferences);
    persistThemePreference(result.data.preferences.themePreference);
    applyReadingPreferences({
      fontSize: result.data.preferences.fontSize,
      readingWidth: result.data.preferences.readingWidth,
    });
    setStatus("saved");
    return true;
  }

  function discard() {
    if (!saved || status === "saving") {
      return;
    }
    setDraft(saved);
    setFieldErrors({});
    setError(null);
    persistThemePreference(saved.themePreference);
    applyReadingPreferences({
      fontSize: saved.fontSize,
      readingWidth: saved.readingWidth,
    });
    setStatus("ready");
  }

  return {
    status,
    draft,
    saved,
    voices,
    error,
    fieldErrors,
    isDirty,
    canSave,
    setField,
    save,
    discard,
    refresh,
  };
}
