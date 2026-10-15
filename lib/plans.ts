import type { ActiveMembershipTier, MembershipTier } from "@/lib/types";
import { foundingPricing } from "@/lib/founding-pricing";

export interface MembershipPlan {
  id: ActiveMembershipTier;
  name: string;
  quarterlyPrice: number;
  annualPrice: number;
  seats: string;
  audience: string;
  summary: string;
  features: string[];
  notIncluded?: string[];
  popular?: boolean;
}

export const membershipPlans: MembershipPlan[] = [
  {
    id: "seedling",
    name: "Seedling",
    quarterlyPrice: foundingPricing.seedling.quarterly.standard,
    annualPrice: foundingPricing.seedling.annual.standard,
    seats: "5 seats included",
    audience: "Organizations with under $500k annual budget",
    summary:
      "Core governance operations, branded resources, and community access.",
    features: [
      "Board calendar, meetings, workflows, and packages",
      "Grant checklists, templates, dashboard, and deadlines",
      "Olea Connects™ Community, webinars, and forums",
      "48-hour email support",
    ],
    notIncluded: [
      "Board recruitment toolkit",
      "KPI and impact dashboard",
      "Board evaluation system",
      "ED/CEO 360 review",
      "Strategic planning module",
    ],
  },
  {
    id: "roots",
    name: "Roots",
    quarterlyPrice: foundingPricing.roots.quarterly.standard,
    annualPrice: foundingPricing.roots.annual.standard,
    seats: "10 seats included",
    audience: "Organizations with $500k-$2M annual budget",
    summary:
      "Deeper governance, recruitment, impact tracking, and learning support.",
    features: [
      "Everything in Seedling",
      "Board recruitment toolkit and skills matrix",
      "KPI and impact dashboard",
      "Board evaluation system",
      "Priority email support within 48 hours",
    ],
    notIncluded: [
      "ED/CEO 360 review",
      "Strategic planning module",
    ],
  },
  {
    id: "canopy",
    name: "Canopy",
    quarterlyPrice: foundingPricing.canopy.quarterly.standard,
    annualPrice: foundingPricing.canopy.annual.standard,
    seats: "15 seats included",
    audience: "Organizations with $2M+ annual budget",
    summary:
      "Complete governance systems, executive review, and strategy tools.",
    features: [
      "Everything in Roots",
      "ED/CEO 360 review",
      "Strategic planning module",
      "Board training modules",
      "Community leadership opportunities",
      "Priority phone and email support",
    ],
  },
];

export const signupMembershipPlans = membershipPlans;

export function getPlan(id: MembershipTier) {
  return membershipPlans.find((plan) => plan.id === id) ?? membershipPlans[1];
}
