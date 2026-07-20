import type { Metadata } from "next";

import { SponsorshipPage } from "@/components/sponsorship/SponsorshipPage";
import { getSiteUrl } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: "Sponsorships | Strengthen nonprofit resilience",
  description:
    "Partner with Olea Connects to strengthen nonprofit resilience through collaboration, community, and shared impact.",
  alternates: { canonical: "/sponsorship" },
  openGraph: {
    type: "website",
    url: `${getSiteUrl()}/sponsorship`,
    title: "Partner with Olea Connects to strengthen nonprofit resilience",
    description:
      "Explore five sponsorship pathways and the Catalyst Impact Circle.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Olea Connects sponsorships",
    description:
      "Explore five sponsorship pathways and the Catalyst Impact Circle.",
  },
};

export default function SponsorshipRoute() {
  return <SponsorshipPage />;
}
