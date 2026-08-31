"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { StepIndicator } from "@/components/auth/StepIndicator";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
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
import { getAuthFlowCopy } from "@/lib/i18n/auth-flow-copy";
import { getPublicSiteCopy } from "@/lib/i18n/public-site-copy";
import { membershipPlans } from "@/lib/plans";
import {
  ACQUISITION_SOURCES,
  ANNUAL_BUDGET_RANGES,
  BOARD_SIZE_RANGES,
  ORGANIZATION_KINDS,
} from "@/lib/signup-flow";
import type { MembershipTier } from "@/lib/types";
import { emailStringSchema } from "@/lib/validation/schemas";

export default function SignupAccountPage() {
  const router = useRouter();
  const { hydrated, registration, updateRegistration } = useRegistration();
  const { locale } = useLocaleContext();
  const authCopy = getAuthFlowCopy(locale);
  const publicCopy = getPublicSiteCopy(locale);
  const accountCopy = authCopy.signup.account;

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
    emailStringSchema.safeParse(registration.email).success &&
    registration.password.length >= 8 &&
    registration.organizationKind !== "" &&
    registration.annualBudgetRange !== "" &&
    registration.boardSizeRange !== "";

  const strength = Math.min(4, Math.floor(registration.password.length / 3));

  return (
    <AuthCard
      title={accountCopy.title}
      description={`${authCopy.signup.step(2, 3)} · ${accountCopy.description}`}
      logo={publicCopy.logo}
    >
      <StepIndicator current={2} />
      <div className="mt-7 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="organization">{accountCopy.organizationName}</Label>
          <Input
            id="organization"
            value={registration.organizationName}
            onChange={(event) =>
              updateRegistration({ organizationName: event.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName">{accountCopy.fullName}</Label>
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
            <Label htmlFor="organizationKind">
              {accountCopy.organizationKind}
            </Label>
            <Select
              value={registration.organizationKind || undefined}
              onValueChange={(organizationKind) =>
                updateRegistration({
                  organizationKind:
                    organizationKind as typeof registration.organizationKind,
                })
              }
            >
              <SelectTrigger id="organizationKind" className="bg-white">
                <SelectValue
                  placeholder={accountCopy.organizationKindPlaceholder}
                />
              </SelectTrigger>
              <SelectContent>
                {ORGANIZATION_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {accountCopy.organizationKinds[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="boardSizeRange">{accountCopy.boardSize}</Label>
            <Select
              value={registration.boardSizeRange || undefined}
              onValueChange={(boardSizeRange) =>
                updateRegistration({
                  boardSizeRange:
                    boardSizeRange as typeof registration.boardSizeRange,
                })
              }
            >
              <SelectTrigger id="boardSizeRange" className="bg-white">
                <SelectValue placeholder={accountCopy.boardSizePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {BOARD_SIZE_RANGES.map((range) => (
                  <SelectItem key={range} value={range}>
                    {accountCopy.boardSizes[range]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="annualBudgetRange">{accountCopy.annualBudget}</Label>
          <Select
            value={registration.annualBudgetRange || undefined}
            onValueChange={(annualBudgetRange) =>
              updateRegistration({
                annualBudgetRange:
                  annualBudgetRange as typeof registration.annualBudgetRange,
              })
            }
          >
            <SelectTrigger id="annualBudgetRange" className="bg-white">
              <SelectValue placeholder={accountCopy.annualBudgetPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {ANNUAL_BUDGET_RANGES.map((range) => (
                <SelectItem key={range} value={range}>
                  {accountCopy.annualBudgets[range]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            {accountCopy.annualBudgetHelp}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{authCopy.shared.emailAddress} *</Label>
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
            <Label htmlFor="phone">{accountCopy.phone}</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={accountCopy.phonePlaceholder}
              value={registration.phone}
              onChange={(event) =>
                updateRegistration({ phone: event.target.value })
              }
            />
            <p className="text-xs text-slate-500">{accountCopy.phoneHelp}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="acquisitionSource">
              {accountCopy.acquisitionSource}
            </Label>
            <Select
              value={registration.acquisitionSource || undefined}
              onValueChange={(acquisitionSource) =>
                updateRegistration({
                  acquisitionSource:
                    acquisitionSource as typeof registration.acquisitionSource,
                })
              }
            >
              <SelectTrigger id="acquisitionSource" className="bg-white">
                <SelectValue
                  placeholder={accountCopy.acquisitionSourcePlaceholder}
                />
              </SelectTrigger>
              <SelectContent>
                {ACQUISITION_SOURCES.map((source) => (
                  <SelectItem key={source} value={source}>
                    {accountCopy.acquisitionSources[source]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2 rounded-lg border border-olea-green/20 bg-olea-light/40 p-4">
          <Label htmlFor="referralCode">{accountCopy.referralCode}</Label>
          <Input
            id="referralCode"
            placeholder={accountCopy.referralCodePlaceholder}
            maxLength={22}
            value={registration.referralCode}
            onChange={(event) =>
              updateRegistration({
                referralCode: event.target.value.toUpperCase(),
              })
            }
          />
          <p className="text-xs leading-5 text-slate-600">
            {accountCopy.referralCodeHelp}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{accountCopy.password}</Label>
          <PasswordInput
            id="password"
            value={registration.password}
            onChange={(event) =>
              updateRegistration({ password: event.target.value })
            }
            hideLabel={authCopy.shared.hidePassword}
            showLabel={authCopy.shared.showPassword}
          />
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
          <p className="text-xs text-slate-600">{accountCopy.passwordHelp}</p>
        </div>
        <Button
          className="w-full"
          disabled={!valid}
          onClick={() => router.push("/signup/payment")}
        >
          {accountCopy.continueToPayment}
          <ArrowRight className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/#plans")}
          className="w-full text-sm font-medium text-slate-500"
        >
          <ArrowLeft className="size-4" />
          {accountCopy.backToPlan}
        </Button>
      </div>
    </AuthCard>
  );
}
