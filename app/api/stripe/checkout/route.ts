import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  attachCheckoutSession,
  prepareCheckoutRegistration,
  storeSignupConsents,
} from "@/lib/stripe/registration";
import {
  parseSignupCheckoutInput,
  type SignupCheckoutInput,
} from "@/lib/signup-flow";
import {
  CHECKOUT_EMAIL_RATE_LIMIT_MESSAGE,
  CheckoutAccountStateError,
  CheckoutRateLimitError,
  getCheckoutErrorResponse,
} from "@/lib/stripe/checkout-errors";
import { getStripe, getStripePriceId } from "@/lib/stripe/server";
import {
  createAdminClient,
  createPublicServerClient,
} from "@/utils/supabase/admin";

export const runtime = "nodejs";

type CheckoutStage =
  | "parse_request"
  | "initialize_signup_client"
  | "initialize_auth_admin"
  | "lookup_signup_user"
  | "sign_in_signup_user"
  | "create_signup_user"
  | "initialize_registration_admin"
  | "prepare_registration"
  | "store_consents"
  | "initialize_stripe"
  | "resolve_price"
  | "create_checkout_session"
  | "validate_checkout_session"
  | "attach_checkout_session";

function getSafeErrorDetails(error: unknown) {
  const errorWithMetadata =
    typeof error === "object" && error !== null
      ? (error as { code?: unknown; type?: unknown })
      : undefined;

  return {
    errorName: error instanceof Error ? error.name || "Error" : "UnknownError",
    ...(typeof errorWithMetadata?.code === "string"
      ? { errorCode: errorWithMetadata.code }
      : {}),
    ...(typeof errorWithMetadata?.type === "string"
      ? { errorType: errorWithMetadata.type }
      : {}),
  };
}

async function findUserIdByEmail(
  email: string,
  setStage: (stage: CheckoutStage) => void,
) {
  setStage("initialize_auth_admin");
  const supabase = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  setStage("lookup_signup_user");
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === normalizedEmail,
    );
    if (user) return user.id;
    if (data.users.length < 1000) break;
  }

  return null;
}

async function resolveSignupUser(
  body: SignupCheckoutInput,
  origin: string,
  setStage: (stage: CheckoutStage) => void,
) {
  setStage("initialize_signup_client");
  const signupClient = createPublicServerClient();
  const email = body.email.trim().toLowerCase();
  const existingUserId = await findUserIdByEmail(email, setStage);

  if (existingUserId) {
    setStage("sign_in_signup_user");
    const { data: signIn, error: signInError } =
      await signupClient.auth.signInWithPassword({
        email,
        password: body.password,
      });

    if (signIn.user || signInError?.code === "email_not_confirmed") {
      return existingUserId;
    }
    if (signInError?.code === "invalid_credentials" || !signInError) {
      throw new CheckoutAccountStateError();
    }

    throw signInError;
  }

  setStage("create_signup_user");
  const { data: signup, error: signupError } = await signupClient.auth.signUp({
    email,
    password: body.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: body.fullName.trim(),
        organization_name: body.organizationName.trim(),
        organization_kind: body.organizationKind,
        annual_budget_range: body.annualBudgetRange,
        board_size_range: body.boardSizeRange,
        contact_phone: body.phone || null,
        acquisition_source: body.acquisitionSource || null,
        referral_code: body.referralCode || null,
        membership_tier: body.tier,
        billing_cycle: body.billingCycle,
        billing_province: body.province,
      },
    },
  });

  if (signupError?.code === "over_email_send_rate_limit") {
    throw new CheckoutRateLimitError(CHECKOUT_EMAIL_RATE_LIMIT_MESSAGE);
  }
  if (signupError) throw signupError;
  if (!signup.user || signup.user.identities?.length === 0) {
    throw new CheckoutAccountStateError();
  }

  return signup.user.id;
}

export async function POST(request: Request) {
  const correlationId = randomUUID();
  let stage: CheckoutStage = "parse_request";
  let checkoutContext:
    | Pick<SignupCheckoutInput, "tier" | "billingCycle">
    | undefined;

  try {
    const body = parseSignupCheckoutInput(await request.json());
    checkoutContext = {
      tier: body.tier,
      billingCycle: body.billingCycle,
    };

    const origin = new URL(request.url).origin;
    const userId = await resolveSignupUser(body, origin, (nextStage) => {
      stage = nextStage;
    });

    stage = "initialize_registration_admin";
    const supabase = createAdminClient();
    stage = "prepare_registration";
    const prepared = await prepareCheckoutRegistration(supabase, {
      ...body,
      userId,
    });
    stage = "store_consents";
    await storeSignupConsents(
      supabase,
      { ...body, userId, referralCode: prepared.referralCode ?? "" },
      prepared.requestId,
    );
    stage = "initialize_stripe";
    const stripe = getStripe();
    stage = "resolve_price";
    const priceId = getStripePriceId(body.tier, body.billingCycle);
    const metadata = {
      provisioning_request_id: prepared.requestId,
      user_id: userId,
      plan_id: body.tier,
      billing_cycle: body.billingCycle,
      organization_kind: body.organizationKind,
      annual_budget_range: body.annualBudgetRange,
      board_size_range: body.boardSizeRange,
      province: body.province,
      referral_code: prepared.referralCode,
      founding_member_eligible: String(prepared.foundingMemberEligible),
      founding_member_year: prepared.foundingMemberEligible ? "1" : "",
      consent_version: "2026-07-24",
    };

    stage = "create_checkout_session";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: body.email.trim().toLowerCase(),
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      billing_address_collection: "required",
      allow_promotion_codes: !prepared.foundingDiscountIdentifier,
      ...(prepared.foundingDiscountIdentifier
        ? { discounts: [{ coupon: prepared.foundingDiscountIdentifier }] }
        : {}),
      metadata,
      subscription_data: { metadata },
      success_url: `${origin}/signup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/signup/payment?payment=canceled`,
    });

    stage = "validate_checkout_session";
    if (!session.url) {
      throw new Error("Secure checkout did not return a checkout URL.");
    }

    stage = "attach_checkout_session";
    await attachCheckoutSession(supabase, prepared.requestId, session.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const safeResponse = getCheckoutErrorResponse(error);
    if (safeResponse) {
      return NextResponse.json(
        { code: safeResponse.code, error: safeResponse.error },
        { status: safeResponse.status },
      );
    }

    console.error("Unable to create Stripe Checkout session", {
      correlationId,
      stage,
      ...checkoutContext,
      ...getSafeErrorDetails(error),
    });
    return NextResponse.json(
      {
        code: "checkout_unavailable",
        error: "Unable to start secure checkout.",
        correlationId,
      },
      { status: 500 },
    );
  }
}
