import { NextResponse } from "next/server";

import {
  attachCheckoutSession,
  prepareCheckoutRegistration,
} from "@/lib/stripe/registration";
import { getStripe, getStripePriceId } from "@/lib/stripe/server";
import type { MembershipTier, RegistrationState } from "@/lib/types";
import {
  createAdminClient,
  createPublicServerClient,
} from "@/utils/supabase/admin";

export const runtime = "nodejs";

const tiers: MembershipTier[] = ["seedling", "roots", "canopy", "harvest"];
const billingCycles: RegistrationState["billingCycle"][] = [
  "monthly",
  "annual",
];

interface CheckoutBody {
  email?: string;
  password?: string;
  fullName?: string;
  organizationName?: string;
  province?: string;
  tier?: MembershipTier;
  billingCycle?: RegistrationState["billingCycle"];
}

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

async function resolveSignupUser(body: Required<CheckoutBody>, origin: string) {
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

function isCheckoutBody(value: CheckoutBody): value is Required<CheckoutBody> {
  return Boolean(
    value.email &&
      value.password &&
      value.password.length >= 8 &&
      value.fullName?.trim() &&
      value.organizationName?.trim() &&
      value.province &&
      value.tier &&
      tiers.includes(value.tier) &&
      value.billingCycle &&
      billingCycles.includes(value.billingCycle),
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;

    if (!isCheckoutBody(body)) {
      return NextResponse.json(
        { error: "Complete your account and plan details before checkout." },
        { status: 400 },
      );
    }

    const origin = new URL(request.url).origin;
    const userId = await resolveSignupUser(body, origin);

    const supabase = createAdminClient();
    const prepared = await prepareCheckoutRegistration(supabase, {
      ...body,
      userId,
    });
    const stripe = getStripe();
    const priceId = getStripePriceId(body.tier, body.billingCycle);
    const metadata = {
      provisioning_request_id: prepared.requestId,
      user_id: userId,
      plan_id: body.tier,
      billing_cycle: body.billingCycle,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: body.email.trim().toLowerCase(),
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      billing_address_collection: "required",
      allow_promotion_codes: true,
      metadata,
      subscription_data: { metadata },
      success_url: `${origin}/signup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/signup/payment?payment=canceled`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    await attachCheckoutSession(supabase, prepared.requestId, session.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Unable to create Stripe Checkout session", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start secure checkout.",
      },
      { status: 500 },
    );
  }
}
