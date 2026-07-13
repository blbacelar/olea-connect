"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { retryMembershipActivation } from "@/lib/provisioning/client";

export function ActivationRetryButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const retry = () => {
    startTransition(async () => {
      try {
        setError("");
        const { response, result } = await retryMembershipActivation();

        if (response.status === 401) {
          router.push("/login?next=/signup/success?activation=failed");
          return;
        }

        if (result.status === "completed") {
          router.push("/onboarding/brand-setup");
          router.refresh();
          return;
        }

        setError(
          result.error ??
            (result.status === "pending_verification"
              ? "Confirm your email address, then retry activation."
              : result.status === "pending_payment"
                ? "Payment is not confirmed for this account yet. If you already paid, sign out and use the email address from checkout, or contact support."
                : "Payment confirmation is still processing. Try again shortly."),
        );
      } catch {
        setError("Activation could not be checked. Please try again shortly.");
      }
    });
  };

  return (
    <div className="mt-6">
      <Button className="w-full" disabled={isPending} onClick={retry}>
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {isPending ? "Checking activation..." : "Retry activation"}
      </Button>
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
