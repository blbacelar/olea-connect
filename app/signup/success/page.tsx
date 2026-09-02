import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { ActivationRetryButton } from "@/components/auth/ActivationRetryButton";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { getAuthFlowCopy } from "@/lib/i18n/auth-flow-copy";
import { getPublicSiteCopy } from "@/lib/i18n/public-site-copy";
import { getRequestLocale } from "@/lib/i18n/server";
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
  fallbackError: string,
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
      error: fallbackError,
    };
  }
}

export default async function SignupSuccessPage({
  searchParams,
}: SignupSuccessPageProps) {
  const locale = getRequestLocale();
  const authCopy = getAuthFlowCopy(locale);
  const publicCopy = getPublicSiteCopy(locale);
  const successCopy = authCopy.signup.success;
  const finalizedActivation = await finalizeCheckoutSession(
    firstParam(searchParams?.session_id),
    successCopy.finalizeError,
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
      logo={publicCopy.logo}
      title={
        activationFailed
          ? successCopy.titles.failed
          : activationCompleted
            ? successCopy.titles.completed
            : successCopy.titles.received
      }
      description={
        activationFailed
          ? successCopy.descriptions.failed
          : activationCompleted
            ? successCopy.descriptions.completed
            : successCopy.descriptions.received
      }
    >
      <div className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-olea-light text-olea-green">
          <CheckCircle2 className="size-8" />
        </span>
        <p className="mt-5 text-sm leading-6 text-slate-500">
          {activationFailed
            ? successCopy.messages.failed
            : activationCompleted
              ? successCopy.messages.completed
              : activationPendingVerification
                ? successCopy.messages.pendingVerification
                : successCopy.messages.pending}
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
              {activationCompleted
                ? successCopy.goToDashboard
                : successCopy.continueToSignIn}
            </Link>
          </Button>
        )}
      </div>
    </AuthCard>
  );
}
