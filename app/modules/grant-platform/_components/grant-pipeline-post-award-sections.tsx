"use client";

import { AlertTriangle, CheckCircle2, Paperclip, Plus, Users } from "lucide-react";

import type {
  GrantPipelineGrant,
  GrantPipelineNote,
} from "@/app/modules/grant-platform/_components/grant-pipeline-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ApprovedGrantSection({
  grant,
}: {
  grant: GrantPipelineGrant;
}) {
  if (grant.status !== "approved") return null;

  return (
    <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-900">
          <CheckCircle2 className="size-4 text-emerald-600" />
          Approved - Post-Award Management
        </h4>
        <span className="text-xs font-semibold text-emerald-700">
          Awarded: {grant.awardDate}
        </span>
      </div>
      <ReportDeadlines grant={grant} />
      <ComplianceChecklist grant={grant} />
    </div>
  );
}

export function DeclinedGrantSection({
  grant,
}: {
  grant: GrantPipelineGrant;
}) {
  if (grant.status !== "declined") return null;

  return (
    <div className="space-y-2 rounded-lg border-l-4 border-rose-600 bg-rose-50 p-4">
      <h4 className="flex items-center gap-2 text-sm font-bold text-rose-900">
        <AlertTriangle className="size-4 text-rose-600" />
        Why It Was Declined & Lessons Learned
      </h4>
      <p className="text-xs font-medium text-rose-800">{grant.declineReason}</p>
      <div className="rounded border border-rose-200 bg-white p-2.5 text-xs text-slate-700">
        <strong>Learning for Next Time:</strong> {grant.learningNote}
      </div>
    </div>
  );
}

export function GrantCollaborationSection({
  grantId,
  newNoteText,
  notes,
  onNewNoteTextChange,
  onPostNote,
}: {
  grantId: string;
  newNoteText: string;
  notes: GrantPipelineNote[];
  onNewNoteTextChange: (value: string) => void;
  onPostNote: (grantId: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h4 className="flex items-center gap-2 text-sm font-bold text-navy-blue">
        <Users className="size-4 text-olea-green" />
        Team & Collaboration Updates
      </h4>
      <GrantNotesList notes={notes} />
      <div className="flex gap-2 pt-1">
        <Input
          placeholder="Write a team update..."
          value={newNoteText}
          onChange={(event) => onNewNoteTextChange(event.target.value)}
          className="h-9 text-xs"
        />
        <Button size="sm" type="button" onClick={() => onPostNote(grantId)}>
          Post Update
        </Button>
      </div>
    </div>
  );
}

export function GrantFilesSection({ grant }: { grant: GrantPipelineGrant }) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-bold text-navy-blue">
          <Paperclip className="size-4 text-olea-green" />
          Grant Files & Attachments
        </h4>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => alert("File upload modal initialized. Choose your document.")}
        >
          <Plus className="size-3.5" />
          Upload File
        </Button>
      </div>
      <div className="space-y-1.5 text-xs text-slate-700">
        {grant.files.map((file) => (
          <div
            key={file.name}
            className="flex items-center justify-between rounded border border-slate-100 p-2"
          >
            <span className="font-medium text-slate-800">{file.name}</span>
            <span className="text-slate-400">{file.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportDeadlines({ grant }: { grant: GrantPipelineGrant }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
        Report Deadlines
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {grant.postAwardReports?.map((report) => (
          <div
            key={report.name}
            className="rounded border border-emerald-200 bg-white p-2.5 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">{report.name}</span>
              <Badge className="bg-orange-500 text-white">{report.status}</Badge>
            </div>
            <p className="mt-1 text-slate-500">Due: {report.due}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComplianceChecklist({ grant }: { grant: GrantPipelineGrant }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
        Compliance Checklist
      </p>
      <div className="space-y-2 rounded border border-emerald-100 bg-white p-3">
        {grant.compliance?.map((comp) => (
          <div key={comp.title} className="flex items-start gap-2.5 text-xs">
            <input
              type="checkbox"
              defaultChecked={comp.done}
              className="mt-0.5 rounded text-emerald-600"
            />
            <div>
              <p className="font-medium text-slate-800">{comp.title}</p>
              <p
                className={
                  comp.done ? "font-semibold text-emerald-700" : "text-slate-500"
                }
              >
                {comp.note}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GrantNotesList({ notes }: { notes: GrantPipelineNote[] }) {
  return (
    <div className="space-y-2">
      {notes.map((note) => (
        <div
          key={`${note.author}-${note.date}`}
          className="rounded border border-slate-100 bg-slate-50 p-3 text-xs"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-bold text-slate-900">{note.author}</span>
            <span>{note.date}</span>
          </div>
          <p className="mt-1 text-slate-700">{note.text}</p>
        </div>
      ))}
    </div>
  );
}
