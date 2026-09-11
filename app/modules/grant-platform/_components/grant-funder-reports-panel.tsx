"use client";

import { BarChart3, Download, Filter, PieChart, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GrantPlatformWorkspaceData } from "@/lib/data/grant-platform";

type Application = GrantPlatformWorkspaceData["applications"][number];
type Funder = GrantPlatformWorkspaceData["partners"][number];
type ReportMode = "overview" | "success" | "trends" | null;

type FunderReportRow = {
  activeCount: number;
  applications: Application[];
  awardedCount: number;
  funder: Funder | null;
  latestNote: string;
  name: string;
  nextAction: string;
  openFollowUps: number;
  requestedAmountCents: number;
  successRate: number;
};

const unassignedFunder = "Unassigned funder";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-CA", {
    currency: "CAD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function isActiveApplication(application: Application) {
  return !["approved", "declined", "withdrawn"].includes(application.status);
}

function isAwarded(application: Application) {
  return application.awardStatus === "approved" || application.status === "approved";
}

function applicationMatchesFunder(application: Application, funderName: string) {
  const normalizedFunder = normalize(funderName);
  return (
    normalize(application.funderName) === normalizedFunder ||
    normalize(application.roundName).includes(normalizedFunder) ||
    normalize(application.fundingRequest).includes(normalizedFunder)
  );
}

function buildFunderNames(data: GrantPlatformWorkspaceData) {
  const names = new Set<string>();
  for (const funder of data.partners) names.add(funder.name);
  for (const application of data.applications) {
    if (application.funderName && application.funderName !== unassignedFunder) {
      names.add(application.funderName);
    }
  }
  if (!names.size && data.applications.length) names.add(unassignedFunder);
  return [...names].sort((left, right) => left.localeCompare(right));
}

function getApplicationsForFunder(applications: Application[], funderName: string) {
  if (funderName === unassignedFunder) {
    return applications.filter((application) => application.funderName === unassignedFunder);
  }
  return applications.filter((application) =>
    applicationMatchesFunder(application, funderName),
  );
}

function buildReportRows(
  data: GrantPlatformWorkspaceData,
  funderNames: string[],
  selectedGrantId: string,
) {
  const grantFilteredApplications =
    selectedGrantId === "all"
      ? data.applications
      : data.applications.filter((application) => application.id === selectedGrantId);

  return funderNames.map((name) => {
    const funder = data.partners.find((partner) => normalize(partner.name) === normalize(name)) ?? null;
    const applications = getApplicationsForFunder(grantFilteredApplications, name);
    const awardedCount = applications.filter(isAwarded).length;
    const interactions = funder?.interactions ?? [];
    const latestInteraction = interactions[0] ?? null;

    return {
      activeCount: applications.filter(isActiveApplication).length,
      applications,
      awardedCount,
      funder,
      latestNote: latestInteraction?.summary ?? funder?.notes ?? "No funder notes recorded.",
      name,
      nextAction: latestInteraction?.nextAction || "No next action recorded.",
      openFollowUps: interactions.filter((interaction) => interaction.followUpDate).length,
      requestedAmountCents: applications.reduce(
        (total, application) => total + application.requestedAmountCents,
        0,
      ),
      successRate: applications.length
        ? Math.round((awardedCount / applications.length) * 100)
        : 0,
    };
  });
}

function downloadCsv(rows: FunderReportRow[]) {
  const headers = [
    "Funder",
    "Applications",
    "Active applications",
    "Awarded applications",
    "Success rate",
    "Requested amount",
    "Open follow-ups",
    "Latest note",
    "Next action",
  ];
  const lines = rows.map((row) =>
    [
      row.name,
      row.applications.length,
      row.activeCount,
      row.awardedCount,
      `${row.successRate}%`,
      (row.requestedAmountCents / 100).toFixed(2),
      row.openFollowUps,
      row.latestNote,
      row.nextAction,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "grant-funder-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function GrantFunderReportsPanel({
  data,
}: {
  data: GrantPlatformWorkspaceData;
}) {
  const [selectedFunder, setSelectedFunder] = useState("all");
  const [selectedGrantId, setSelectedGrantId] = useState("all");
  const [reportMode, setReportMode] = useState<ReportMode>(null);

  const funderNames = useMemo(() => buildFunderNames(data), [data]);
  const visibleFunderNames = useMemo(
    () =>
      selectedFunder === "all"
        ? funderNames
        : funderNames.filter((name) => name === selectedFunder),
    [funderNames, selectedFunder],
  );
  const reportRows = useMemo(
    () => buildReportRows(data, visibleFunderNames, selectedGrantId),
    [data, selectedGrantId, visibleFunderNames],
  );
  const nonEmptyRows = reportRows.filter(
    (row) =>
      row.applications.length || (selectedGrantId === "all" && row.funder),
  );
  const totals = {
    active: nonEmptyRows.reduce((total, row) => total + row.activeCount, 0),
    applications: nonEmptyRows.reduce(
      (total, row) => total + row.applications.length,
      0,
    ),
    awarded: nonEmptyRows.reduce((total, row) => total + row.awardedCount, 0),
    followUps: nonEmptyRows.reduce((total, row) => total + row.openFollowUps, 0),
    requested: nonEmptyRows.reduce(
      (total, row) => total + row.requestedAmountCents,
      0,
    ),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-6 text-navy-blue" />
          <h2 className="text-2xl font-bold text-navy-blue">Funder reporting</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setReportMode("overview")}>
            <PieChart className="mr-2 size-4" />
            Funder overview
          </Button>
          <Button type="button" variant="outline" onClick={() => setReportMode("success")}>
            <TrendingUp className="mr-2 size-4" />
            Success rate
          </Button>
          <Button type="button" variant="outline" onClick={() => setReportMode("trends")}>
            <BarChart3 className="mr-2 size-4" />
            Trends
          </Button>
        </div>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="size-5 text-olea-green" />
            Report filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Select value={selectedFunder} onValueChange={setSelectedFunder}>
            <SelectTrigger aria-label="Filter reports by funder">
              <SelectValue placeholder="All funders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All funders</SelectItem>
              {funderNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedGrantId} onValueChange={setSelectedGrantId}>
            <SelectTrigger aria-label="Filter reports by grant">
              <SelectValue placeholder="All grants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All grants</SelectItem>
              {data.applications.map((application) => (
                <SelectItem key={application.id} value={application.id}>
                  {application.roundName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Applications" value={String(totals.applications)} />
        <MetricCard label="Active grants" value={String(totals.active)} />
        <MetricCard label="Awarded" value={String(totals.awarded)} />
        <MetricCard label="Requested" value={formatCurrency(totals.requested)} />
      </div>

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Funder overview table</CardTitle>
            <p className="mt-1 text-sm text-slate-600">
              Use the filters above to pull a report for one grant or one funder.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => downloadCsv(nonEmptyRows)}>
            <Download className="mr-2 size-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funder</TableHead>
                <TableHead>Grants</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Awarded</TableHead>
                <TableHead>Success</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Follow-ups</TableHead>
                <TableHead>Latest CRM note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nonEmptyRows.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="min-w-48 font-semibold text-slate-900">
                    {row.name}
                    {row.funder ? (
                      <p className="mt-1 text-xs font-normal text-slate-500">
                        {row.funder.contactName}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>{row.applications.length}</TableCell>
                  <TableCell>{row.activeCount}</TableCell>
                  <TableCell>{row.awardedCount}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.successRate}%</Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(row.requestedAmountCents)}</TableCell>
                  <TableCell>{row.openFollowUps}</TableCell>
                  <TableCell className="min-w-72 text-slate-600">
                    <p className="line-clamp-2">{row.latestNote}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.nextAction}</p>
                  </TableCell>
                </TableRow>
              ))}
              {!nonEmptyRows.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-slate-500">
                    No grant data matches the selected filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={reportMode !== null} onOpenChange={(open) => !open && setReportMode(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{getReportTitle(reportMode)}</DialogTitle>
            <DialogDescription>
              This report uses the selected funder and grant filters.
            </DialogDescription>
          </DialogHeader>
          <ReportDialogContent rows={nonEmptyRows} totals={totals} mode={reportMode} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-soft">
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
        <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function getReportTitle(mode: ReportMode) {
  if (mode === "success") return "Grant success rate report";
  if (mode === "trends") return "Grant trend report";
  return "Funder overview report";
}

function ReportDialogContent({
  mode,
  rows,
  totals,
}: {
  mode: ReportMode;
  rows: FunderReportRow[];
  totals: {
    active: number;
    applications: number;
    awarded: number;
    followUps: number;
    requested: number;
  };
}) {
  if (mode === "success") {
    return (
      <div className="space-y-3">
        {rows
          .toSorted((left, right) => right.successRate - left.successRate)
          .map((row) => (
            <div key={row.name} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-900">{row.name}</p>
                <Badge variant="outline">{row.successRate}% success</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {row.awardedCount} awarded from {row.applications.length} tracked applications.
              </p>
            </div>
          ))}
      </div>
    );
  }

  if (mode === "trends") {
    return (
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.name} className="rounded-lg border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">{row.name}</p>
            <p className="mt-1 text-sm text-slate-600">
              {row.activeCount} active grants, {row.openFollowUps} open follow-ups, and{" "}
              {formatCurrency(row.requestedAmountCents)} requested.
            </p>
            <p className="mt-2 text-xs text-slate-500">{row.nextAction}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Applications" value={String(totals.applications)} />
        <MetricCard label="Active" value={String(totals.active)} />
        <MetricCard label="Awarded" value={String(totals.awarded)} />
        <MetricCard label="Follow-ups" value={String(totals.followUps)} />
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.name} className="rounded-lg border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">{row.name}</p>
            <p className="mt-1 text-sm text-slate-600">{row.latestNote}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
