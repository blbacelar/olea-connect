import { Lock, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { FormSelect } from "@/components/ui/form-select";
import { Textarea } from "@/components/ui/textarea";
import {
  grantFocusAreaLabels,
  grantFocusAreas,
} from "@/lib/grants/domain";
import type { GrantApplicationSummary, GrantRound } from "@/lib/types";

import { saveGrantApplication } from "./actions";

type OrganizationGrantDefaults = {
  annualRevenueCents: number | null;
  craGoodStanding: boolean | null;
  registeredInCanada: boolean;
};

export function ApplicationForm({
  application,
  defaults,
  round,
}: {
  application: GrantApplicationSummary | undefined;
  defaults: OrganizationGrantDefaults;
  round: GrantRound;
}) {
  if (application && application.status !== "draft") {
    return <SubmittedApplicationNotice />;
  }

  return (
    <form action={saveGrantApplication} className="rounded-xl border bg-white p-5 shadow-soft">
      <input name="roundId" type="hidden" value={round.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Focus area
          <FormSelect
            defaultValue={application?.focusArea ?? "operational_capacity"}
            name="focusArea"
            placeholder="Choose focus area"
            options={grantFocusAreas.map((focusArea) => ({
              label: grantFocusAreaLabels[focusArea],
              value: focusArea,
            }))}
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Requested amount
          <CurrencyInput
            defaultValue={getRequestedAmountDefault(application, round)}
            max={round.awardAmountCents / 100}
            min={1}
            name="requestedAmount"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Annual revenue
          <CurrencyInput
            defaultValue={getAnnualRevenueDefault(application, defaults)}
            name="annualRevenue"
          />
        </label>
        <EligibilityDefaults application={application} defaults={defaults} />
      </div>
      <GrantNarrativeFields application={application} />
      <GrantAttachmentField />
      <div className="mt-5 flex flex-wrap gap-3">
        <Button name="intent" type="submit" value="draft" variant="outline">
          Save draft
        </Button>
        <Button name="intent" type="submit" value="submit">
          <Send className="size-4" />
          Submit application
        </Button>
      </div>
    </form>
  );
}

function SubmittedApplicationNotice() {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-soft">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Lock className="size-4 text-olea-green" />
        Application already submitted
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        One application is allowed per organization per round. Track its status
        in your application history below.
      </p>
    </div>
  );
}

function EligibilityDefaults({
  application,
  defaults,
}: {
  application: GrantApplicationSummary | undefined;
  defaults: OrganizationGrantDefaults;
}) {
  return (
    <div className="grid content-end gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
      <label className="flex items-center gap-2">
        <input
          defaultChecked={
            application?.registeredInCanada ?? defaults.registeredInCanada
          }
          name="registeredInCanada"
          type="checkbox"
        />
        Registered in Canada
      </label>
      <label className="flex items-center gap-2">
        <input
          defaultChecked={
            application?.craGoodStanding ?? Boolean(defaults.craGoodStanding)
          }
          name="craGoodStanding"
          type="checkbox"
        />
        CRA good standing confirmed
      </label>
    </div>
  );
}

function GrantNarrativeFields({
  application,
}: {
  application: GrantApplicationSummary | undefined;
}) {
  return (
    <>
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        150-250 word narrative
        <Textarea
          className="mt-2 min-h-[180px]"
          defaultValue={application?.fundingRequest ?? ""}
          name="fundingRequest"
          placeholder="Tell us what you will fund, who it supports, and why this capacity investment matters now."
        />
      </label>
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Expected outcome
        <Textarea
          className="mt-2"
          defaultValue={application?.expectedOutcome ?? ""}
          name="expectedOutcome"
          placeholder="Describe the practical outcome your organization expects to report back."
        />
      </label>
    </>
  );
}

function GrantAttachmentField() {
  return (
    <label className="mt-4 block text-sm font-semibold text-slate-700">
      Supporting documents
      <input
        className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-olea-green file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
        multiple
        name="attachments"
        type="file"
      />
      <span className="mt-2 block text-sm font-normal text-slate-500">
        PDF, Word, Excel, PowerPoint, images, CSV, and plain text files up to 25
        MB each.
      </span>
    </label>
  );
}

function getRequestedAmountDefault(
  application: GrantApplicationSummary | undefined,
  round: GrantRound,
) {
  const amountCents = application?.requestedAmountCents ?? round.awardAmountCents;
  return String(amountCents / 100);
}

function getAnnualRevenueDefault(
  application: GrantApplicationSummary | undefined,
  defaults: OrganizationGrantDefaults,
) {
  const amountCents =
    application?.annualRevenueCents ?? defaults.annualRevenueCents;

  return amountCents ? String(amountCents / 100) : "";
}
