import {
  Faq,
  FinalCta,
  HowItWorks,
  MarketingFeatures,
  MarketingFooter,
  MarketingHero,
  MarketingNavbar,
  PricingPreview,
  SocialProof,
} from "@/components/marketing";

/**
 * EchoReadly marketing landing page.
 * Product features (upload, summary, reader, TTS) are intentionally not implemented yet.
 */
export default function HomePage() {
  return (
    <>
      <MarketingNavbar />
      <main className="flex flex-1 flex-col">
        <MarketingHero />
        <MarketingFeatures />
        <HowItWorks />
        <PricingPreview />
        <SocialProof />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
    </>
  );
}
