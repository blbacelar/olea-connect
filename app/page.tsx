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
import { getPublicSiteCopy } from "@/lib/i18n/public-site-copy";
import { getRequestLocale } from "@/lib/i18n/server";

export default function HomePage() {
  const locale = getRequestLocale();
  const copy = getPublicSiteCopy(locale);

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <main>
        <LandingHero copy={copy.hero} />
        <LandingTransformation copy={copy.transformation} />
        <LandingFeatures copy={copy.features} />
        <LandingTrust copy={copy.trust} />
        <LandingWorkflow copy={copy.workflow} />
        <LandingPricing copy={copy.pricing} locale={locale} />
        <LandingFaq copy={copy.faq} />
        <FinalCta copy={copy.finalCta} />
      </main>
      <LandingFooter copy={copy.footer} nav={copy.nav} logo={copy.logo} />
    </div>
  );
}
