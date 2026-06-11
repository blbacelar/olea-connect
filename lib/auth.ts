import type { MembershipTier, RegistrationState } from "@/lib/types";

const wait = (milliseconds = 500) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function createCheckoutSession(
  registration: RegistrationState,
) {
  await wait();
  return {
    subscriptionId: `sub_demo_${registration.tier}`,
    status: "active" as const,
  };
}

export async function signIn(email: string, password: string) {
  await wait();
  if (!email || !password) throw new Error("Email and password are required.");
  return { userId: "member-sarah", email };
}

export async function requestPasswordReset(email: string) {
  await wait();
  return { delivered: Boolean(email) };
}

export async function resendVerificationEmail(email: string) {
  await wait();
  return { delivered: Boolean(email) };
}

export async function confirmEmailVerification() {
  await wait();
  return { verified: true };
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
