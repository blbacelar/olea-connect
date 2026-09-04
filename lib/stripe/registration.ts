import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";
import { normalizeReferralCode } from "@/lib/referral-capture";
import { SignupValidationError } from "@/lib/signup-flow";
import type { MembershipTier, RegistrationState } from "@/lib/types";

type BillingCycle = RegistrationState["billingCycle"];

export {
  attachCheckoutSession,
  attemptUserWorkspaceProvisioning,
  attemptWorkspaceProvisioning,
  recoverCheckoutSessionProvisioning,
  recordStripeSubscription,
} from "@/lib/stripe/provisioning";
export {
  reconcilePendingCheckoutProvisioning,
} from "@/lib/stripe/provisioning-reconciliation";
export type {
  ProvisioningResult,
} from "@/lib/stripe/provisioning";
export type {
  ProvisioningReconciliationSummary,
} from "@/lib/stripe/provisioning-reconciliation";

export interface CheckoutRegistration {
  userId: string;
  email: string;
  fullName: string;
  organizationName: string;
  province: string;
  tier: MembershipTier;
  billingCycle: BillingCycle;
  organizationKind: RegistrationState["organizationKind"];
  annualBudgetRange: RegistrationState["annualBudgetRange"];
  boardSizeRange: RegistrationState["boardSizeRange"];
  phone: string;
  acquisitionSource: RegistrationState["acquisitionSource"];
  referralCode: string;
  consents: RegistrationState["consents"];
}

type CheckoutAuthUser = {
  email?: string | null;
  email_confirmed_at?: string | null;
};

type ExistingProvisioningRequest = {
  id: string;
  status: string;
  referral_code: string | null;
  founding_member_eligible: boolean | null;
  founding_discount_identifier: string | null;
  founding_member_year: number | null;
};

async function validateOrganizationReferral(
  supabase: SupabaseClient,
  registration: CheckoutRegistration,
  organizationId: string,
) {
  const { data: currentMembership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", registration.userId)
    .eq("status", "active")
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (currentMembership?.organization_id === organizationId) {
    throw new SignupValidationError(
      "You cannot use your own organization referral code.",
    );
  }
}

async function validatePartnerReferral(
  supabase: SupabaseClient,
  registration: CheckoutRegistration,
  referralCode: string,
) {
  const { data: partnerReferral, error: partnerReferralError } = await supabase
    .from("referral_links")
    .select("id, referrers(email, status)")
    .eq("code", referralCode)
    .eq("active", true)
    .maybeSingle();
  if (partnerReferralError) throw partnerReferralError;

  const referrer = Array.isArray(partnerReferral?.referrers)
    ? partnerReferral?.referrers[0]
    : partnerReferral?.referrers;
  if (!partnerReferral || referrer?.status !== "approved") {
    throw new SignupValidationError("That referral code is invalid or expired.");
  }

  if (referrer.email?.toLowerCase() === registration.email.toLowerCase()) {
    throw new SignupValidationError("You cannot use your own referral link.");
  }
}

async function validateCheckoutReferralCode(
  supabase: SupabaseClient,
  registration: CheckoutRegistration,
  referralCode: string,
) {
  const { data: organizationReferral, error: organizationReferralError } =
    await supabase
      .from("referral_codes")
      .select("organization_id")
      .eq("code", referralCode)
      .eq("active", true)
      .maybeSingle();
  if (organizationReferralError) throw organizationReferralError;

  if (organizationReferral) {
    await validateOrganizationReferral(
      supabase,
      registration,
      organizationReferral.organization_id,
    );
    return;
  }

  await validatePartnerReferral(supabase, registration, referralCode);
}

async function assertCheckoutAuthUser(
  supabase: SupabaseClient,
  registration: CheckoutRegistration,
) {
  const { data: authUser, error: authError } =
    await supabase.auth.admin.getUserById(registration.userId);

  if (authError || !authUser.user) {
    throw new SignupValidationError("The signup account could not be verified.");
  }

  if (
    authUser.user.email?.toLowerCase() !== registration.email.toLowerCase()
  ) {
    throw new SignupValidationError("The checkout email does not match the signup account.");
  }

  return authUser.user as CheckoutAuthUser;
}

async function getExistingProvisioningRequest(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data: existing, error: lookupError } = await supabase
    .from("workspace_provisioning_requests")
    .select(
      "id, status, referral_code, founding_member_eligible, founding_discount_identifier, founding_member_year",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing?.status === "completed") {
    throw new SignupValidationError("This account already has an active workspace.");
  }

  return existing as ExistingProvisioningRequest | null;
}

function getFoundingReservationSnapshot(
  existing: ExistingProvisioningRequest | null,
) {
  return {
    founding_member_eligible: existing?.founding_member_eligible ?? false,
    founding_discount_identifier:
      existing?.founding_discount_identifier ?? null,
    founding_member_year: existing?.founding_member_year ?? null,
  };
}

function getBillingInterval(billingCycle: BillingCycle) {
  return billingCycle === "annual" ? "year" : "month";
}

function getProvisioningStatus(authUser: CheckoutAuthUser) {
  return authUser.email_confirmed_at
    ? "pending_payment"
    : "pending_verification";
}

function buildProvisioningRequestValues({
  authUser,
  existing,
  referralCode,
  registration,
}: {
  authUser: CheckoutAuthUser;
  existing: ExistingProvisioningRequest | null;
  referralCode: string;
  registration: CheckoutRegistration;
}) {
  return {
    user_id: registration.userId,
    email: registration.email.trim().toLowerCase(),
    full_name: registration.fullName.trim(),
    organization_name: registration.organizationName.trim(),
    province_or_region: registration.province,
    organization_kind: registration.organizationKind,
    annual_budget_range: registration.annualBudgetRange,
    board_size_range: registration.boardSizeRange,
    contact_phone: registration.phone.trim() || null,
    acquisition_source: registration.acquisitionSource || null,
    referral_code: referralCode || null,
    referral_status: referralCode ? "pending" : "none",
    ...getFoundingReservationSnapshot(existing),
    plan_id: registration.tier,
    billing_interval: getBillingInterval(registration.billingCycle),
    status: getProvisioningStatus(authUser),
    last_error: null,
  };
}

async function upsertProvisioningRequest({
  existing,
  supabase,
  values,
}: {
  existing: ExistingProvisioningRequest | null;
  supabase: SupabaseClient;
  values: ReturnType<typeof buildProvisioningRequestValues>;
}) {
  const query = existing
    ? supabase
        .from("workspace_provisioning_requests")
        .update(values)
        .eq("id", existing.id)
    : supabase.from("workspace_provisioning_requests").insert(values);
  const { data, error } = await query.select("id").single();

  if (error) throw error;
  return data.id as string;
}

export async function prepareCheckoutRegistration(
  supabase: SupabaseClient,
  registration: CheckoutRegistration,
) {
  const authUser = await assertCheckoutAuthUser(supabase, registration);
  const existing = await getExistingProvisioningRequest(
    supabase,
    registration.userId,
  );
  const referralCode =
    normalizeReferralCode(existing?.referral_code ?? registration.referralCode) ?? "";
  if (referralCode) {
    await validateCheckoutReferralCode(supabase, registration, referralCode);
  }

  const foundingCouponId = process.env.STRIPE_FOUNDING_COUPON_ID ?? "";
  const requestId = await upsertProvisioningRequest({
    existing,
    supabase,
    values: buildProvisioningRequestValues({
      authUser,
      existing,
      referralCode,
      registration,
    }),
  });

  return reserveFoundingMember(
    supabase,
    requestId,
    foundingCouponId,
    referralCode || null,
  );
}

async function reserveFoundingMember(
  supabase: SupabaseClient,
  requestId: string,
  couponId: string,
  referralCode: string | null,
) {
  if (!couponId) {
    return {
      requestId,
      referralCode,
      foundingMemberEligible: false,
      foundingDiscountIdentifier: null,
    };
  }

  const { data, error } = await supabase.rpc("reserve_founding_member", {
    target_request_id: requestId,
    target_discount_identifier: couponId,
  });
  if (error) throw error;

  const result = data as {
    eligible?: boolean;
    discount_identifier?: string | null;
  };
  return {
    requestId,
    referralCode,
    foundingMemberEligible: result.eligible === true,
    foundingDiscountIdentifier:
      result.eligible === true ? result.discount_identifier ?? couponId : null,
  };
}

export async function storeSignupConsents(
  supabase: SupabaseClient,
  registration: CheckoutRegistration,
  requestId: string,
) {
  if (!Object.values(registration.consents).every(Boolean)) {
    throw new SignupValidationError("Review and accept all required policies.");
  }

  const documents = [
    ["terms_of_service", LEGAL_DOCUMENTS.terms],
    ["privacy_policy", LEGAL_DOCUMENTS.privacy],
    ["data_ownership", LEGAL_DOCUMENTS.dataOwnership],
    ["confidentiality", LEGAL_DOCUMENTS.confidentiality],
  ] as const;

  const { error } = await supabase.from("privacy_consents").upsert(
    documents.map(([consentType, document]) => ({
      user_id: registration.userId,
      signup_request_id: requestId,
      consent_type: consentType,
      policy_version: document.version,
      granted: true,
      document_path: document.href,
      context: {
        tier: registration.tier,
        billing_cycle: registration.billingCycle,
        organization_kind: registration.organizationKind,
        referral_present: Boolean(registration.referralCode),
      },
    })),
    { onConflict: "signup_request_id,consent_type" },
  );

  if (error) throw error;
}
