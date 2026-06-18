import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { ActivationRetryButton } from "@/components/auth/ActivationRetryButton";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";

interface SignupSuccessPageProps {
  searchParams?: {
    activation?: string;
  };
}

export default function SignupSuccessPage({
  searchParams,
}: SignupSuccessPageProps) {
  const activationFailed = searchParams?.activation === "failed";

  return (
    <AuthCard
      title={
        activationFailed ? "Activation needs attention" : "Payment received"
      }
      description={
        activationFailed
          ? "Your payment is safe, but workspace setup needs to be retried."
          : "Your Olea Connects membership is being activated."
      }
    >
      <div className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-olea-light text-olea-green">
          <CheckCircle2 className="size-8" />
        </span>
        <p className="mt-5 text-sm leading-6 text-slate-500">
          {activationFailed
            ? "Sign in if prompted, then retry. The activation record is preserved so no organization or subscription will be duplicated."
            : "We sent a confirmation email from Olea Connects. Open that email and confirm your address before signing in."}
        </p>
        {activationFailed ? (
          <ActivationRetryButton />
        ) : (
          <Button asChild className="mt-6 w-full">
            <Link href="/login?payment=success&verify=email">
              Continue to sign in
            </Link>
          </Button>
        )}
      </div>
    </AuthCard>
  );
}
