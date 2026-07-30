"use client";

import { useState } from "react";

import { ROUTES } from "@/constants";
import { WorkspaceCanvas } from "@/features/dashboard/workspace-canvas";

const CATEGORIES = ["Male", "Female", "Child", "Elder"] as const;
const LANGUAGES = ["Bangla", "English", "Portuguese", "Hindi"] as const;
const STYLES = [
  "Natural",
  "Storytelling",
  "Teacher",
  "Podcast",
  "Documentary",
  "News Reader",
  "Professional",
  "Calm",
] as const;

const VOICES = [
  { name: "Aria", category: "Female", language: "English", style: "Natural" },
  { name: "Noah", category: "Male", language: "English", style: "Podcast" },
  { name: "Maya", category: "Female", language: "Bangla", style: "Storytelling" },
  { name: "Ravi", category: "Male", language: "Hindi", style: "Teacher" },
  { name: "Sofia", category: "Female", language: "Portuguese", style: "Calm" },
  { name: "Elias", category: "Elder", language: "English", style: "Documentary" },
  { name: "Lio", category: "Child", language: "English", style: "Natural" },
  { name: "Priya", category: "Female", language: "Hindi", style: "News Reader" },
] as const;

/**
 * Voice atelier — browse categories, languages, styles; preview UI only.
 */
export function VoicesWorkspace() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number] | "All">(
    "All",
  );
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number] | "All">(
    "All",
  );
  const [previewing, setPreviewing] = useState<string | null>(null);

  const filtered = VOICES.filter((voice) => {
    if (category !== "All" && voice.category !== category) return false;
    if (language !== "All" && voice.language !== language) return false;
    return true;
  });

  return (
    <WorkspaceCanvas
      kicker="Voice library · Coming soon"
      title="Cast the narrator — soon."
      description="This page is a preview of planned voices and styles. Preview buttons do not synthesize audio. Listening today uses the default studio TTS voice in the reader."
      actionHref={ROUTES.listen}
      actionLabel="Open Listen"
    >
      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="All"
          active={category === "All"}
          onClick={() => setCategory("All")}
        />
        {CATEGORIES.map((c) => (
          <FilterChip
            key={c}
            label={c}
            active={category === c}
            onClick={() => setCategory(c)}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <FilterChip
          label="All languages"
          active={language === "All"}
          onClick={() => setLanguage("All")}
          soft
        />
        {LANGUAGES.map((l) => (
          <FilterChip
            key={l}
            label={l}
            active={language === l}
            onClick={() => setLanguage(l)}
            soft
          />
        ))}
      </div>

      <ul className="mt-8 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4">
        {filtered.map((voice) => (
          <li key={voice.name}>
            <article className="group relative overflow-hidden rounded-[1.65rem] border border-border/70 bg-surface/50 p-5">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_14%,transparent),transparent)]"
              />
              <div className="relative flex size-12 items-center justify-center rounded-2xl bg-foreground font-display text-lg font-bold text-background">
                {voice.name.slice(0, 1)}
              </div>
              <h2 className="relative mt-4 font-display text-xl font-semibold tracking-tight text-foreground">
                {voice.name}
              </h2>
              <p className="relative mt-1 text-sm text-muted">
                {voice.category} · {voice.language}
              </p>
              <p className="relative mt-1 text-xs font-semibold tracking-wide text-accent uppercase">
                {voice.style}
              </p>
              <div className="relative mt-4 flex h-10 items-end gap-0.5">
                {[40, 65, 45, 80, 50, 70, 42, 75].map((h, i) => (
                  <span
                    key={i}
                    className="er-wave-bar flex-1 rounded-full bg-accent/70"
                    style={{
                      height: `${h}%`,
                      animationPlayState:
                        previewing === voice.name ? "running" : "paused",
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                className="relative mt-4 inline-flex h-9 items-center rounded-full border border-border px-3.5 text-xs font-semibold text-foreground transition group-hover:bg-foreground group-hover:text-background"
                onClick={() =>
                  setPreviewing((current) =>
                    current === voice.name ? null : voice.name,
                  )
                }
              >
                {previewing === voice.name ? "Stop preview" : "Preview UI"}
              </button>
            </article>
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Styles
        </h3>
        <ul className="mt-4 flex list-none flex-wrap gap-2 p-0">
          {STYLES.map((style) => (
            <li key={style}>
              <span className="inline-flex rounded-full bg-foreground/5 px-3.5 py-1.5 text-xs font-semibold text-foreground">
                {style}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </WorkspaceCanvas>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  soft,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  soft?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        soft
          ? `rounded-full border px-3 py-1 text-[0.7rem] font-medium ${
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border/70 text-muted"
            }`
          : `rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              active
                ? "bg-foreground text-background"
                : "border border-border bg-surface/60 text-foreground"
            }`
      }
    >
      {label}
    </button>
  );
}
