import { PublicHeader } from "@/components/auth/PublicHeader";
import { FinalCta } from "@/components/landing/FinalCta";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingTrust } from "@/components/landing/LandingTrust";
import { LandingTransformation } from "@/components/landing/LandingTransformation";
import { LandingWorkflow } from "@/components/landing/LandingWorkflow";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <main>
        <LandingHero />
        <LandingTransformation />
        <LandingFeatures />
        <LandingTrust />
        <LandingWorkflow />
        <LandingPricing />
        <LandingFaq />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
