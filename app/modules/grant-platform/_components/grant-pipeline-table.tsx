"use client";

import { FileDown } from "lucide-react";
import { useState } from "react";

import { AddGrantDialog } from "@/app/modules/grant-platform/_components/add-grant-dialog";
import { ApplicationWorkflowDialog } from "@/app/modules/grant-platform/_components/application-workflow-dialog";
import { RequestWriterDialog } from "@/app/modules/grant-platform/_components/request-writer-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { filterGrantApplications, isGrantApplicationPastDue } from "@/lib/grants/pipeline";

interface GrantPipelineTableProps {
  canEditGrants: boolean;
  canViewReports: boolean;
  data: GrantPlatformWorkspaceData;
  onSwitchTab: (tab: string) => void;
}

export function GrantPipelineTable({
  canEditGrants,
  canViewReports,
  data,
  onSwitchTab,
}: GrantPipelineTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const statuses = [...new Set(data.applications.map((application) => application.status))];
  const filteredApplications = filterGrantApplications(data.applications, {
    searchQuery,
    statusFilter,
  });

  return (
    <section className="space-y-5" aria-labelledby="grant-pipeline-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="grant-pipeline-title" className="text-2xl font-bold text-navy-blue">
            Grant Pipeline
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Saved applications in this workspace. Reports use the same records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEditGrants ? <AddGrantDialog /> : null}
          <Button type="button" variant="outline" onClick={() => onSwitchTab("partners")}>Add Partner</Button>
          <ApplicationWorkflowDialog data={data} />
          <RequestWriterDialog />
          {canViewReports ? (
            <Button asChild variant="outline">
              <a href="/api/grant-platform/export">
                <FileDown className="size-4" />
                Export Board Report
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-soft">
        <Input
          aria-label="Search grants or funders"
          className="min-w-[220px] flex-1"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search grants or funders..."
          value={searchQuery}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger aria-label="Filter grants by status" className="w-[190px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>{formatStatus(status)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-soft">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>Grant</TableHead>
              <TableHead>Funder</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Next step</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplications.map((application) => (
              <TableRow key={application.id}>
                <TableCell className="min-w-48 font-medium text-slate-900">
                  <span className="block">{application.roundName}</span>
                  <span className="mt-1 block text-xs font-normal text-slate-500">{application.focusArea}</span>
                </TableCell>
                <TableCell>{application.funderName}</TableCell>
                <TableCell><Badge variant="outline">{formatStatus(application.status)}</Badge></TableCell>
                <TableCell>{formatCurrency(application.requestedAmountCents)}</TableCell>
                <TableCell>
                  {formatDeadline(application.deadlineAt)}
                  {isGrantApplicationPastDue(application) ? <span className="block text-xs font-semibold text-red-700">Past due</span> : null}
                </TableCell>
                <TableCell className="min-w-52 text-slate-600">{application.nextMilestone}</TableCell>
              </TableRow>
            ))}
            {!filteredApplications.length ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-slate-600">
                  {data.applications.length
                    ? "No grants match your filters."
                    : "No saved grants yet. Add a grant to start the pipeline."}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

function formatDeadline(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not set"
    : date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
