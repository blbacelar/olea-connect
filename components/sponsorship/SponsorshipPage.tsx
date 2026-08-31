import { PublicHeader } from "@/components/auth/PublicHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { SponsorshipCta } from "@/components/sponsorship/SponsorshipCta";
import { SponsorshipTierCard } from "@/components/sponsorship/SponsorshipTierCard";
import { getSponsorshipPageCopy } from "@/lib/i18n/sponsorship-page-copy";
import { getRequestLocale } from "@/lib/i18n/server";
import {
  sponsorshipCalendlyUrl,
  sponsorshipContactEmail,
} from "@/lib/sponsorship-content";

export function SponsorshipPage() {
  const locale = getRequestLocale();
  const copy = getSponsorshipPageCopy(locale);

  return (
    <div className="min-h-screen bg-[#f5f3ee] text-[#2c2c2c]">
      <PublicHeader />
      <main>
        <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-8 md:py-16">
          <section className="mb-20 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#556b2f]">
              {copy.heroEyebrow}
            </p>
            <h1 className="mx-auto mt-4 max-w-4xl text-balance text-4xl font-bold leading-tight text-[#3d4920] sm:text-5xl">
              {copy.heroTitle}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#666]">
              {copy.heroBody}
            </p>
            <blockquote className="mx-auto mt-8 max-w-3xl rounded border-l-4 border-[#b8860b] bg-white p-6 text-left text-lg italic leading-8 text-[#666] shadow-sm sm:p-8">
              {copy.quote}
            </blockquote>
          </section>

          <section
            aria-labelledby="sponsorship-tiers-heading"
            className="mb-20"
          >
            <div className="mb-8 max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#556b2f]">
                {copy.tiersEyebrow}
              </p>
              <h2
                id="sponsorship-tiers-heading"
                className="mt-2 text-3xl font-bold text-[#3d4920] sm:text-4xl"
              >
                {copy.tiersTitle}
              </h2>
            </div>
            <div className="grid items-stretch gap-8 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))]">
              {copy.tiers.map((tier) => (
                <SponsorshipTierCard key={tier.name} copy={copy} tier={tier} />
              ))}
            </div>
          </section>

          <section
            aria-labelledby="shared-benefits-heading"
            className="mb-20 rounded-lg border border-[#e8e3d8] bg-white p-8 shadow-sm sm:p-12"
          >
            <h2
              id="shared-benefits-heading"
              className="text-center text-3xl font-bold text-[#3d4920] sm:text-4xl"
            >
              {copy.benefitsTitle}
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {copy.benefits.map((benefit) => (
                <article key={benefit.title}>
                  <h3 className="text-lg font-semibold text-[#3d4920]">
                    {benefit.title}
                  </h3>
                  <p className="mt-2 text-[0.95rem] leading-7 text-[#666]">
                    {benefit.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="impact-circle-heading"
            className="mb-20 rounded-lg bg-[linear-gradient(135deg,#3d4920_0%,#556b2f_100%)] p-8 text-white sm:p-16"
          >
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#f5f3ee]">
                {copy.impactEyebrow}
              </p>
              <h2
                id="impact-circle-heading"
                className="mt-3 text-3xl font-bold sm:text-4xl"
              >
                {copy.impactTitle}
              </h2>
              <p className="mt-5 text-lg leading-8 text-white/90">
                {copy.impactBody}
              </p>
            </div>
            <div className="mt-10 grid gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
              {copy.impactFeatures.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-md border-l-[3px] border-[#b8860b] bg-white/10 p-6"
                >
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/90">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="sponsorship-cta-heading"
            className="rounded-lg border border-[#e8e3d8] bg-white p-8 text-center shadow-sm sm:p-12"
          >
            <h2
              id="sponsorship-cta-heading"
              className="text-3xl font-bold text-[#3d4920] sm:text-4xl"
            >
              {copy.ctaTitle}
            </h2>
            <p className="mt-3 text-lg text-[#666]">{copy.ctaBody}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <SponsorshipCta label={copy.exploreTierAria}>
                {copy.exploreTier}
              </SponsorshipCta>
              <SponsorshipCta
                variant="outline"
                label={copy.scheduleConversationAria}
              >
                {copy.scheduleConversation}
              </SponsorshipCta>
            </div>
            {!sponsorshipCalendlyUrl ? (
              <p
                className="mx-auto mt-5 max-w-xl text-sm text-[#666]"
                role="status"
              >
                {copy.calendlyFallback}
              </p>
            ) : null}
            <p className="mt-6 text-sm text-[#666]">
              {copy.questionsPrefix}{" "}
              <a
                className="font-semibold text-[#3d4920] underline underline-offset-4"
                href={`mailto:${sponsorshipContactEmail}`}
              >
                {sponsorshipContactEmail}
              </a>
            </p>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
