import {
  CheckCircle2,
  Handshake,
  Lock,
} from "lucide-react";

import { EmptyPanel } from "@/components/EmptyPanel";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSponsorsData } from "@/lib/data/sponsors";
import { getRequestLocale } from "@/lib/i18n/server";
import type {
  SponsorDirectoryProfile,
  SponsorReport,
  SponsorshipReport,
} from "@/lib/types";

import { SponsorManagement } from "./sponsor-management";

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

function SponsorDirectory({
  sponsors,
}: {
  sponsors: SponsorDirectoryProfile[];
}) {
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
            <Badge
              variant="outline"
              className="border-green-200 bg-green-50 text-green-700"
            >
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
                <p className="text-lg font-bold text-slate-900">
                  {sponsor.name}
                </p>
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
  const isFrench = getRequestLocale() === "fr-CA";
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
            {formatDate(sponsorship.startsOn)} to{" "}
            {formatDate(sponsorship.endsOn)}
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

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Metric
          label="Contract"
          value={formatMoney(sponsorship.contractAmountCents)}
        />
        <Metric
          label="Recorded contributions"
          value={formatMoney(sponsorship.contributionAmountCents)}
        />
      </div>

      {sponsorship.committedContributionCents > 0 || sponsorship.allocatedAmountCents > 0 ? (
        <div className="mt-3 rounded-lg border bg-white p-3 text-sm text-slate-600">
          {isFrench ? "Anciens dossiers de subventions" : "Legacy grant records"}: {formatMoney(sponsorship.committedContributionCents)} {isFrench ? "engagés" : "committed"}; {formatMoney(sponsorship.allocatedAmountCents)} {isFrench ? "attribués" : "allocated"}.
        </div>
      ) : null}

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
            <p className="mt-1">
              Financial notes: {sponsorship.financialNotes}
            </p>
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
                <TableHead>Legacy allocations</TableHead>
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
                              }: ${formatMoney(allocation.amountCents)}`,
                          )
                          .join("; ")
                      : "—"}
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

export default async function SponsorsPage() {
  const isFrench = getRequestLocale() === "fr-CA";
  const {
    canManageSponsors,
    directorySponsors,
    packages,
    reports,
  } = await getSponsorsData();

  return (
    <div>
      <PageHeader
        title={isFrench ? "Commanditaires et Cercle de générosité d'Olea" : "Sponsors & Olea's Circle of Generosity"}
        description={isFrench
          ? "Découvrez les commanditaires approuvés. Olive Social Impact remet 15 % de ses bénéfices aux organismes sans but lucratif sous forme de dons sans restriction."
          : "Browse approved sponsors. Olive Social Impact donates 15% of its profits to nonprofits as unrestricted donations."}
      />

      {canManageSponsors ? (
        <SponsorManagement
          packages={packages}
          reports={reports}
        />
      ) : null}

      <section
        className={`${canManageSponsors ? "mt-8 " : ""}rounded-xl border bg-white p-5 shadow-soft`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olea-green">
              {isFrench ? "Répertoire des commanditaires" : "Sponsor directory"}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {isFrench ? "Profils des commanditaires approuvés" : "Approved sponsor profiles"}
            </h2>
          </div>
          <Badge
            variant="outline"
            className="border-green-200 bg-green-50 text-green-700"
          >
            <CheckCircle2 className="mr-1 size-3" />
            {isFrench ? "Actifs et approuvés seulement" : "Active and approved only"}
          </Badge>
        </div>
        <div className="mt-5">
          <SponsorDirectory sponsors={directorySponsors} />
        </div>
      </section>

      <ReportingSummary reports={reports} />

    </div>
  );
}
