import { NextResponse } from "next/server";

import {
  attachCheckoutSession,
  prepareCheckoutRegistration,
  storeSignupConsents,
} from "@/lib/stripe/registration";
import {
  parseSignupCheckoutInput,
  type SignupCheckoutInput,
  SignupValidationError,
} from "@/lib/signup-flow";
import { getStripe, getStripePriceId } from "@/lib/stripe/server";
import {
  createAdminClient,
  createPublicServerClient,
} from "@/utils/supabase/admin";

export const runtime = "nodejs";

async function findUserIdByEmail(email: string) {
  const supabase = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

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

async function resolveSignupUser(body: SignupCheckoutInput, origin: string) {
  const signupClient = createPublicServerClient();
  const email = body.email.trim().toLowerCase();
  const existingUserId = await findUserIdByEmail(email);

  if (existingUserId) {
    const { data: signIn, error: signInError } =
      await signupClient.auth.signInWithPassword({
        email,
        password: body.password,
      });

    if (signIn.user || signInError?.code === "email_not_confirmed") {
      return existingUserId;
    }

    throw new Error(
      "An account already exists for this email. Check your password or sign in instead.",
    );
  }

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
    throw new Error(
      "Verification emails are temporarily limited. Please wait a few minutes and try again.",
    );
  }
  if (signupError) throw signupError;
  if (!signup.user || signup.user.identities?.length === 0) {
    throw new Error(
      "An account already exists for this email. Check your password or sign in instead.",
    );
  }

  return signup.user.id;
}

export async function POST(request: Request) {
  try {
    const body = parseSignupCheckoutInput(await request.json());

    const origin = new URL(request.url).origin;
    const userId = await resolveSignupUser(body, origin);

    const supabase = createAdminClient();
    const prepared = await prepareCheckoutRegistration(supabase, {
      ...body,
      userId,
    });
    await storeSignupConsents(
      supabase,
      { ...body, userId, referralCode: prepared.referralCode ?? "" },
      prepared.requestId,
    );
    const stripe = getStripe();
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

    if (!session.url) {
      throw new Error("Secure checkout did not return a checkout URL.");
    }

    await attachCheckoutSession(supabase, prepared.requestId, session.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof SignupValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Unable to create Stripe Checkout session", error);
    return NextResponse.json(
      {
        error: "Unable to start secure checkout.",
      },
      { status: 500 },
    );
  }
}
