"use client";

import { useState } from "react";

import { Reveal } from "@/components/marketing/reveal";

const VOICES = [
  "Male",
  "Female",
  "Child",
  "Elder",
  "Bangla",
  "English",
  "Portuguese",
  "Hindi",
] as const;

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

/**
 * Interactive voice studio — pick a voice + style, watch the waveform respond.
 */
export function MarketingVoiceExperience() {
  const [voice, setVoice] = useState<(typeof VOICES)[number]>("Female");
  const [style, setStyle] = useState<(typeof STYLES)[number]>("Natural");

  const energy =
    (VOICES.indexOf(voice) % 4) * 4 + (STYLES.indexOf(style) % 5) * 3;

  return (
    <section
      id="voices"
      aria-labelledby="voices-heading"
      className="scroll-mt-24 border-t border-border"
    >
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <Reveal>
          <p className="er-copy-sm font-medium tracking-[0.18em] text-accent uppercase">
            Listening quality · Coming soon
          </p>
          <h2 id="voices-heading" className="er-display-lg mt-4 max-w-[16ch] text-foreground">
            Voices that feel natural to hear.
          </h2>
          <p className="er-copy mt-5 text-muted">
            Today you listen with a clear default voice — বাংলা first. The
            voices and styles below preview richer listening quality that is
            planned, not selectable yet.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal delayClassName="er-reveal-delay-1">
            <div className="space-y-8">
              <div>
                <h3 className="er-display-sm text-foreground">Listening voices</h3>
                <div
                  role="listbox"
                  aria-label="Listening voices"
                  className="mt-4 flex flex-wrap gap-2"
                >
                  {VOICES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      role="option"
                      aria-selected={voice === item}
                      onClick={() => setVoice(item)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold tracking-tight transition-colors ${
                        voice === item
                          ? "bg-foreground text-background"
                          : "border border-border bg-surface text-muted hover:text-foreground"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="er-display-sm text-foreground">Listening styles</h3>
                <div
                  role="listbox"
                  aria-label="Listening styles"
                  className="mt-4 flex flex-wrap gap-2"
                >
                  {STYLES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      role="option"
                      aria-selected={style === item}
                      onClick={() => setStyle(item)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold tracking-tight transition-colors ${
                        style === item
                          ? "bg-accent text-accent-foreground"
                          : "border border-border bg-surface text-muted hover:text-foreground"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delayClassName="er-reveal-delay-2">
            <div className="er-glass relative overflow-hidden rounded-[1.75rem] p-6 sm:p-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-[color:var(--glow)] blur-3xl"
              />
              <p className="text-xs font-semibold tracking-[0.16em] text-subtle uppercase">
                Preview · Coming soon
              </p>
              <p className="er-display-md mt-3 text-foreground">
                {voice}
                <span className="text-muted"> · </span>
                {style}
              </p>
              <p className="er-copy-sm mt-3 max-w-md text-muted">
                Planned listening voices and styles. Today, import content and
                listen with the default natural AI voice.
              </p>
              <div className="mt-10 flex h-28 items-end gap-1.5 sm:h-32">
                {Array.from({ length: 28 }).map((_, i) => {
                  const h = 22 + ((i * 17 + energy * 3) % 70);
                  return (
                    <span
                      key={i}
                      className="er-wave-bar flex-1 rounded-full bg-[linear-gradient(to_top,var(--accent),color-mix(in_srgb,var(--accent-soft)_70%,transparent))]"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${(i % 10) * 0.07}s`,
                        animationDuration: `${1.2 + (i % 5) * 0.12}s`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
