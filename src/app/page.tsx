import {
  Faq,
  FinalCta,
  HowItWorks,
  MarketingAudioExport,
  MarketingFeatureStories,
  MarketingFooter,
  MarketingHero,
  MarketingNavbar,
  MarketingSources,
  MarketingTransform,
  MarketingVoiceExperience,
} from "@/components/marketing";

/**
 * EchoReadly landing — Import → Listen.
 */
export default function HomePage() {
  return (
    <>
      <MarketingNavbar />
      <main className="flex flex-1 flex-col overflow-x-hidden">
        <MarketingHero />
        <MarketingTransform />
        <MarketingSources />
        <HowItWorks />
        <MarketingVoiceExperience />
        <MarketingAudioExport />
        <MarketingFeatureStories />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
    </>
  );
}
