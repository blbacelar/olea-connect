import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  prepareCheckoutRegistration,
  storeSignupConsents,
  validateFoundingMemberCode,
  validateSignupReferralCode,
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
import { logError } from "@/lib/observability/logger";
import { getSiteUrl } from "@/lib/site-metadata";
import {
  createAdminClient,
  createPublicServerClient,
} from "@/utils/supabase/admin";

export const runtime = "nodejs";

type CheckoutStage =
  | "parse_request"
  | "initialize_signup_client"
  | "validate_referral"
  | "validate_founding_code"
  | "create_signup_user"
  | "initialize_registration_admin"
  | "prepare_registration"
  | "store_consents";

const VERIFICATION_PENDING_RESPONSE = {
  nextPath: "/signup/success?activation=pending_verification",
  status: "verification_required",
} as const;
const MIN_CHECKOUT_RESPONSE_MS = 900;

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

async function resolveSignupUser(
  body: SignupCheckoutInput,
  origin: string,
  setStage: (stage: CheckoutStage) => void,
) {
  setStage("initialize_signup_client");
  const signupClient = createPublicServerClient();
  const email = body.email.trim().toLowerCase();

  return createSignupUser({ body, email, origin, setStage, signupClient });
}

async function createSignupUser({
  body,
  email,
  origin,
  setStage,
  signupClient,
}: {
  body: SignupCheckoutInput;
  email: string;
  origin: string;
  setStage: (stage: CheckoutStage) => void;
  signupClient: ReturnType<typeof createPublicServerClient>;
}) {
  setStage("create_signup_user");
  const signupAttemptId = randomUUID();
  const { data: signup, error: signupError } = await signupClient.auth.signUp({
    email,
    password: body.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        signup_attempt_id: signupAttemptId,
        full_name: body.fullName.trim(),
        organization_name: body.organizationName.trim(),
        organization_kind: body.organizationKind,
        annual_budget_range: body.annualBudgetRange,
        board_size_range: body.boardSizeRange,
        contact_phone: body.phone || null,
        acquisition_source: body.acquisitionSource || null,
        referral_code: body.referralCode || null,
        founding_member_code_supplied: Boolean(body.foundingMemberCode),
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
  if (!signup.user) {
    throw new CheckoutAccountStateError();
  }

  return {
    createdByRequest:
      (signup.user.identities?.length ?? 0) > 0 &&
      signup.user.user_metadata?.signup_attempt_id === signupAttemptId,
    userId: signup.user.id,
  };
}

async function equalizeSuccessfulResponseTiming(startedAt: number) {
  const remaining = MIN_CHECKOUT_RESPONSE_MS - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

export async function POST(request: Request) {
  const correlationId = randomUUID();
  const startedAt = Date.now();
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

    await createSignupActivationRequest({
      body,
      setStage: (nextStage) => {
        stage = nextStage;
      },
    });

    await equalizeSuccessfulResponseTiming(startedAt);
    return NextResponse.json(VERIFICATION_PENDING_RESPONSE);
  } catch (error) {
    const safeResponse = getCheckoutErrorResponse(error);
    if (safeResponse) {
      return NextResponse.json(
        { code: safeResponse.code, error: safeResponse.error },
        { status: safeResponse.status },
      );
    }

    const safeErrorDetails = getSafeErrorDetails(error);
    logError("Unable to create Stripe Checkout session", safeErrorDetails, {
      correlationId,
      stage,
      ...checkoutContext,
      ...safeErrorDetails,
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

async function createSignupActivationRequest({
  body,
  setStage,
}: {
  body: SignupCheckoutInput;
  setStage: (stage: CheckoutStage) => void;
}) {
  const origin = getSiteUrl();
  setStage("initialize_registration_admin");
  const supabase = createAdminClient();
  if (body.foundingMemberCode) {
    setStage("validate_founding_code");
    validateFoundingMemberCode(body.foundingMemberCode);
  }
  if (body.referralCode) {
    setStage("validate_referral");
    await validateSignupReferralCode(supabase, body.email, body.referralCode);
  }
  const signupUser = await resolveSignupUser(body, origin, setStage);

  if (!signupUser.createdByRequest) {
    return;
  }

  try {
    await prepareSignupRegistration({
      body,
      setStage,
      supabase,
      userId: signupUser.userId,
    });
  } catch (error) {
    try {
      const { error: rollbackError } = await supabase.auth.admin.deleteUser(
        signupUser.userId,
      );
      if (rollbackError) {
        logError("Unable to roll back incomplete signup user", rollbackError, {
          userId: signupUser.userId,
        });
      }
    } catch (rollbackError) {
      logError("Unable to roll back incomplete signup user", rollbackError, {
        userId: signupUser.userId,
      });
    }
    throw error;
  }
}

async function prepareSignupRegistration({
  body,
  setStage,
  supabase,
  userId,
}: {
  body: SignupCheckoutInput;
  setStage: (stage: CheckoutStage) => void;
  supabase: ReturnType<typeof createAdminClient>;
  userId: string;
}) {
  setStage("prepare_registration");
  const prepared = await prepareCheckoutRegistration(supabase, {
    ...body,
    userId,
  });

  setStage("store_consents");
  await storeSignupConsents(
    supabase,
    { ...body, userId, referralCode: prepared.referralCode ?? "" },
    prepared.requestId,
  );
}
