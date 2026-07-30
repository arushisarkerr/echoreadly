import {
  Faq,
  FinalCta,
  HowItWorks,
  MarketingAudioExport,
  MarketingFeatureStories,
  MarketingFooter,
  MarketingHero,
  MarketingIntegrations,
  MarketingNavbar,
  MarketingSources,
  MarketingTransform,
  MarketingVoiceExperience,
  PricingPreview,
} from "@/components/marketing";

/**
 * EchoReadly landing — PDF listening studio marketing.
 * Design-only; auth routes and APIs are unchanged.
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
        <MarketingIntegrations />
        <PricingPreview />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
    </>
  );
}
