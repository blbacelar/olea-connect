import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { ActivationRetryButton } from "@/components/auth/ActivationRetryButton";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { recoverCheckoutSessionProvisioning } from "@/lib/stripe/registration";
import type { ProvisioningResult } from "@/lib/stripe/registration";
import { createAdminClient } from "@/utils/supabase/admin";

interface SignupSuccessPageProps {
  searchParams?: {
    activation?: string;
    session_id?: string | string[];
  };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function finalizeCheckoutSession(
  sessionId: string | undefined,
): Promise<ProvisioningResult | null> {
  if (!sessionId) return null;

  try {
    return await recoverCheckoutSessionProvisioning(
      createAdminClient(),
      sessionId,
    );
  } catch (error) {
    console.error("Unable to finalize checkout activation", error);
    return {
      status: "failed",
      request_id: "",
      error: "Workspace activation could not be finalized automatically.",
    };
  }
}

export default async function SignupSuccessPage({
  searchParams,
}: SignupSuccessPageProps) {
  const finalizedActivation = await finalizeCheckoutSession(
    firstParam(searchParams?.session_id),
  );
  const activationStatus =
    finalizedActivation?.status ??
    (searchParams?.activation === "failed" ? "failed" : null);
  const activationFailed = activationStatus === "failed";
  const activationPendingVerification =
    activationStatus === "pending_verification";
  const activationCompleted = activationStatus === "completed";

  return (
    <AuthCard
      title={
        activationFailed
          ? "Activation needs attention"
          : activationCompleted
            ? "Your membership is ready"
            : "Payment received"
      }
      description={
        activationFailed
          ? "Your payment is safe, but workspace setup needs to be retried."
          : activationCompleted
            ? "Your Olea Connects™ workspace is active."
          : "Your Olea Connects™ membership is being activated."
      }
    >
      <div className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-olea-light text-olea-green">
          <CheckCircle2 className="size-8" />
        </span>
        <p className="mt-5 text-sm leading-6 text-slate-500">
          {activationFailed
            ? "Sign in if prompted, then retry. The activation record is preserved so no organization or subscription will be duplicated."
            : activationCompleted
              ? "Continue to your dashboard. If you are asked to sign in, use the same email address you used during checkout."
              : activationPendingVerification
                ? "We sent a confirmation email from Olea Connects™. Open that email and confirm your address before signing in."
                : "We are finalizing your activation. If your dashboard is not ready yet, sign in and retry activation once."}
        </p>
        {activationFailed ? (
          <ActivationRetryButton />
        ) : (
          <Button asChild className="mt-6 w-full">
            <Link
              href={
                activationCompleted
                  ? "/dashboard"
                  : "/login?payment=success&verify=email"
              }
            >
              {activationCompleted ? "Go to dashboard" : "Continue to sign in"}
            </Link>
          </Button>
        )}
      </div>
    </AuthCard>
  );
}
