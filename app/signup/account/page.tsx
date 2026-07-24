"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { StepIndicator } from "@/components/auth/StepIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { captureReferralCodeFromUrl } from "@/lib/referral-capture";
import { useRegistration } from "@/hooks/use-registration";
import { membershipPlans } from "@/lib/plans";
import type { MembershipTier } from "@/lib/types";

export default function SignupAccountPage() {
  const router = useRouter();
  const { hydrated, registration, updateRegistration } = useRegistration();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!hydrated) return;

    const searchParams = new URLSearchParams(window.location.search);
    const referralCode = captureReferralCodeFromUrl();
    const tier = searchParams.get("tier") as MembershipTier | null;
    const billingCycle = searchParams.get("billing");
    const updates: {
      tier?: MembershipTier;
      billingCycle?: "quarterly" | "annual";
      referralCode?: string;
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
    if (referralCode && !registration.referralCode) {
      updateRegistration({ referralCode });
    }
  }, [hydrated, registration.referralCode, updateRegistration]);

  const valid =
    registration.organizationName.trim().length >= 2 &&
    registration.fullName.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(registration.email) &&
    registration.password.length >= 8 &&
    registration.organizationKind !== "" &&
    registration.annualBudgetRange !== "" &&
    registration.boardSizeRange !== "";

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
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="organizationKind">Organization type *</Label>
            <Select
              value={registration.organizationKind || undefined}
              onValueChange={(organizationKind) =>
                updateRegistration({ organizationKind: organizationKind as typeof registration.organizationKind })
              }
            >
              <SelectTrigger id="organizationKind" className="bg-white">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nonprofit">Nonprofit</SelectItem>
                <SelectItem value="registered_charity">Registered charity</SelectItem>
                <SelectItem value="society">Society</SelectItem>
                <SelectItem value="community_organization">Community organization</SelectItem>
                <SelectItem value="foundation">Foundation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="boardSizeRange">Approximate board size *</Label>
            <Select
              value={registration.boardSizeRange || undefined}
              onValueChange={(boardSizeRange) =>
                updateRegistration({ boardSizeRange: boardSizeRange as typeof registration.boardSizeRange })
              }
            >
              <SelectTrigger id="boardSizeRange" className="bg-white">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3-5">3-5 members</SelectItem>
                <SelectItem value="6-10">6-10 members</SelectItem>
                <SelectItem value="11-15">11-15 members</SelectItem>
                <SelectItem value="16-20">16-20 members</SelectItem>
                <SelectItem value="20plus">20+ members</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="annualBudgetRange">Annual organizational budget *</Label>
          <Select
            value={registration.annualBudgetRange || undefined}
            onValueChange={(annualBudgetRange) =>
              updateRegistration({ annualBudgetRange: annualBudgetRange as typeof registration.annualBudgetRange })
            }
          >
            <SelectTrigger id="annualBudgetRange" className="bg-white">
              <SelectValue placeholder="Select budget range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="under-250k">Under $250,000</SelectItem>
              <SelectItem value="250k-500k">$250,000-$500,000</SelectItem>
              <SelectItem value="500k-1m">$500,000-$1M</SelectItem>
              <SelectItem value="1m-2m">$1M-$2M</SelectItem>
              <SelectItem value="2m-5m">$2M-$5M</SelectItem>
              <SelectItem value="over-5m">$5M+</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">This helps us recommend the right level of support.</p>
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
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(555) 123-4567"
              value={registration.phone}
              onChange={(event) => updateRegistration({ phone: event.target.value })}
            />
            <p className="text-xs text-slate-500">Optional; use a Canadian or North American phone number.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="acquisitionSource">How did you hear about us?</Label>
            <Select
              value={registration.acquisitionSource || undefined}
              onValueChange={(acquisitionSource) =>
                updateRegistration({ acquisitionSource: acquisitionSource as typeof registration.acquisitionSource })
              }
            >
              <SelectTrigger id="acquisitionSource" className="bg-white">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="referral">Another organization</SelectItem>
                <SelectItem value="web-search">Web search</SelectItem>
                <SelectItem value="social-media">Social media</SelectItem>
                <SelectItem value="webinar">Webinar or event</SelectItem>
                <SelectItem value="sponsor">Through a sponsor</SelectItem>
                <SelectItem value="word-of-mouth">Word of mouth</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2 rounded-lg border border-olea-green/20 bg-olea-light/40 p-4">
          <Label htmlFor="referralCode">Referral code</Label>
          <Input
            id="referralCode"
            placeholder="OLEA-ABC123"
            maxLength={22}
            value={registration.referralCode}
            onChange={(event) => updateRegistration({ referralCode: event.target.value.toUpperCase() })}
          />
          <p className="text-xs leading-5 text-slate-600">
            Optional. A valid code supports the referring organization&apos;s Olea Gives reward.
          </p>
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
