"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import { siteConfig } from "@/config";
import { ROUTES } from "@/constants";

const primaryCta =
  "er-btn inline-flex h-12 items-center justify-center rounded-full bg-foreground px-7 text-background transition-transform hover:scale-[1.02]";
const secondaryCta =
  "er-btn inline-flex h-12 items-center justify-center rounded-full border border-border bg-[color:var(--glass)] px-7 text-foreground backdrop-blur-md transition-colors hover:bg-surface";

/**
 * Immersive hero — content floating into audio. Asymmetric, not a centered template.
 */
export function MarketingHero() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      return;
    }

    function onMove(event: PointerEvent) {
      if (!stage) {
        return;
      }
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      stage.style.setProperty("--px", String(x));
      stage.style.setProperty("--py", String(y));
    }

    stage.addEventListener("pointermove", onMove);
    return () => stage.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <section
      aria-labelledby="hero-brand"
      className="relative isolate min-h-[100svh] overflow-hidden pt-24"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_10%,_var(--glow),_transparent_45%),radial-gradient(ellipse_at_85%_20%,_color-mix(in_srgb,var(--accent-soft)_18%,transparent),_transparent_40%),linear-gradient(165deg,_var(--background),_color-mix(in_srgb,var(--surface-muted)_70%,var(--background))_55%,_var(--background))]"
      />
      <div
        aria-hidden="true"
        className="er-pulse-glow pointer-events-none absolute -left-24 top-32 size-[28rem] rounded-full bg-[color:var(--glow)] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 bottom-10 size-[22rem] rounded-full bg-[color:var(--glow)] opacity-50 blur-3xl"
      />

      <div
        ref={stageRef}
        className="relative mx-auto grid min-h-[calc(100svh-6rem)] max-w-7xl grid-cols-1 items-center gap-10 px-5 pb-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:pb-20"
        style={
          {
            ["--px"]: "0",
            ["--py"]: "0",
          } as CSSProperties
        }
      >
        <div className="relative z-10 max-w-xl lg:pb-10">
          <p className="er-reveal er-copy-sm font-medium tracking-[0.18em] text-accent uppercase">
            Import → Listen
          </p>
          <h1
            id="hero-brand"
            className="er-reveal er-reveal-delay-1 er-display-xl mt-5 text-foreground"
          >
            {siteConfig.name}
          </h1>
          <p className="er-reveal er-reveal-delay-2 er-display-md mt-6 max-w-[16ch] text-foreground">
            Drop any file.
            <br />
            Paste any link.
          </p>
          <p className="er-reveal er-reveal-delay-3 er-copy mt-6 text-muted">
            We&apos;ll turn it into natural AI audio — with বাংলা as the primary
            listening language.
          </p>
          <div className="er-reveal er-reveal-delay-3 mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href={ROUTES.signup} className={primaryCta}>
              Start free
            </a>
            <a href="#how-it-works" className={secondaryCta}>
              See how it works
            </a>
          </div>
        </div>

        <HeroStage />
      </div>
    </section>
  );
}

function HeroStage() {
  const bars = [18, 42, 28, 64, 36, 78, 44, 70, 32, 58, 24, 66, 40, 72, 30, 54];

  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-[4/5] w-full max-w-lg lg:aspect-square lg:max-w-none"
    >
      {/* Depth field */}
      <div className="absolute inset-[8%] rounded-[2rem] bg-[radial-gradient(circle_at_50%_40%,_color-mix(in_srgb,var(--accent)_22%,transparent),_transparent_65%)]" />

      {/* Floating PDF */}
      <div className="er-float-a er-glass absolute top-[6%] left-[2%] w-[42%] rounded-2xl p-3">
        <div className="mb-2 h-2 w-12 rounded-full bg-accent/50" />
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-foreground/15" />
          <div className="h-1.5 w-[88%] rounded-full bg-foreground/12" />
          <div className="h-1.5 w-[72%] rounded-full bg-foreground/10" />
          <div className="h-1.5 w-[80%] rounded-full bg-foreground/12" />
        </div>
        <p className="mt-3 text-[0.65rem] font-semibold tracking-wide text-muted uppercase">
          Research.pdf
        </p>
      </div>

      {/* Website preview */}
      <div className="er-float-b er-glass absolute top-[18%] right-[0%] w-[48%] rounded-2xl p-2.5">
        <div className="mb-2 flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-border" />
          <span className="size-1.5 rounded-full bg-border" />
          <span className="size-1.5 rounded-full bg-border" />
          <span className="ml-2 h-1.5 flex-1 rounded-full bg-foreground/10" />
        </div>
        <div className="overflow-hidden rounded-xl bg-surface-muted/80 p-3">
          <div className="h-2 w-1/2 rounded-full bg-foreground/20" />
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <div className="aspect-square rounded-md bg-accent/25" />
            <div className="aspect-square rounded-md bg-foreground/10" />
            <div className="aspect-square rounded-md bg-foreground/10" />
          </div>
        </div>
        <p className="mt-2 text-[0.65rem] font-semibold tracking-wide text-muted uppercase">
          Web · Coming soon
        </p>
      </div>

      {/* Media card — planned */}
      <div className="er-float-c er-glass absolute bottom-[34%] left-[8%] w-[46%] rounded-2xl p-2.5">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-[linear-gradient(135deg,_color-mix(in_srgb,var(--accent)_35%,#0a1210),_#0a1210)]">
          <span className="absolute inset-0 m-auto size-8 rounded-full border border-white/30 bg-white/15" />
        </div>
        <p className="mt-2 text-[0.65rem] font-semibold tracking-wide text-muted uppercase">
          Media · Coming soon
        </p>
      </div>

      {/* Audio timeline / waveform destination */}
      <div className="er-glass absolute right-[4%] bottom-[8%] w-[62%] rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[0.7rem] font-semibold tracking-wide text-accent uppercase">
            Now playing
          </span>
          <span className="text-[0.65rem] text-subtle">02:14 / 18:40</span>
        </div>
        <div className="flex h-16 items-end justify-between gap-1">
          {bars.map((h, i) => (
            <span
              key={i}
              className="er-wave-bar w-full rounded-full bg-[linear-gradient(to_top,var(--accent),color-mix(in_srgb,var(--accent-soft)_80%,white))]"
              style={{
                height: `${h}%`,
                animationDelay: `${(i % 9) * 0.09}s`,
              }}
            />
          ))}
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full w-[38%] rounded-full bg-accent" />
        </div>
      </div>

      {/* Particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="er-particle absolute size-1 rounded-full bg-accent/70"
          style={{
            left: `${18 + i * 9}%`,
            bottom: `${28 + (i % 3) * 6}%`,
            animationDelay: `${i * 0.35}s`,
          }}
        />
      ))}
    </div>
  );
}
