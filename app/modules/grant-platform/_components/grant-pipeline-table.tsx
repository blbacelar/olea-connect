"use client";

import { useState } from "react";

import { AddGrantDialog } from "@/app/modules/grant-platform/_components/add-grant-dialog";
import {
  grantPipelineGrants,
  initialGrantPipelineNotes,
  type GrantPipelineNote,
} from "@/app/modules/grant-platform/_components/grant-pipeline-data";
import {
  GrantPortalDialog,
  GrantSubmissionDialog,
} from "@/app/modules/grant-platform/_components/grant-pipeline-dialogs";
import { GrantPipelineRow } from "@/app/modules/grant-platform/_components/grant-pipeline-row";
import { ApplicationWorkflowDialog } from "@/app/modules/grant-platform/_components/grant-platform-workspace";
import { RequestWriterDialog } from "@/app/modules/grant-platform/_components/request-writer-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GrantPlatformWorkspaceData } from "@/lib/data/grant-platform";

interface GrantPipelineTableProps {
  canEditGrants: boolean;
  data: GrantPlatformWorkspaceData;
  onSwitchTab: (tab: string) => void;
}

export function GrantPipelineTable({
  canEditGrants,
  data,
  onSwitchTab,
}: GrantPipelineTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>("grant-1");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [portalModalOpen, setPortalModalOpen] = useState(false);
  const [activeGrantForSubmission, setActiveGrantForSubmission] =
    useState<string | null>(null);
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [submissionSuccessMsg, setSubmissionSuccessMsg] = useState<
    string | null
  >(null);
  const [statusMessages, setStatusMessages] = useState<Record<string, string>>(
    {},
  );
  const [postedNotes, setPostedNotes] =
    useState<Record<string, GrantPipelineNote[]>>(initialGrantPipelineNotes);
  const [newNoteText, setNewNoteText] = useState("");
  const filteredGrants = grantPipelineGrants.filter((grant) =>
    matchesGrantFilters(grant, { searchQuery, statusFilter }),
  );

  function handlePostNote(grantId: string) {
    if (!newNoteText.trim()) return;
    setPostedNotes((currentNotes) => ({
      ...currentNotes,
      [grantId]: [
        ...(currentNotes[grantId] || []),
        { author: "Grant Manager", date: "Just now", text: newNoteText.trim() },
      ],
    }));
    setNewNoteText("");
  }

  function handleStatusChange(grantId: string, status: string) {
    setStatusMessages((currentMessages) => ({
      ...currentMessages,
      [grantId]: `Status updated to ${status}. Team notified.`,
    }));
  }

  function handleMarkSubmitted(grantName: string) {
    setActiveGrantForSubmission(grantName);
    setSubmissionModalOpen(true);
  }

  function handleRecordSubmissionSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!confirmationNumber.trim()) return;

    setSubmissionSuccessMsg(
      `GRANT SUBMISSION RECORDED!\nFunder Confirmation #: ${confirmationNumber.trim()}\nStatus changed to: Applied.`,
    );
    window.setTimeout(() => {
      setSubmissionModalOpen(false);
      setSubmissionSuccessMsg(null);
      setConfirmationNumber("");
    }, 2000);
  }

  return (
    <div className="space-y-6">
      <GrantPipelineHeader
        canEditGrants={canEditGrants}
        data={data}
        onSwitchTab={onSwitchTab}
      />
      <GrantPipelineFilters
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onSearchQueryChange={setSearchQuery}
        onStatusFilterChange={setStatusFilter}
      />
      <GrantPipelineRows
        expandedId={expandedId}
        grants={filteredGrants}
        newNoteText={newNoteText}
        postedNotes={postedNotes}
        statusMessages={statusMessages}
        onMarkSubmitted={handleMarkSubmitted}
        onNewNoteTextChange={setNewNoteText}
        onOpenPortal={() => setPortalModalOpen(true)}
        onPostNote={handlePostNote}
        onStatusChange={handleStatusChange}
        onToggleExpanded={setExpandedId}
      />
      <GrantPortalDialog
        open={portalModalOpen}
        onOpenChange={setPortalModalOpen}
      />
      <GrantSubmissionDialog
        activeGrantForSubmission={activeGrantForSubmission}
        confirmationNumber={confirmationNumber}
        open={submissionModalOpen}
        submissionSuccessMsg={submissionSuccessMsg}
        onConfirmationNumberChange={setConfirmationNumber}
        onOpenChange={setSubmissionModalOpen}
        onSubmit={handleRecordSubmissionSubmit}
      />
    </div>
  );
}

function GrantPipelineHeader({
  canEditGrants,
  data,
  onSwitchTab,
}: GrantPipelineTableProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-bold text-navy-blue">Grant Pipeline</h2>
      <div className="flex flex-wrap items-center gap-2">
        {canEditGrants ? <AddGrantDialog /> : null}
        <Button
          type="button"
          className="bg-olea-green text-white hover:bg-olea-green/90"
          onClick={() => onSwitchTab("partners")}
        >
          Add Partner
        </Button>
        <ApplicationWorkflowDialog data={data} />
        <RequestWriterDialog />
        <Button
          type="button"
          variant="outline"
          className="bg-slate-100 text-slate-800"
          onClick={() => window.print()}
        >
          Export Board Report
        </Button>
      </div>
    </div>
  );
}

function GrantPipelineFilters({
  searchQuery,
  statusFilter,
  onSearchQueryChange,
  onStatusFilterChange,
}: {
  searchQuery: string;
  statusFilter: string;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-soft">
      <div className="min-w-[200px] flex-1">
        <Input
          placeholder="Search grants or funders..."
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          className="h-9"
        />
      </div>
      <div className="w-[180px]">
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function GrantPipelineRows({
  expandedId,
  grants,
  newNoteText,
  postedNotes,
  statusMessages,
  onMarkSubmitted,
  onNewNoteTextChange,
  onOpenPortal,
  onPostNote,
  onStatusChange,
  onToggleExpanded,
}: {
  expandedId: string | null;
  grants: typeof grantPipelineGrants;
  newNoteText: string;
  postedNotes: Record<string, GrantPipelineNote[]>;
  statusMessages: Record<string, string>;
  onMarkSubmitted: (grantName: string) => void;
  onNewNoteTextChange: (value: string) => void;
  onOpenPortal: () => void;
  onPostNote: (grantId: string) => void;
  onStatusChange: (grantId: string, status: string) => void;
  onToggleExpanded: (grantId: string | null) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
      <div className="grid grid-cols-[2.5fr_1.5fr_1.2fr_1fr_1fr_1.2fr] bg-navy-blue px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white">
        <div>Grant Name</div>
        <div>Funder</div>
        <div>Status</div>
        <div>Requested</div>
        <div>Awarded</div>
        <div>Deadline</div>
      </div>
      <div className="divide-y divide-slate-100">
        {grants.map((grant) => {
          const isExpanded = expandedId === grant.id;
          return (
            <GrantPipelineRow
              key={grant.id}
              grant={grant}
              isExpanded={isExpanded}
              newNoteText={newNoteText}
              notes={postedNotes[grant.id] || []}
              statusMessage={statusMessages[grant.id]}
              onMarkSubmitted={onMarkSubmitted}
              onNewNoteTextChange={onNewNoteTextChange}
              onOpenPortal={onOpenPortal}
              onPostNote={onPostNote}
              onStatusChange={onStatusChange}
              onToggle={() => onToggleExpanded(isExpanded ? null : grant.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function matchesGrantFilters(
  grant: (typeof grantPipelineGrants)[number],
  filters: { searchQuery: string; statusFilter: string },
) {
  const normalizedSearch = filters.searchQuery.toLowerCase();
  const matchesSearch =
    grant.name.toLowerCase().includes(normalizedSearch) ||
    grant.funder.toLowerCase().includes(normalizedSearch);
  const matchesStatus =
    filters.statusFilter === "all" || grant.status === filters.statusFilter;

  return matchesSearch && matchesStatus;
}
