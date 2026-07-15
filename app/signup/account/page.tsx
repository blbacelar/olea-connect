"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { StepIndicator } from "@/components/auth/StepIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegistration } from "@/hooks/use-registration";
import { membershipPlans } from "@/lib/plans";
import type { MembershipTier } from "@/lib/types";

export default function SignupAccountPage() {
  const router = useRouter();
  const { hydrated, registration, updateRegistration } = useRegistration();
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);

  useEffect(() => {
    if (!hydrated) return;

    const searchParams = new URLSearchParams(window.location.search);
    const tier = searchParams.get("tier") as MembershipTier | null;
    const billingCycle = searchParams.get("billing");
    const updates: {
      tier?: MembershipTier;
      billingCycle?: "quarterly" | "annual";
    } = {};

    if (tier && membershipPlans.some((plan) => plan.id === tier)) {
      updates.tier = tier;
    }
    if (billingCycle === "quarterly" || billingCycle === "monthly") {
      updates.billingCycle = "quarterly";
    }
    if (billingCycle === "annual") {
      updates.billingCycle = "annual";
    }
    if (updates.tier || updates.billingCycle) {
      updateRegistration(updates);
    }
  }, [hydrated, updateRegistration]);

  const valid =
    registration.organizationName.trim().length >= 2 &&
    registration.fullName.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(registration.email) &&
    registration.password.length >= 8 &&
    terms;

  const strength = Math.min(4, Math.floor(registration.password.length / 3));

  return (
    <AuthCard
      title="Create your account"
      description="Step 2 of 3 · Your organization workspace starts here."
    >
      <StepIndicator current={2} />
      <div className="mt-7 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="organization">Organization name *</Label>
          <Input
            id="organization"
            value={registration.organizationName}
            onChange={(event) =>
              updateRegistration({ organizationName: event.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName">Your name *</Label>
          <Input
            id="fullName"
            value={registration.fullName}
            onChange={(event) =>
              updateRegistration({ fullName: event.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email address *</Label>
          <Input
            id="email"
            type="email"
            value={registration.email}
            onChange={(event) =>
              updateRegistration({ email: event.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={registration.password}
              onChange={(event) =>
                updateRegistration({ password: event.target.value })
              }
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((level) => (
              <span
                key={level}
                className={`h-1.5 rounded-full ${
                  level <= strength ? "bg-olea-green" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-600">
            Use at least 8 characters.
          </p>
        </div>
        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={terms}
            onChange={(event) => setTerms(event.target.checked)}
            className="mt-0.5 size-4 accent-olea-green"
          />
          I agree to the Terms of Service and Privacy Policy.
        </label>
        <Button
          className="w-full"
          disabled={!valid}
          onClick={() => router.push("/signup/payment")}
        >
          Continue to payment →
        </Button>
        <button
          onClick={() => router.push("/#plans")}
          className="w-full text-sm font-medium text-slate-500"
        >
          ← Back to plan
        </button>
      </div>
    </AuthCard>
  );
}
