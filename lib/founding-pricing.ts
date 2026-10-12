import type { RegistrationState } from "@/lib/types";

type SignupTier = "seedling" | "roots" | "canopy";
type BillingCycle = RegistrationState["billingCycle"];

export const foundingPricing: Record<
  SignupTier,
  Record<BillingCycle, { standard: number; founding: number }>
> = {
  seedling: {
    annual: { standard: 1180, founding: 1000 },
    quarterly: { standard: 325, founding: 275 },
  },
  roots: {
    annual: { standard: 3530, founding: 3000 },
    quarterly: { standard: 975, founding: 825 },
  },
  canopy: {
    annual: { standard: 7060, founding: 6000 },
    quarterly: { standard: 1950, founding: 1650 },
  },
};

export function isSignupTier(value: string): value is SignupTier {
  return value === "seedling" || value === "roots" || value === "canopy";
}

export function getFoundingPrice(tier: SignupTier, cycle: BillingCycle) {
  return foundingPricing[tier][cycle];
}

export function getFoundingSavings(tier: SignupTier) {
  const { annual } = foundingPricing[tier];
  return 2 * (annual.standard - annual.founding);
}
