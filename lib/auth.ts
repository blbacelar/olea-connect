import type { MembershipTier, RegistrationState } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";

const wait = (milliseconds = 500) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function getRedirectUrl(path: string) {
  if (typeof window === "undefined") {
    throw new Error("Authentication must be started in the browser.");
  }

  return `${window.location.origin}${path}`;
}

export async function signUpWithEmail(registration: RegistrationState) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: registration.email.trim().toLowerCase(),
    password: registration.password,
    options: {
      emailRedirectTo: getRedirectUrl(
        "/auth/callback?next=/onboarding/brand-setup",
      ),
      data: {
        full_name: registration.fullName.trim(),
        organization_name: registration.organizationName.trim(),
        membership_tier: registration.tier,
        billing_cycle: registration.billingCycle,
        billing_province: registration.province,
      },
    },
  });

  if (error) throw error;
  if (data.user && data.user.identities?.length === 0) {
    throw new Error(
      "An account may already exist for this email. Try signing in instead.",
    );
  }
  return data;
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo: getRedirectUrl("/auth/callback?next=/update-password"),
    },
  );

  if (error) throw error;
  return { delivered: true };
}

export async function resendVerificationEmail(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: getRedirectUrl(
        "/auth/callback?next=/onboarding/brand-setup",
      ),
    },
  });

  if (error) throw error;
  return { delivered: true };
}

export async function updatePassword(password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data;
}

export async function startStripeCheckout(
  registration: RegistrationState,
) {
  const response = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: registration.email,
      password: registration.password,
      fullName: registration.fullName,
      organizationName: registration.organizationName,
      province: registration.province,
      tier: registration.tier,
      billingCycle: registration.billingCycle,
    }),
  });
  const contentType = response.headers.get("content-type");
  const result = contentType?.includes("application/json")
    ? ((await response.json()) as { url?: string; error?: string })
    : {};

  if (!response.ok || !result.url) {
    throw new Error(result.error ?? "Unable to start secure checkout.");
  }

  return result.url;
}

export async function triggerNewSubscriptionAutomations({
  tier,
}: {
  tier: MembershipTier;
}) {
  await wait(250);
  return {
    attio: "contact_created",
    klaviyo: "welcome_sequence_started",
    circle: "invite_sent",
    tier,
  };
}
