"use client";

import { useFormState, useFormStatus } from "react-dom";

import { SectionHeading } from "@/components/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { SponsorGrantRoundOption } from "@/lib/data/sponsors";
import { FORM_SELECT_EMPTY_VALUE } from "@/lib/forms/constants";
import type { SponsorReport, SponsorshipPackageSummary } from "@/lib/types";

import {
  saveSponsorContribution,
  saveSponsorProfile,
  saveSponsorshipTerm,
  type SponsorActionState,
} from "./actions";

const initialSponsorActionState: SponsorActionState = {
  message: "",
  status: "idle",
};

function formatMoney(amountCents: number) {
  return new Intl.NumberFormat("en-CA", {
    currency: "CAD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amountCents / 100);
}

function SponsorFormNotice({ state }: { state: SponsorActionState }) {
  if (state.status === "idle" || !state.message) return null;

  const tone =
    state.status === "success"
      ? "border-green-200 bg-green-50 text-green-800"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div
      className={`mt-4 rounded-lg border px-4 py-3 text-sm font-semibold ${tone}`}
    >
      {state.message}
    </div>
  );
}

function SponsorSubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus();

  return (
    <Button className="mt-5" disabled={pending} type="submit">
      {pending ? "Saving..." : children}
    </Button>
  );
}

function SponsorCurrencyInput({
  name,
  placeholder = "1200.00",
  required = false,
}: {
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <CurrencyInput
      name={name}
      placeholder={placeholder}
      required={required}
      title="Enter numbers only, with up to two decimals. The value is formatted as CAD."
    />
  );
}

function SponsorProfileForm({ reports }: { reports: SponsorReport[] }) {
  const [state, formAction] = useFormState(
    saveSponsorProfile,
    initialSponsorActionState,
  );

  return (
    <form action={formAction} className="rounded-xl border bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">Sponsor profile</h2>
          <p className="mt-1 text-sm text-slate-500">
            Publish approved directory information and primary contact access.
          </p>
        </div>
        <Badge variant="outline">Admin</Badge>
      </div>
      <SponsorFormNotice state={state} />
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Existing sponsor
        <FormSelect
          defaultValue={FORM_SELECT_EMPTY_VALUE}
          name="sponsorId"
          placeholder="Create new sponsor"
          options={[
            { label: "Create new sponsor", value: FORM_SELECT_EMPTY_VALUE },
            ...reports.map((sponsor) => ({
              label: sponsor.name,
              value: sponsor.id,
            })),
          ]}
        />
      </label>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Name
          <Input name="name" required placeholder="Community Foundation" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Slug
          <Input name="slug" placeholder="community-foundation" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Status
          <FormSelect
            name="status"
            defaultValue="prospect"
            placeholder="Choose status"
            options={[
              { label: "Prospect", value: "prospect" },
              { label: "Active", value: "active" },
              { label: "Paused", value: "paused" },
              { label: "Former", value: "former" },
              { label: "Declined", value: "declined" },
            ]}
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Category
          <Input name="category" placeholder="Foundation, corporate, partner" />
        </label>
      </div>
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Website
        <Input name="websiteUrl" type="url" placeholder="https://example.org" />
      </label>
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Short description
        <Input
          name="shortDescription"
          placeholder="One-line directory summary"
        />
      </label>
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Directory description
        <Textarea
          name="directoryDescription"
          placeholder="Member-visible sponsor profile text"
        />
      </label>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Directory email
          <Input
            name="directoryEmail"
            type="email"
            placeholder="sponsor@example.org"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Directory phone
          <Input
            name="directoryPhone"
            type="tel"
            inputMode="tel"
            placeholder="+1 555 555 5555"
            pattern="^\\+?[0-9().\\-\\s]{7,24}$"
          />
        </label>
      </div>
      <div className="mt-4 rounded-lg bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-700">Primary contact</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Name
            <Input name="primaryContactName" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Email
            <Input
              name="primaryContactEmail"
              type="email"
              placeholder="name@example.org"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Title
            <Input name="primaryContactTitle" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Phone
            <Input
              name="primaryContactPhone"
              type="tel"
              inputMode="tel"
              placeholder="+1 555 555 5555"
              pattern="^\\+?[0-9().\\-\\s]{7,24}$"
            />
          </label>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm font-semibold text-slate-700">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="directoryVisible" />
          Show in member sponsor directory
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="valuesReviewed" />
          Values and profile approved for publication
        </label>
      </div>
      <SponsorSubmitButton>Save sponsor profile</SponsorSubmitButton>
    </form>
  );
}

function SponsorshipTermsForm({
  packages,
  reports,
}: {
  packages: SponsorshipPackageSummary[];
  reports: SponsorReport[];
}) {
  const [state, formAction] = useFormState(
    saveSponsorshipTerm,
    initialSponsorActionState,
  );

  return (
    <form action={formAction} className="rounded-xl border bg-slate-50 p-5">
      <h2 className="font-bold text-slate-900">Sponsorship terms</h2>
      <p className="mt-1 text-sm text-slate-500">
        Track package, term dates, committed contribution, and private finance
        notes.
      </p>
      <SponsorFormNotice state={state} />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Sponsor
          <FormSelect
            name="sponsorId"
            required
            placeholder="Choose sponsor"
            options={reports.map((sponsor) => ({
              label: sponsor.name,
              value: sponsor.id,
            }))}
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Package
          <FormSelect
            name="packageId"
            required
            placeholder="Choose package"
            options={packages.map((item) => ({
              label: `${item.name} · ${formatMoney(item.annualPriceCents)}`,
              value: item.id,
            }))}
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Status
          <FormSelect
            name="status"
            defaultValue="draft"
            placeholder="Choose status"
            options={[
              { label: "Draft", value: "draft" },
              { label: "Proposed", value: "proposed" },
              { label: "Active", value: "active" },
              { label: "Completed", value: "completed" },
              { label: "Canceled", value: "canceled" },
            ]}
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Contract amount
          <SponsorCurrencyInput
            name="contractAmount"
            placeholder="$12,000.00"
            required
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Starts on
          <Input name="startsOn" type="date" required />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Ends on
          <Input name="endsOn" type="date" required />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Olea Gives commitment
          <SponsorCurrencyInput
            name="committedContribution"
            placeholder="$3,000.00"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Category exclusivity
          <Input name="categoryExclusivity" placeholder="Governance tools" />
        </label>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Recognition public name
          <Input name="recognitionPublicName" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Recognition notes
          <Input name="recognitionNotes" />
        </label>
      </div>
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Private terms
        <Textarea name="privateTerms" />
      </label>
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Financial notes
        <Textarea name="financialNotes" />
      </label>
      <SponsorSubmitButton>Save sponsorship terms</SponsorSubmitButton>
    </form>
  );
}

function SponsorContributionForm({
  grantPrograms,
  grantRounds,
  reports,
}: {
  grantPrograms: Array<{ id: string; name: string; slug: string }>;
  grantRounds: SponsorGrantRoundOption[];
  reports: SponsorReport[];
}) {
  const [state, formAction] = useFormState(
    saveSponsorContribution,
    initialSponsorActionState,
  );
  const sponsorships = reports.flatMap((sponsor) => sponsor.sponsorships);

  return (
    <form action={formAction} className="rounded-xl border bg-slate-50 p-5">
      <h2 className="font-bold text-slate-900">Contribution allocation</h2>
      <p className="mt-1 text-sm text-slate-500">
        Record contributions and connect allocations to grant programs.
      </p>
      <SponsorFormNotice state={state} />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Sponsorship
          <FormSelect
            name="sponsorshipId"
            required
            placeholder="Choose sponsorship"
            options={sponsorships.map((sponsorship) => ({
              label: `${sponsorship.sponsorName} · ${sponsorship.packageName}`,
              value: sponsorship.id,
            }))}
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Status
          <FormSelect
            name="status"
            defaultValue="pledged"
            placeholder="Choose status"
            options={[
              { label: "Pledged", value: "pledged" },
              { label: "Invoiced", value: "invoiced" },
              { label: "Received", value: "received" },
              { label: "Allocated", value: "allocated" },
            ]}
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Amount
          <SponsorCurrencyInput
            name="amount"
            placeholder="$5,000.00"
            required
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Pledged on
          <Input name="pledgedOn" type="date" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Received on
          <Input name="receivedOn" type="date" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Allocated on
          <Input name="allocatedOn" type="date" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          QuickBooks transaction ID
          <Input name="quickbooksTransactionId" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Grant program
          <FormSelect
            defaultValue={FORM_SELECT_EMPTY_VALUE}
            name="grantProgramId"
            placeholder="No allocation yet"
            options={[
              { label: "No allocation yet", value: FORM_SELECT_EMPTY_VALUE },
              ...grantPrograms.map((program) => ({
                label: program.name,
                value: program.id,
              })),
            ]}
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Grant round
          <FormSelect
            defaultValue={FORM_SELECT_EMPTY_VALUE}
            name="grantRoundId"
            placeholder="No specific round"
            options={[
              { label: "No specific round", value: FORM_SELECT_EMPTY_VALUE },
              ...grantRounds.map((round) => ({
                label: `${round.name} · ${round.status}`,
                value: round.id,
              })),
            ]}
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Allocation amount
          <SponsorCurrencyInput
            name="allocationAmount"
            placeholder="$5,000.00"
          />
        </label>
      </div>
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Notes
        <Textarea name="notes" />
      </label>
      <SponsorSubmitButton>Save contribution</SponsorSubmitButton>
    </form>
  );
}

export function SponsorManagement({
  grantPrograms,
  grantRounds,
  packages,
  reports,
}: {
  grantPrograms: Array<{ id: string; name: string; slug: string }>;
  grantRounds: SponsorGrantRoundOption[];
  packages: SponsorshipPackageSummary[];
  reports: SponsorReport[];
}) {
  return (
    <section className="mt-8">
      <SectionHeading>Finance administration</SectionHeading>
      <Tabs
        defaultValue="profile"
        className="rounded-xl border bg-white p-4 shadow-soft"
      >
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto min-w-max justify-start gap-1 bg-olea-light/70 p-1">
            <TabsTrigger value="profile">Sponsor profile</TabsTrigger>
            <TabsTrigger value="terms">Sponsorship terms</TabsTrigger>
            <TabsTrigger value="contributions">
              Contribution allocation
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="profile" className="mt-5">
          <SponsorProfileForm reports={reports} />
        </TabsContent>
        <TabsContent value="terms" className="mt-5">
          <SponsorshipTermsForm packages={packages} reports={reports} />
        </TabsContent>
        <TabsContent value="contributions" className="mt-5">
          <SponsorContributionForm
            grantPrograms={grantPrograms}
            grantRounds={grantRounds}
            reports={reports}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
