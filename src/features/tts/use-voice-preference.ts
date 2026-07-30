"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getApiErrorMessage } from "@/utils";

import {
  TTS_VOICE_CATALOG,
  type TtsVoiceDefinition,
  type TtsVoiceId,
} from "./voices";
import { DEFAULT_TTS_VOICE } from "./types";

type UseVoicePreferenceState = {
  voices: readonly TtsVoiceDefinition[];
  selectedVoice: TtsVoiceId;
  selectedDefinition: TtsVoiceDefinition;
  loading: boolean;
  saving: boolean;
  previewingId: TtsVoiceId | null;
  previewLoading: boolean;
  error: string | null;
  fallbackNotice: string | null;
  selectVoice: (voice: TtsVoiceId) => Promise<boolean>;
  previewVoice: (voice: TtsVoiceId) => Promise<void>;
  stopPreview: () => void;
  refresh: () => Promise<void>;
};

function definitionFor(id: TtsVoiceId): TtsVoiceDefinition {
  return (
    TTS_VOICE_CATALOG.find((voice) => voice.id === id) ??
    TTS_VOICE_CATALOG[0]!
  );
}

/**
 * Loads and persists the signed-in user's preferred studio TTS voice.
 */
export function useVoicePreference(): UseVoicePreferenceState {
  const [selectedVoice, setSelectedVoice] = useState<TtsVoiceId>(
    DEFAULT_TTS_VOICE,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewingId, setPreviewingId] = useState<TtsVoiceId | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const stopPreview = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewingId(null);
    setPreviewLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/user/voice", { method: "GET" });
      const payload = (await response.json()) as
        | {
            ok: true;
            data: { voice: string };
          }
        | { ok: false; error: unknown };

      if (!response.ok || !payload.ok) {
        setError(
          payload.ok === false
            ? getApiErrorMessage(payload.error, "Unable to load voices.")
            : "Unable to load voices.",
        );
        setSelectedVoice(DEFAULT_TTS_VOICE);
        setFallbackNotice(
          "Using the default listening voice until preferences load.",
        );
        setLoading(false);
        return;
      }

      const voice = payload.data.voice;
      const known = TTS_VOICE_CATALOG.some((entry) => entry.id === voice);
      if (!known) {
        setSelectedVoice(DEFAULT_TTS_VOICE);
        setFallbackNotice(
          "Your previous voice is no longer available. Switched to Alloy.",
        );
      } else {
        setSelectedVoice(voice as TtsVoiceId);
        setFallbackNotice(null);
      }
      setLoading(false);
    } catch {
      setError("Network error while loading voices.");
      setSelectedVoice(DEFAULT_TTS_VOICE);
      setFallbackNotice(
        "Using the default listening voice until preferences load.",
      );
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/user/voice", { method: "GET" });
        const payload = (await response.json()) as
          | {
              ok: true;
              data: { voice: string };
            }
          | { ok: false; error: unknown };

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.ok) {
          setError(
            payload.ok === false
              ? getApiErrorMessage(payload.error, "Unable to load voices.")
              : "Unable to load voices.",
          );
          setSelectedVoice(DEFAULT_TTS_VOICE);
          setFallbackNotice(
            "Using the default listening voice until preferences load.",
          );
          setLoading(false);
          return;
        }

        const voice = payload.data.voice;
        const known = TTS_VOICE_CATALOG.some((entry) => entry.id === voice);
        if (!known) {
          setSelectedVoice(DEFAULT_TTS_VOICE);
          setFallbackNotice(
            "Your previous voice is no longer available. Switched to Alloy.",
          );
        } else {
          setSelectedVoice(voice as TtsVoiceId);
          setFallbackNotice(null);
        }
        setLoading(false);
      } catch {
        if (cancelled) {
          return;
        }
        setError("Network error while loading voices.");
        setSelectedVoice(DEFAULT_TTS_VOICE);
        setFallbackNotice(
          "Using the default listening voice until preferences load.",
        );
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      stopPreview();
    };
  }, [stopPreview]);

  const selectVoice = useCallback(
    async (voice: TtsVoiceId) => {
      const previous = selectedVoice;
      setSelectedVoice(voice);
      setSaving(true);
      setError(null);
      setFallbackNotice(null);

      try {
        const response = await fetch("/api/user/voice", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voice }),
        });
        const payload = (await response.json()) as
          | { ok: true; data: { voice: string } }
          | { ok: false; error: unknown };

        if (!response.ok || !payload.ok) {
          setSelectedVoice(previous);
          setError(
            payload.ok === false
              ? getApiErrorMessage(payload.error, "Unable to save voice.")
              : "Unable to save voice.",
          );
          setSaving(false);
          return false;
        }

        setSelectedVoice(payload.data.voice as TtsVoiceId);
        setSaving(false);
        return true;
      } catch {
        setSelectedVoice(previous);
        setError("Network error while saving voice.");
        setSaving(false);
        return false;
      }
    },
    [selectedVoice],
  );

  const previewVoice = useCallback(
    async (voice: TtsVoiceId) => {
      if (previewingId === voice && !previewLoading) {
        stopPreview();
        return;
      }

      stopPreview();
      setPreviewLoading(true);
      setPreviewingId(voice);
      setError(null);

      try {
        const response = await fetch("/api/documents/tts/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voice }),
        });

        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok) {
          if (contentType.includes("application/json")) {
            const json = (await response.json()) as { error?: unknown };
            setError(
              getApiErrorMessage(json.error, "Unable to preview this voice."),
            );
          } else {
            setError("Unable to preview this voice.");
          }
          setPreviewLoading(false);
          setPreviewingId(null);
          return;
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        previewUrlRef.current = objectUrl;

        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        const audio = audioRef.current;
        audio.src = objectUrl;
        audio.onended = () => {
          stopPreview();
        };
        audio.onerror = () => {
          setError("Unable to play the preview.");
          stopPreview();
        };

        setPreviewLoading(false);
        try {
          await audio.play();
        } catch {
          setError("Playback was blocked. Try preview again.");
          stopPreview();
        }
      } catch {
        setError("Network error while previewing voice.");
        setPreviewLoading(false);
        setPreviewingId(null);
      }
    },
    [previewLoading, previewingId, stopPreview],
  );

  return {
    voices: TTS_VOICE_CATALOG,
    selectedVoice,
    selectedDefinition: definitionFor(selectedVoice),
    loading,
    saving,
    previewingId,
    previewLoading,
    error,
    fallbackNotice,
    selectVoice,
    previewVoice,
    stopPreview,
    refresh,
  };
}
