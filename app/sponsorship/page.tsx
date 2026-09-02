import type { Metadata } from "next";

import { SponsorshipPage } from "@/components/sponsorship/SponsorshipPage";
import { getSponsorshipPageCopy } from "@/lib/i18n/sponsorship-page-copy";
import { getRequestLocale } from "@/lib/i18n/server";

export function generateMetadata(): Metadata {
  const locale = getRequestLocale();
  const copy = getSponsorshipPageCopy(locale);

  return {
    title:
      locale === "fr-CA"
        ? "Commandites | Renforcer la résilience des organismes"
        : "Sponsorships | Strengthen nonprofit resilience",
    description: copy.heroBody,
    alternates: { canonical: "/sponsorship" },
    openGraph: {
      type: "website",
      url: "/sponsorship",
      title: copy.heroTitle,
      description: copy.tiersTitle,
    },
    twitter: {
      card: "summary_large_image",
      title: copy.heroEyebrow,
      description: copy.tiersTitle,
    },
  };
}

export default function SponsorshipRoute() {
  return <SponsorshipPage />;
}
