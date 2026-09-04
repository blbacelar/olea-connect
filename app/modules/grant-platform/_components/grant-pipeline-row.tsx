"use client";

import { ChevronDown, ChevronRight } from "lucide-react";

import type {
  GrantPipelineGrant,
  GrantPipelineNote,
} from "@/app/modules/grant-platform/_components/grant-pipeline-data";
import {
  GrantCoachingSection,
  GrantOverviewSection,
  PreSubmissionSection,
} from "@/app/modules/grant-platform/_components/grant-pipeline-pre-award-sections";
import {
  ApprovedGrantSection,
  DeclinedGrantSection,
  GrantCollaborationSection,
  GrantFilesSection,
} from "@/app/modules/grant-platform/_components/grant-pipeline-post-award-sections";
import { GrantPipelineStatusBadge } from "@/app/modules/grant-platform/_components/grant-pipeline-status-badge";

export function GrantPipelineRow({
  grant,
  isExpanded,
  newNoteText,
  notes,
  statusMessage,
  onMarkSubmitted,
  onNewNoteTextChange,
  onOpenPortal,
  onPostNote,
  onStatusChange,
  onToggle,
}: {
  grant: GrantPipelineGrant;
  isExpanded: boolean;
  newNoteText: string;
  notes: GrantPipelineNote[];
  statusMessage?: string;
  onMarkSubmitted: (grantName: string) => void;
  onNewNoteTextChange: (value: string) => void;
  onOpenPortal: () => void;
  onPostNote: (grantId: string) => void;
  onStatusChange: (grantId: string, status: string) => void;
  onToggle: () => void;
}) {
  return (
    <div className="transition-colors hover:bg-slate-50/50">
      <GrantPipelineSummaryRow
        grant={grant}
        isExpanded={isExpanded}
        onToggle={onToggle}
      />
      {isExpanded ? (
        <GrantPipelineExpandedDetails
          grant={grant}
          newNoteText={newNoteText}
          notes={notes}
          statusMessage={statusMessage}
          onMarkSubmitted={onMarkSubmitted}
          onNewNoteTextChange={onNewNoteTextChange}
          onOpenPortal={onOpenPortal}
          onPostNote={onPostNote}
          onStatusChange={onStatusChange}
        />
      ) : null}
    </div>
  );
}

function GrantPipelineSummaryRow({
  grant,
  isExpanded,
  onToggle,
}: {
  grant: GrantPipelineGrant;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="grid cursor-pointer grid-cols-[2.5fr_1.5fr_1.2fr_1fr_1fr_1.2fr] items-center px-4 py-3.5 text-sm"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2 font-medium text-slate-900">
        {isExpanded ? (
          <ChevronDown className="size-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-slate-400" />
        )}
        <span>{grant.name}</span>
      </div>
      <div className="text-slate-600">{grant.funder}</div>
      <div>
        <GrantPipelineStatusBadge status={grant.status} />
      </div>
      <div className="font-semibold text-slate-700">{grant.requested}</div>
      <div className="font-medium text-slate-600">{grant.awarded}</div>
      <div className="font-semibold text-orange-600">{grant.deadline}</div>
    </div>
  );
}

function GrantPipelineExpandedDetails({
  grant,
  newNoteText,
  notes,
  statusMessage,
  onMarkSubmitted,
  onNewNoteTextChange,
  onOpenPortal,
  onPostNote,
  onStatusChange,
}: {
  grant: GrantPipelineGrant;
  newNoteText: string;
  notes: GrantPipelineNote[];
  statusMessage?: string;
  onMarkSubmitted: (grantName: string) => void;
  onNewNoteTextChange: (value: string) => void;
  onOpenPortal: () => void;
  onPostNote: (grantId: string) => void;
  onStatusChange: (grantId: string, status: string) => void;
}) {
  return (
    <div className="space-y-6 border-t border-slate-100 bg-slate-50/80 p-5">
      <GrantOverviewSection
        grant={grant}
        statusMessage={statusMessage}
        onStatusChange={onStatusChange}
      />
      <GrantCoachingSection grant={grant} />
      <PreSubmissionSection
        grant={grant}
        onMarkSubmitted={onMarkSubmitted}
        onOpenPortal={onOpenPortal}
      />
      <ApprovedGrantSection grant={grant} />
      <DeclinedGrantSection grant={grant} />
      <GrantCollaborationSection
        grantId={grant.id}
        newNoteText={newNoteText}
        notes={notes}
        onNewNoteTextChange={onNewNoteTextChange}
        onPostNote={onPostNote}
      />
      <GrantFilesSection grant={grant} />
    </div>
  );
}
