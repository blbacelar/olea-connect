"use client";

import { CheckCircle2, Lock, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAuthFlowCopy } from "@/lib/i18n/auth-flow-copy";
import { getPublicSiteCopy } from "@/lib/i18n/public-site-copy";
import { LEGAL_DOCUMENTS, type LegalDocumentKey } from "@/lib/legal-documents";
import { getPlan } from "@/lib/plans";
import { formatCad } from "@/lib/pricing";
import type { RegistrationState } from "@/lib/types";

const provinces = [
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
];

type PaymentCopy = ReturnType<typeof getAuthFlowCopy>["signup"]["payment"];
type PublicCopy = ReturnType<typeof getPublicSiteCopy>;

export function PaymentCheckoutPanel({
  allConsentsGranted,
  copy,
  error,
  isPending,
  publicCopy,
  registration,
  onPayment,
  onUpdateRegistration,
}: {
  allConsentsGranted: boolean;
  copy: PaymentCopy;
  error: string;
  isPending: boolean;
  publicCopy: PublicCopy;
  registration: RegistrationState;
  onPayment: () => void;
  onUpdateRegistration: (updates: Partial<RegistrationState>) => void;
}) {
  return (
    <section className="rounded-[14px] border bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold">{copy.secureCheckout}</h2>
      <div className="mt-6 space-y-5">
        <SecurityPanel copy={copy} />
        <ProvinceSelect
          copy={copy}
          province={registration.province}
          onChange={(province) => onUpdateRegistration({ province })}
        />
        <LegalSummary
          copy={copy}
          publicCopy={publicCopy}
          registration={registration}
          onUpdateRegistration={onUpdateRegistration}
        />
        <Button
          className="w-full"
          disabled={
            !registration.email ||
            registration.password.length < 8 ||
            !allConsentsGranted ||
            isPending
          }
          onClick={onPayment}
        >
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {isPending ? copy.continuePending : copy.continueToCheckout}
        </Button>
        {error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Lock className="size-3.5" /> {copy.secureCheckoutLabel}
        </p>
      </div>
    </section>
  );
}

function SecurityPanel({ copy }: { copy: PaymentCopy }) {
  return (
    <div className="rounded-xl border border-olea-green/20 bg-olea-light/50 p-5">
      <Lock className="size-6 text-olea-green" />
      <p className="mt-3 font-semibold text-olea-dark">
        {copy.paymentSecureTitle}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        {copy.paymentSecureDescription}
      </p>
    </div>
  );
}

function ProvinceSelect({
  copy,
  province,
  onChange,
}: {
  copy: PaymentCopy;
  province: string;
  onChange: (province: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="province">{copy.billingProvince}</Label>
      <Select value={province} onValueChange={onChange}>
        <SelectTrigger
          id="province"
          className="h-11 w-full bg-white px-3.5 focus:ring-olea-green/20"
        >
          <SelectValue placeholder={copy.provincePlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {provinces.map((provinceOption) => (
            <SelectItem key={provinceOption} value={provinceOption}>
              {provinceOption}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function LegalSummary({
  copy,
  publicCopy,
  registration,
  onUpdateRegistration,
}: {
  copy: PaymentCopy;
  publicCopy: PublicCopy;
  registration: RegistrationState;
  onUpdateRegistration: (updates: Partial<RegistrationState>) => void;
}) {
  const plan = getPlan(registration.tier);
  const localizedPlan = publicCopy.pricing.plans[plan.id];

  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <h3 className="font-semibold text-olea-dark">{copy.legalTitle}</h3>
      <dl className="mt-3 grid gap-2 text-sm text-slate-600">
        <SummaryRow label={copy.organization} value={registration.organizationName} />
        <SummaryRow label={copy.plan} value={localizedPlan.name} />
        <SummaryRow label={copy.billing} value={copy.billingCycle[registration.billingCycle]} />
        <SummaryRow label={copy.includedSeats} value={localizedPlan.seats} />
      </dl>
      <div className="mt-4 space-y-3 border-t pt-4 text-sm text-slate-700">
        {(Object.keys(LEGAL_DOCUMENTS) as LegalDocumentKey[]).map((documentKey) => (
          <ConsentCheckbox
            key={documentKey}
            checked={registration.consents[documentKey]}
            copy={copy}
            document={LEGAL_DOCUMENTS[documentKey]}
            documentKey={documentKey}
            onChange={(checked) =>
              onUpdateRegistration({
                consents: { ...registration.consents, [documentKey]: checked },
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function ConsentCheckbox({
  checked,
  copy,
  onChange,
  document,
  documentKey,
}: {
  checked: boolean;
  copy: PaymentCopy;
  onChange: (checked: boolean) => void;
  document: { title: string; version: string; href: string };
  documentKey: LegalDocumentKey;
}) {
  return (
    <label className="flex items-start gap-2.5">
      <Checkbox
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5"
      />
      <span>
        {copy.consentPrefix}{" "}
        <a
          className="font-semibold text-olea-green underline"
          href={document.href}
          target="_blank"
          rel="noreferrer"
        >
          {copy.legalDocuments[documentKey]}
        </a>{" "}
        <span className="text-xs text-slate-500">
          {copy.consentVersion(document.version)}
        </span>
        .
      </span>
    </label>
  );
}

export function PaymentOrderSummary({
  copy,
  locale,
  publicCopy,
  registration,
}: {
  copy: PaymentCopy;
  locale: "en-CA" | "fr-CA";
  publicCopy: PublicCopy;
  registration: RegistrationState;
}) {
  const plan = getPlan(registration.tier);
  const localizedPlan = publicCopy.pricing.plans[plan.id];
  const price =
    registration.billingCycle === "annual"
      ? plan.annualPrice
      : plan.quarterlyPrice;
  const billingPeriod =
    registration.billingCycle === "annual"
      ? publicCopy.pricing.perYear
      : publicCopy.pricing.perQuarter;

  return (
    <aside className="rounded-[14px] border bg-white p-6 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">
        {copy.orderSummary}
      </p>
      <h2 className="mt-4 text-xl font-bold">{localizedPlan.name}</h2>
      <p className="mt-1 text-slate-500">
        {copy.billingSummary(registration.billingCycle)}
      </p>
      <p className="mt-5 text-3xl font-bold">
        {formatCad(price, locale)}
        <span className="text-sm font-normal text-slate-400">
          /{billingPeriod}
        </span>
      </p>
      <p className="mt-1 text-xs font-semibold text-olea-green">
        {copy.foundingEligibility}
      </p>
      <div className="my-5 border-t" />
      <p className="font-semibold text-olea-dark">{copy.membershipStarts}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        {copy.membershipDescription}
      </p>
      <ul className="mt-5 space-y-2 text-sm text-slate-600">
        {[copy.renewalNotice, copy.canadianDollars, localizedPlan.seats].map(
          (item) => (
            <li key={item} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-olea-green" />
              <span>{item}</span>
            </li>
          ),
        )}
      </ul>
    </aside>
  );
}
