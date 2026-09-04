"use client";

import { CheckCircle2, ExternalLink, FileCheck, Sparkles } from "lucide-react";

import { RequestWriterDialog } from "@/app/modules/grant-platform/_components/request-writer-dialog";
import type { GrantPipelineGrant } from "@/app/modules/grant-platform/_components/grant-pipeline-data";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const preSubmissionChecklist = [
  "Problem statement reviewed and finalized",
  "Budget complete and realistic",
  "Letters of support collected",
  "Logic model finalized",
  "All sections reviewed by team",
  "Spelling/grammar check complete",
];

export function GrantOverviewSection({
  grant,
  statusMessage,
  onStatusChange,
}: {
  grant: GrantPipelineGrant;
  statusMessage?: string;
  onStatusChange: (grantId: string, status: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-base font-bold text-navy-blue">Grant Overview</h3>
      <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
        <p>
          <strong>Funder:</strong> {grant.funder}
        </p>
        <p>
          <strong>Amount Requested:</strong> {grant.requested}
        </p>
        <p className="md:col-span-2">
          <strong>Funder Focus:</strong> {grant.funderFocus}
        </p>
        {grant.awarded !== "-" ? (
          <p>
            <strong>Amount Awarded:</strong> {grant.awarded}
          </p>
        ) : null}
        <p>
          <strong>Deadline:</strong> {grant.deadline} ({grant.daysAway})
        </p>
        <p>
          <strong>Progress:</strong> {grant.progress} complete
        </p>
      </div>
      <GrantStatusSelector
        grant={grant}
        statusMessage={statusMessage}
        onStatusChange={onStatusChange}
      />
    </div>
  );
}

export function GrantCoachingSection({
  grant,
}: {
  grant: GrantPipelineGrant;
}) {
  if (!["in_progress", "planning"].includes(grant.status)) return null;

  return (
    <div className="space-y-2 rounded-lg border-l-4 border-olea-green bg-white p-4 shadow-soft">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <Sparkles className="size-4 text-olea-green" />
        {grant.status === "in_progress"
          ? "Draft Writing Coaching (Drafting Stage)"
          : "Planning Stage Coaching"}
      </h3>
      {grant.status === "in_progress" ? (
        <DraftWritingCoaching grantName={grant.name} />
      ) : (
        <PlanningCoaching />
      )}
    </div>
  );
}

export function PreSubmissionSection({
  grant,
  onMarkSubmitted,
  onOpenPortal,
}: {
  grant: GrantPipelineGrant;
  onMarkSubmitted: (grantName: string) => void;
  onOpenPortal: () => void;
}) {
  if (grant.status !== "in_progress") return null;

  return (
    <div className="space-y-3 rounded-lg border-2 border-orange-400 bg-orange-50/50 p-4">
      <h4 className="flex items-center gap-2 text-sm font-bold text-navy-blue">
        <FileCheck className="size-4 text-orange-600" />
        Pre-Submission Checklist
      </h4>
      <div className="grid gap-2 text-xs text-slate-700 md:grid-cols-2">
        {preSubmissionChecklist.map((checkItem) => (
          <label key={checkItem} className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <span>{checkItem}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-slate-500">All required files uploaded below</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="sm"
          type="button"
          className="gap-2 bg-orange-600 text-white hover:bg-orange-700"
          onClick={onOpenPortal}
        >
          <ExternalLink className="size-3.5" />
          Open Funder Portal
        </Button>
        <Button
          size="sm"
          type="button"
          className="gap-2 bg-olea-green text-white hover:bg-olea-green/90"
          onClick={() => onMarkSubmitted(grant.name)}
        >
          <CheckCircle2 className="size-3.5" />
          Mark as Submitted
        </Button>
      </div>
    </div>
  );
}

function GrantStatusSelector({
  grant,
  statusMessage,
  onStatusChange,
}: {
  grant: GrantPipelineGrant;
  statusMessage?: string;
  onStatusChange: (grantId: string, status: string) => void;
}) {
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-olea-green/30 bg-olea-light/40 p-3">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
        Change Status:
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-[180px]">
          <Select
            defaultValue={grant.status}
            onValueChange={(value) => onStatusChange(grant.id, value)}
          >
            <SelectTrigger className="h-9 border-olea-green bg-white font-semibold text-slate-900">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-slate-500">
          Status changes instantly - Team is notified
        </span>
      </div>
      {statusMessage ? (
        <p className="text-xs font-medium text-olea-green">{statusMessage}</p>
      ) : null}
    </div>
  );
}

function DraftWritingCoaching({ grantName }: { grantName: string }) {
  return (
    <div className="space-y-1.5 text-xs leading-relaxed text-slate-700">
      <p>
        <strong>Problem Statement:</strong> Use data, not emotion.
        &quot;50% of youth lack mentorship (source: 2025 Census)&quot;
      </p>
      <p>
        <strong>Solution:</strong> Be specific. &quot;Matched 1:1 mentoring,
        2 hrs/month, 12-month commitment&quot;
      </p>
      <p>
        <strong>Impact:</strong> Connect to funder priorities. &quot;This aligns
        with their focus on youth development.&quot;
      </p>
      <div className="pt-2">
        <RequestWriterDialog
          grantName={grantName}
          trigger={
            <Button size="sm" className="bg-olea-green text-white hover:bg-olea-green/90">
              Express Interest in Writer Support
            </Button>
          }
        />
      </div>
    </div>
  );
}

function PlanningCoaching() {
  return (
    <div className="space-y-1 text-xs text-slate-700">
      <p>Research funder mission and past grants</p>
      <p>Read ALL guidelines carefully</p>
      <p>Assess fit: Is this 90%+ aligned?</p>
      <p>Define your unique angle</p>
    </div>
  );
}
