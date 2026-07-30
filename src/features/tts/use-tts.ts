"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { requestTtsAudio, type TtsRequestPayload } from "./tts-service";
import {
  TTS_PLAYBACK_SPEEDS,
  type TtsPlaybackSpeed,
  type TtsPlaybackStatus,
  type TtsSource,
} from "./types";

export type UseTtsState = {
  status: TtsPlaybackStatus;
  source: TtsSource | null;
  error: string | null;
  currentTime: number;
  duration: number | null;
  speed: TtsPlaybackSpeed;
  speeds: TtsPlaybackSpeed[];
  listenSummary: (text: string) => Promise<void>;
  listenPage: (input: {
    storagePath: string;
    pageNumber: number;
    originalFileName?: string;
  }) => Promise<void>;
  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setSpeed: (speed: TtsPlaybackSpeed) => void;
  seek: (time: number) => void;
};

function revokeUrl(url: string | null) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Client hook for OpenAI-backed TTS playback in the reader.
 */
export function useTts(): UseTtsState {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  const [status, setStatus] = useState<TtsPlaybackStatus>("idle");
  const [source, setSource] = useState<TtsSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [speed, setSpeedState] = useState<TtsPlaybackSpeed>(1);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    return audioRef.current;
  }, []);

  useEffect(() => {
    const audio = ensureAudio();

    function onTimeUpdate() {
      setCurrentTime(audio.currentTime);
    }

    function onLoadedMetadata() {
      setDuration(
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : null,
      );
    }

    function onEnded() {
      setStatus("ready");
      setCurrentTime(0);
      audio.currentTime = 0;
    }

    function onError() {
      setStatus("error");
      setError("Unable to play generated audio.");
    }

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      revokeUrl(objectUrlRef.current);
      objectUrlRef.current = null;
      audioRef.current = null;
    };
  }, [ensureAudio]);

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
    }
    revokeUrl(objectUrlRef.current);
    objectUrlRef.current = null;
    setStatus("idle");
    setSource(null);
    setError(null);
    setCurrentTime(0);
    setDuration(null);
  }, []);

  const loadAndPlay = useCallback(
    async (payload: TtsRequestPayload, nextSource: TtsSource) => {
      const requestId = ++requestIdRef.current;
      setStatus("loading");
      setError(null);
      setSource(nextSource);
      setCurrentTime(0);
      setDuration(null);

      const audio = ensureAudio();
      audio.pause();

      const result = await requestTtsAudio(payload);

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!result.ok) {
        setStatus("error");
        setError(result.error);
        return;
      }

      revokeUrl(objectUrlRef.current);
      const objectUrl = URL.createObjectURL(result.data.blob);
      objectUrlRef.current = objectUrl;

      audio.src = objectUrl;
      audio.playbackRate = speed;

      try {
        await audio.play();
        if (requestId !== requestIdRef.current) {
          audio.pause();
          return;
        }
        setStatus("playing");
      } catch {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setStatus("ready");
      }
    },
    [ensureAudio, speed],
  );

  const listenSummary = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setStatus("error");
        setError("Generate a summary before listening.");
        return;
      }

      await loadAndPlay({ source: "summary", text: trimmed }, "summary");
    },
    [loadAndPlay],
  );

  const listenPage = useCallback(
    async (input: {
      storagePath: string;
      pageNumber: number;
      originalFileName?: string;
    }) => {
      await loadAndPlay(
        {
          source: "page",
          storagePath: input.storagePath,
          pageNumber: input.pageNumber,
          originalFileName: input.originalFileName,
        },
        "page",
      );
    },
    [loadAndPlay],
  );

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) {
      return;
    }

    void audio
      .play()
      .then(() => {
        setStatus("playing");
        setError(null);
      })
      .catch(() => {
        setStatus("ready");
        setError("Playback was blocked. Press Play to try again.");
      });
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) {
      return;
    }

    void audio
      .play()
      .then(() => {
        setStatus("playing");
        setError(null);
      })
      .catch(() => {
        setStatus("paused");
        setError("Playback was blocked. Press Resume to try again.");
      });
  }, []);

  const setSpeed = useCallback((next: TtsPlaybackSpeed) => {
    setSpeedState(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(time)) {
      return;
    }

    const max = Number.isFinite(audio.duration) ? audio.duration : time;
    audio.currentTime = Math.max(0, Math.min(time, max));
    setCurrentTime(audio.currentTime);
  }, []);

  return {
    status,
    source,
    error,
    currentTime,
    duration,
    speed,
    speeds: TTS_PLAYBACK_SPEEDS,
    listenSummary,
    listenPage,
    play,
    pause,
    resume,
    stop,
    setSpeed,
    seek,
  };
}
