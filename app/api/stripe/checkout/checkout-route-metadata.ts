import type { SignupCheckoutInput } from "@/lib/signup-flow";
import type { prepareCheckoutRegistration } from "@/lib/stripe/registration";

export function buildCheckoutMetadata({
  body,
  prepared,
  userId,
}: {
  body: SignupCheckoutInput;
  prepared: Awaited<ReturnType<typeof prepareCheckoutRegistration>>;
  userId: string;
}) {
  return {
    annual_budget_range: body.annualBudgetRange,
    billing_cycle: body.billingCycle,
    board_size_range: body.boardSizeRange,
    consent_version: "2026-07-24",
    founding_member_eligible: String(prepared.foundingMemberEligible),
    founding_member_year: prepared.foundingMemberEligible ? "1" : "",
    organization_kind: body.organizationKind,
    plan_id: body.tier,
    province: body.province,
    provisioning_request_id: prepared.requestId,
    referral_code: prepared.referralCode,
    user_id: userId,
  };
}
