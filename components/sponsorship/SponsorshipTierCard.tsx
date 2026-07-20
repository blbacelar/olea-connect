import { Check } from "lucide-react";

import { SponsorshipCta } from "@/components/sponsorship/SponsorshipCta";
import { cn } from "@/lib/utils";
import type { SponsorshipTier } from "@/lib/sponsorship-content";

export function SponsorshipTierCard({ tier }: { tier: SponsorshipTier }) {
  return (
    <article
      className={cn(
        "group flex flex-col rounded-lg border border-[#e8e3d8] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#b8860b] hover:shadow-[0_12px_24px_rgba(61,73,32,0.1)] sm:p-8",
        tier.featured &&
          "relative border-2 border-[#b8860b] bg-[linear-gradient(135deg,rgba(184,134,11,0.08),transparent)] lg:scale-[1.02]",
      )}
      data-testid={`sponsorship-tier-${tier.name.toLowerCase().replaceAll(" ", "-")}`}
    >
      {tier.featured ? (
        <span className="absolute right-4 top-4 rounded-full bg-[#8a6500] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-white">
          Premium Tier
        </span>
      ) : null}
      <div
        className="mb-4 flex size-12 items-center justify-center rounded-full bg-[#f5f3ee] text-2xl"
        aria-hidden="true"
      >
        {tier.icon}
      </div>
      <h3 className="text-2xl font-semibold text-[#3d4920]">{tier.name}</h3>
      <p className="mt-1 text-base font-semibold text-[#8a6500]">
        Contact us for pricing
      </p>
      <p className="mt-1 text-sm italic text-[#666]">{tier.subtitle}</p>
      <p className="mt-3 text-[0.95rem] leading-7 text-[#666]">
        {tier.description}
      </p>
      {tier.availability ? (
        <p className="mt-4 text-sm font-semibold text-[#8a6500]">
          {tier.availability}
        </p>
      ) : null}
      <ul className="mt-4 space-y-2 text-sm leading-6 text-[#666]">
        {tier.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check
              className="mt-1 size-4 shrink-0 text-[#9caf88]"
              aria-hidden="true"
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <SponsorshipCta
        className="mt-6 w-full bg-[#3d4920] text-white hover:bg-[#556b2f]"
        label={`Learn more about the ${tier.name} sponsorship tier`}
      >
        {tier.featured ? "Become a Catalyst" : "Learn More"}
      </SponsorshipCta>
    </article>
  );
}
