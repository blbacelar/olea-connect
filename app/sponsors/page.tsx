import {
  BadgeDollarSign,
  CheckCircle2,
  CircleDollarSign,
  Handshake,
  Lock,
} from "lucide-react";

import { EmptyPanel } from "@/components/EmptyPanel";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  getSponsorsData,
  type SponsorGrantRoundOption,
} from "@/lib/data/sponsors";
import type {
  SponsorDirectoryProfile,
  SponsorReport,
  SponsorshipPackageSummary,
  SponsorshipReport,
} from "@/lib/types";

import {
  saveSponsorContribution,
  saveSponsorProfile,
  saveSponsorshipTerm,
} from "./actions";

function formatMoney(amountCents: number) {
  return new Intl.NumberFormat("en-CA", {
    currency: "CAD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amountCents / 100);
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (["active", "received", "allocated"].includes(status)) {
    return "border-green-200 bg-green-50 text-green-700";
  }
  if (["paused", "invoiced", "proposed"].includes(status)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["canceled", "declined"].includes(status)) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function SponsorDirectory({ sponsors }: { sponsors: SponsorDirectoryProfile[] }) {
  if (!sponsors.length) {
    return (
      <EmptyPanel
        title="No active sponsors yet"
        description="Approved sponsor profiles will appear here once they are visible to members."
        icon={<Handshake className="size-5" />}
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sponsors.map((sponsor) => (
        <article
          key={sponsor.id}
          className="rounded-xl border bg-white p-5 shadow-soft"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-slate-900">{sponsor.name}</p>
              {sponsor.category ? (
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-olea-green">
                  {sponsor.category}
                </p>
              ) : null}
            </div>
            <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
              Active
            </Badge>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            {sponsor.directoryDescription ||
              sponsor.shortDescription ||
              "Sponsor profile details are coming soon."}
          </p>
          <div className="mt-5 space-y-1 text-sm text-slate-500">
            {sponsor.websiteUrl ? (
              <a
                href={sponsor.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="block font-semibold text-olea-green hover:underline"
              >
                Visit website
              </a>
            ) : null}
            {sponsor.directoryEmail ? <p>{sponsor.directoryEmail}</p> : null}
            {sponsor.directoryPhone ? <p>{sponsor.directoryPhone}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function ReportingSummary({ reports }: { reports: SponsorReport[] }) {
  if (!reports.length) return null;

  return (
    <section className="mt-8">
      <SectionHeading>Sponsor reporting</SectionHeading>
      <div className="space-y-5">
        {reports.map((sponsor) => (
          <article
            key={sponsor.id}
            className="rounded-xl border bg-white p-5 shadow-soft"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-slate-900">{sponsor.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {sponsor.contacts.length
                    ? `Contacts: ${sponsor.contacts
                        .map((contact) => contact.fullName)
                        .join(", ")}`
                    : "No sponsor contacts recorded"}
                </p>
              </div>
              <Badge variant="outline" className={statusClass(sponsor.status)}>
                {sponsor.status}
              </Badge>
            </div>

            {sponsor.sponsorships.length ? (
              <div className="mt-5 space-y-4">
                {sponsor.sponsorships.map((sponsorship) => (
                  <SponsorshipReportCard
                    key={sponsorship.id}
                    sponsorship={sponsorship}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                No sponsorship terms are recorded yet.
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function SponsorshipReportCard({
  sponsorship,
}: {
  sponsorship: SponsorshipReport;
}) {
  const recognitionName =
    typeof sponsorship.recognitionPreferences.public_name === "string"
      ? sponsorship.recognitionPreferences.public_name
      : null;

  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">
            {sponsorship.packageName}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(sponsorship.startsOn)} to {formatDate(sponsorship.endsOn)}
          </p>
          {recognitionName ? (
            <p className="mt-1 text-sm text-slate-500">
              Recognition name: {recognitionName}
            </p>
          ) : null}
        </div>
        <Badge variant="outline" className={statusClass(sponsorship.status)}>
          {sponsorship.status}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Metric label="Contract" value={formatMoney(sponsorship.contractAmountCents)} />
        <Metric
          label="Committed to Olea Gives"
          value={formatMoney(sponsorship.committedContributionCents)}
        />
        <Metric
          label="Recorded contributions"
          value={formatMoney(sponsorship.contributionAmountCents)}
        />
        <Metric
          label="Allocated"
          value={formatMoney(sponsorship.allocatedAmountCents)}
          tone={sponsorship.isReconciled ? "text-green-700" : "text-amber-700"}
        />
      </div>

      {sponsorship.privateTerms || sponsorship.financialNotes ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold">
            <Lock className="size-4" />
            Private finance notes
          </p>
          {sponsorship.privateTerms ? (
            <p className="mt-2">Terms: {sponsorship.privateTerms}</p>
          ) : null}
          {sponsorship.financialNotes ? (
            <p className="mt-1">Financial notes: {sponsorship.financialNotes}</p>
          ) : null}
        </div>
      ) : null}

      {sponsorship.contributions.length ? (
        <div className="mt-4 overflow-hidden rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Pledged</TableHead>
                <TableHead>Allocations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sponsorship.contributions.map((contribution) => (
                <TableRow key={contribution.id}>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusClass(contribution.status)}
                    >
                      {contribution.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatMoney(contribution.amountCents)}</TableCell>
                  <TableCell>{formatDate(contribution.pledgedOn)}</TableCell>
                  <TableCell>
                    {contribution.allocations.length
                      ? contribution.allocations
                          .map(
                            (allocation) =>
                              `${allocation.grantProgramName}${
                                allocation.grantRoundName
                                  ? ` · ${allocation.grantRoundName}`
                                  : ""
                              }: ${formatMoney(
                                allocation.amountCents,
                              )}`,
                          )
                          .join("; ")
                      : "Not allocated"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  tone = "text-slate-900",
  value,
}: {
  label: string;
  tone?: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function SponsorManagement({
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
      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <SponsorProfileForm reports={reports} />
        <SponsorshipForms
          grantPrograms={grantPrograms}
          grantRounds={grantRounds}
          packages={packages}
          reports={reports}
        />
      </div>
    </section>
  );
}

function SponsorProfileForm({ reports }: { reports: SponsorReport[] }) {
  return (
    <form action={saveSponsorProfile} className="rounded-xl border bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">Sponsor profile</h2>
          <p className="mt-1 text-sm text-slate-500">
            Publish approved directory information and primary contact access.
          </p>
        </div>
        <Badge variant="outline">Admin</Badge>
      </div>
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Existing sponsor
        <select
          className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
          name="sponsorId"
        >
          <option value="">Create new sponsor</option>
          {reports.map((sponsor) => (
            <option key={sponsor.id} value={sponsor.id}>
              {sponsor.name}
            </option>
          ))}
        </select>
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
          <select
            className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
            name="status"
            defaultValue="prospect"
          >
            <option value="prospect">Prospect</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="former">Former</option>
            <option value="declined">Declined</option>
          </select>
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
        <Input name="shortDescription" placeholder="One-line directory summary" />
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
          <Input name="directoryEmail" type="email" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Directory phone
          <Input name="directoryPhone" />
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
            <Input name="primaryContactEmail" type="email" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Title
            <Input name="primaryContactTitle" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Phone
            <Input name="primaryContactPhone" />
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
      <Button className="mt-5" type="submit">
        Save sponsor profile
      </Button>
    </form>
  );
}

function SponsorshipForms({
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
  const sponsorships = reports.flatMap((sponsor) => sponsor.sponsorships);

  return (
    <div className="space-y-5">
      <form action={saveSponsorshipTerm} className="rounded-xl border bg-white p-5 shadow-soft">
        <h2 className="font-bold text-slate-900">Sponsorship terms</h2>
        <p className="mt-1 text-sm text-slate-500">
          Track package, term dates, committed contribution, and private finance notes.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Sponsor
            <select
              className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
              name="sponsorId"
              required
            >
              <option value="">Choose sponsor</option>
              {reports.map((sponsor) => (
                <option key={sponsor.id} value={sponsor.id}>
                  {sponsor.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Package
            <select
              className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
              name="packageId"
              required
            >
              <option value="">Choose package</option>
              {packages.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {formatMoney(item.annualPriceCents)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Status
            <select
              className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
              name="status"
              defaultValue="draft"
            >
              <option value="draft">Draft</option>
              <option value="proposed">Proposed</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Contract amount
            <Input name="contractAmount" placeholder="12000" required />
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
            <Input name="committedContribution" placeholder="3000" />
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
        <Button className="mt-5" type="submit">
          Save sponsorship terms
        </Button>
      </form>

      <form action={saveSponsorContribution} className="rounded-xl border bg-white p-5 shadow-soft">
        <h2 className="font-bold text-slate-900">Contribution allocation</h2>
        <p className="mt-1 text-sm text-slate-500">
          Record contributions and connect allocations to grant programs.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Sponsorship
            <select
              className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
              name="sponsorshipId"
              required
            >
              <option value="">Choose sponsorship</option>
              {sponsorships.map((sponsorship) => (
                <option key={sponsorship.id} value={sponsorship.id}>
                  {sponsorship.sponsorName} · {sponsorship.packageName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Status
            <select
              className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
              name="status"
              defaultValue="pledged"
            >
              <option value="pledged">Pledged</option>
              <option value="invoiced">Invoiced</option>
              <option value="received">Received</option>
              <option value="allocated">Allocated</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Amount
            <Input name="amount" placeholder="5000" required />
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
            <select
              className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
              name="grantProgramId"
            >
              <option value="">No allocation yet</option>
              {grantPrograms.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Grant round
            <select
              className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
              name="grantRoundId"
            >
              <option value="">No specific round</option>
              {grantRounds.map((round) => (
                <option key={round.id} value={round.id}>
                  {round.name} · {round.status}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Allocation amount
            <Input name="allocationAmount" placeholder="5000" />
          </label>
        </div>
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Notes
          <Textarea name="notes" />
        </label>
        <Button className="mt-5" type="submit">
          Save contribution
        </Button>
      </form>
    </div>
  );
}

export default async function SponsorsPage() {
  const { canManageSponsors, directorySponsors, grantPrograms, grantRounds, packages, reports } =
    await getSponsorsData();

  return (
    <div>
      <PageHeader
        title="Sponsors & Olea Gives"
        description="Browse approved sponsor profiles and track how sponsor contributions flow into Olea Gives grants."
      />

      <section className="rounded-xl border bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olea-green">
              Member directory
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Approved sponsor profiles
            </h2>
          </div>
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            <CheckCircle2 className="mr-1 size-3" />
            Active and approved only
          </Badge>
        </div>
        <div className="mt-5">
          <SponsorDirectory sponsors={directorySponsors} />
        </div>
      </section>

      <ReportingSummary reports={reports} />

      {canManageSponsors ? (
        <SponsorManagement
          grantPrograms={grantPrograms}
          grantRounds={grantRounds}
          packages={packages}
          reports={reports}
        />
      ) : null}

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-soft">
          <p className="flex items-center gap-2 text-sm font-semibold text-olea-green">
            <CircleDollarSign className="size-4" />
            Reconciliation rule
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Contribution totals are compared against grant-program allocations so
            finance can spot unallocated sponsor dollars before reporting.
          </p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-soft">
          <p className="flex items-center gap-2 text-sm font-semibold text-olea-green">
            <BadgeDollarSign className="size-4" />
            Private finance boundary
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Contract terms and financial notes are only rendered for finance and
            platform administrators, not members or sponsor contacts.
          </p>
        </div>
      </section>
    </div>
  );
}
