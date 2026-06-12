import type { MembershipTier } from "@/lib/types";

export interface MembershipPlan {
  id: MembershipTier;
  name: string;
  icon: string;
  monthlyPrice: number;
  annualPrice: number;
  seats: string;
  audience: string;
  summary: string;
  features: string[];
  popular?: boolean;
}

export const membershipPlans: MembershipPlan[] = [
  {
    id: "seedling",
    name: "Seedling",
    icon: "🌱",
    monthlyPrice: 44,
    annualPrice: 440,
    seats: "1 seat",
    audience: "Grassroots and small organizations",
    summary: "Choose the resources that matter most right now.",
    features: [
      "Choose any 3 governance templates",
      "Branded document downloads",
      "Ebooks and tutorial videos",
      "Full Olea community access",
      "Weekly grant alerts",
    ],
  },
  {
    id: "roots",
    name: "Roots",
    icon: "🌿",
    monthlyPrice: 99,
    annualPrice: 990,
    seats: "2 seats",
    audience: "Organizations building capacity",
    summary: "A complete, branded governance toolkit for your team.",
    features: [
      "Full governance template suite",
      "Customized branded templates",
      "Live how-to webinars",
      "Quarterly governance guide",
      "Annual organizational health check",
      "Full Olea community access",
    ],
    popular: true,
  },
  {
    id: "canopy",
    name: "Canopy",
    icon: "🌳",
    monthlyPrice: 225,
    annualPrice: 2250,
    seats: "3 seats",
    audience: "Established organizations",
    summary: "The full resource library, learning calendar, and funder access.",
    features: [
      "Everything in Roots",
      "Full library across all topics",
      "Monthly speaker webinars",
      "Funder AMA sessions",
      "Annual virtual summit",
      "Full Olea community access",
    ],
  },
  {
    id: "harvest",
    name: "Harvest",
    icon: "🫒",
    monthlyPrice: 1350,
    annualPrice: 13500,
    seats: "3 seats",
    audience: "Organizations needing hands-on help",
    summary: "Full platform access plus CEO-delivered fractional administration.",
    features: [
      "Everything in Canopy",
      "5 hours of admin support monthly",
      "2 additional in-kind hours",
      "Board packages prepared",
      "Committee minutes drafted",
      "Monthly CEO strategy call",
      "Limited to 6 seats"
    ],
  },
];

export function getPlan(id: MembershipTier) {
  return membershipPlans.find((plan) => plan.id === id) ?? membershipPlans[1];
}
