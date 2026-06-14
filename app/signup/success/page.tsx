import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";

export default function SignupSuccessPage() {
  return (
    <AuthCard
      title="Payment received"
      description="Your Olea Connects membership is being activated."
    >
      <div className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-olea-light text-olea-green">
          <CheckCircle2 className="size-8" />
        </span>
        <p className="mt-5 text-sm leading-6 text-slate-500">
          Sign in to continue. If email confirmation is enabled, confirm your
          address first using the message from Olea Connects.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/login?payment=success">Continue to sign in</Link>
        </Button>
      </div>
    </AuthCard>
  );
}
