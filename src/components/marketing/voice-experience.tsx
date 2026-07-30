import { Reveal } from "@/components/marketing/reveal";
import { ROUTES } from "@/constants";
import { TTS_VOICE_CATALOG } from "@/features/tts/voices";

/**
 * Listening voices — the real catalog available after sign-in.
 */
export function MarketingVoiceExperience() {
  return (
    <section
      id="voices"
      aria-labelledby="voices-heading"
      className="scroll-mt-24 border-t border-border"
    >
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <Reveal>
          <p className="er-copy-sm font-medium tracking-[0.18em] text-accent uppercase">
            Listening voices
          </p>
          <h2 id="voices-heading" className="er-display-lg mt-4 max-w-[16ch] text-foreground">
            Voices you can actually use.
          </h2>
          <p className="er-copy mt-5 max-w-2xl text-muted">
            After you sign in, open Voice to pick a narrator and hear a short
            sample. Your choice applies the next time you listen.
          </p>
        </Reveal>

        <ul className="mt-14 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {TTS_VOICE_CATALOG.map((voice, i) => (
            <li key={voice.id}>
              <Reveal delayClassName={`er-reveal-delay-${Math.min((i % 3) + 1, 3)}`}>
                <div className="er-glass h-full rounded-[1.5rem] p-5">
                  <p className="font-display text-lg font-semibold tracking-tight text-foreground">
                    {voice.name}
                  </p>
                  <p className="mt-2 text-sm text-muted">{voice.description}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal className="mt-10">
          <a
            href={ROUTES.signup}
            className="er-btn inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-background"
          >
            Sign up to pick a voice
          </a>
        </Reveal>
      </div>
    </section>
  );
}
