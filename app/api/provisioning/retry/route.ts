import { NextResponse } from "next/server";
import * as z from "zod";

import { logError } from "@/lib/observability/logger";
import { getPostActivationPath } from "@/lib/onboarding/post-activation";
import { getSiteUrl } from "@/lib/site-metadata";
import {
  attachCheckoutSession,
  attemptUserWorkspaceProvisioning,
  recoverCheckoutSessionProvisioning,
  reserveFoundingMember,
} from "@/lib/stripe/registration";
import { assertFoundingCouponConfiguration } from "@/lib/stripe/founding-member";
import { getStripe, getStripePriceId } from "@/lib/stripe/server";
import type { RegistrationState } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type BillingCycle = RegistrationState["billingCycle"];

const pendingPaymentRequestSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  email: z.string().email(),
  plan_id: z.enum(["seedling", "roots", "canopy", "harvest"]),
  billing_interval: z.enum(["month", "year"]),
  province_or_region: z.string().nullable(),
  organization_kind: z.string().nullable(),
  annual_budget_range: z.string().nullable(),
  board_size_range: z.string().nullable(),
  referral_code: z.string().nullable(),
  founding_member_eligible: z.boolean().nullable(),
  founding_discount_identifier: z.string().max(255).nullable(),
  founding_member_year: z.number().int().positive().nullable(),
  founding_offer_requested: z.boolean(),
  checkout_session_id: z.string().max(255).nullable(),
});

type PendingPaymentRequest = z.infer<typeof pendingPaymentRequestSchema>;

function getBillingCycle(interval: PendingPaymentRequest["billing_interval"]): BillingCycle {
  return interval === "year" ? "annual" : "quarterly";
}

function buildPendingCheckoutMetadata(request: PendingPaymentRequest) {
  const billingCycle = getBillingCycle(request.billing_interval);

  return {
    annual_budget_range: request.annual_budget_range ?? "",
    billing_cycle: billingCycle,
    board_size_range: request.board_size_range ?? "",
    consent_version: "2026-07-24",
    founding_member_eligible: String(request.founding_member_eligible === true),
    founding_member_year:
      request.founding_member_eligible === true
        ? String(request.founding_member_year ?? 1)
        : "",
    organization_kind: request.organization_kind ?? "",
    plan_id: request.plan_id,
    province: request.province_or_region ?? "",
    provisioning_request_id: request.id,
    referral_code: request.referral_code ?? "",
    user_id: request.user_id,
  };
}

async function getPendingPaymentRequest(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const { data, error } = await admin
    .from("workspace_provisioning_requests")
    .select(
      [
        "id",
        "user_id",
        "email",
        "plan_id",
        "billing_interval",
        "province_or_region",
        "organization_kind",
        "annual_budget_range",
        "board_size_range",
        "referral_code",
        "founding_member_eligible",
        "founding_discount_identifier",
        "founding_member_year",
        "founding_offer_requested",
        "checkout_session_id",
      ].join(", "),
    )
    .eq("user_id", userId)
    .eq("status", "pending_payment")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? pendingPaymentRequestSchema.parse(data) : null;
}

async function createPendingPaymentCheckout({
  admin,
  userId,
}: {
  admin: ReturnType<typeof createAdminClient>;
  userId: string;
}) {
  let request = await getPendingPaymentRequest(admin, userId);
  if (!request) return {};

  if (request.checkout_session_id) {
    const existingSession = await getStripe().checkout.sessions.retrieve(
      request.checkout_session_id,
    );
    if (existingSession.status === "open" && existingSession.url) {
      return { checkoutUrl: existingSession.url };
    }
    if (existingSession.status === "complete") {
      return {
        provisioningResult: await recoverCheckoutSessionProvisioning(
          admin,
          request.checkout_session_id,
        ),
      };
    }
  }

  if (request.founding_offer_requested) {
    const couponId = await assertFoundingCouponConfiguration(getStripe());
    const reservation = await reserveFoundingMember(
      admin,
      request.id,
      couponId,
      request.referral_code,
    );
    request = {
      ...request,
      founding_member_eligible: reservation.foundingMemberEligible,
      founding_discount_identifier:
        reservation.foundingDiscountIdentifier,
      founding_member_year: reservation.foundingMemberEligible ? 1 : null,
    };
  }

  const origin = getSiteUrl();
  const billingCycle = getBillingCycle(request.billing_interval);
  const metadata = buildPendingCheckoutMetadata(request);
  const session = await getStripe().checkout.sessions.create(
    {
      mode: "subscription",
      customer_email: request.email,
      client_reference_id: request.user_id,
      line_items: [
        {
          price: getStripePriceId(request.plan_id, billingCycle),
          quantity: 1,
        },
      ],
      billing_address_collection: "required",
      allow_promotion_codes: !request.founding_discount_identifier,
      ...(request.founding_discount_identifier
        ? { discounts: [{ coupon: request.founding_discount_identifier }] }
        : {}),
      metadata,
      subscription_data: { metadata },
      success_url: `${origin}/signup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/signup/success?activation=pending_payment&payment=canceled`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60 + 5,
    },
    {
      idempotencyKey: [
        "signup-checkout",
        request.id,
        request.checkout_session_id ?? "initial",
      ].join(":"),
    },
  );

  if (!session.url) {
    throw new Error("Secure checkout did not return a checkout URL.");
  }

  await attachCheckoutSession(admin, request.id, session.id);
  return { checkoutUrl: session.url };
}

export async function POST(_request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to retry membership activation." },
      { status: 401 },
    );
  }

  try {
    const admin = createAdminClient();
    let result = await attemptUserWorkspaceProvisioning(
      admin,
      user.id,
    );

    if (!result) {
      return NextResponse.json({
        status: "not_found",
        error: "No membership activation was found for this account.",
      });
    }

    const checkout =
      result.status === "pending_payment"
        ? await createPendingPaymentCheckout({ admin, userId: user.id })
        : {};
    if (checkout.provisioningResult) {
      result = checkout.provisioningResult;
    }
    const nextPath = result.status === "completed"
      ? await getPostActivationPath(admin, result.organization_id)
      : undefined;

    return NextResponse.json({ ...result, checkoutUrl: checkout.checkoutUrl, nextPath }, {
      status: result.status === "failed" ? 409 : 200,
    });
  } catch (error) {
    logError("Unable to retry workspace provisioning", error);
    return NextResponse.json(
      { error: "Activation could not be retried. Please try again shortly." },
      { status: 500 },
    );
  }
}
