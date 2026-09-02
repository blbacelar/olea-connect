"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { getAuthFlowCopy } from "@/lib/i18n/auth-flow-copy";
import { retryMembershipActivation } from "@/lib/provisioning/client";

function getSafePath(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export function ActivationRetryButton() {
  const router = useRouter();
  const { locale } = useLocaleContext();
  const copy = getAuthFlowCopy(locale).activationRetry;
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
          router.push(getSafePath(result.nextPath));
          router.refresh();
          return;
        }

        setError(
          result.error ??
            (result.status === "pending_verification"
              ? copy.confirmEmail
              : result.status === "pending_payment"
                ? copy.pendingPayment
                : copy.processing),
        );
      } catch {
        setError(copy.fallbackError);
      }
    });
  };

  return (
    <div className="mt-6">
      <Button className="w-full" disabled={isPending} onClick={retry}>
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {isPending ? copy.pending : copy.submit}
      </Button>
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
