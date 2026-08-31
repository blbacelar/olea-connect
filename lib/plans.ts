import type { MembershipTier } from "@/lib/types";

export interface MembershipPlan {
  id: MembershipTier;
  name: string;
  quarterlyPrice: number;
  annualPrice: number;
  foundingQuarterlyPrice: number;
  foundingAnnualPrice: number;
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
    quarterlyPrice: 200,
    annualPrice: 800,
    foundingQuarterlyPrice: 170,
    foundingAnnualPrice: 680,
    seats: "5 seats included",
    audience: "Organizations with under $500k annual budget",
    summary:
      "Core governance operations, branded resources, and community access.",
    features: [
      "Board calendar, meetings, workflows, and packages",
      "Board HR directory, roles, and term tracking",
      "Grant checklists, templates, dashboard, and deadlines",
      "Olea Connects™ Community, webinars, and forums",
      "Branded templates and quarterly Olea Gives applications",
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
    quarterlyPrice: 800,
    annualPrice: 3200,
    foundingQuarterlyPrice: 680,
    foundingAnnualPrice: 2720,
    seats: "10 seats included",
    audience: "Organizations with $500k-$2M annual budget",
    summary:
      "Deeper governance, recruitment, impact tracking, and learning support.",
    features: [
      "Everything in Seedling",
      "Board recruitment toolkit and skills matrix",
      "KPI and impact dashboard",
      "Quarterly Impact Accelerator Cohorts",
      "Sponsor webinars",
      "Priority email support within 48 hours",
    ],
    notIncluded: [
      "Board evaluation system",
      "ED/CEO 360 review",
      "Strategic planning module",
    ],
  },
  {
    id: "canopy",
    name: "Canopy",
    quarterlyPrice: 1500,
    annualPrice: 6000,
    foundingQuarterlyPrice: 1275,
    foundingAnnualPrice: 5100,
    seats: "15 seats included",
    audience: "Organizations with $2M-$5M annual budget",
    summary:
      "Complete governance systems, executive review, and strategy tools.",
    features: [
      "Everything in Roots",
      "Board evaluation system",
      "ED/CEO 360 review",
      "Strategic planning module",
      "Board training modules",
      "Community leadership opportunities",
      "10% off coaching and admin add-ons",
      "Priority phone and email support",
    ],
    popular: true,
  },
  {
    id: "harvest",
    name: "Harvest",
    quarterlyPrice: 2400,
    annualPrice: 9600,
    foundingQuarterlyPrice: 2040,
    foundingAnnualPrice: 8160,
    seats: "20 seats included",
    audience: "Organizations with $5M+ annual budget",
    summary:
      "Enterprise support, facilitation, thought leadership, and introductions.",
    features: [
      "Everything in Canopy",
      "Annual onboarding and board training facilitation",
      "Board retreat facilitation support",
      "Thought leader positioning",
      "Peer networking and board-level introductions",
      "Olea Connects™ summit speaking slot",
      "10% off coaching and admin add-ons",
    ],
  },
];

export function getPlan(id: MembershipTier) {
  return membershipPlans.find((plan) => plan.id === id) ?? membershipPlans[1];
}
