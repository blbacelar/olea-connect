"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileCheck2, LoaderCircle, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getBoardCalendarRsvpRoster } from "@/app/modules/board-calendar/board-rsvp-actions";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createMeetingDocument,
  getMeetingDocuments,
  hasApprovalContent,
  meetingDocumentKindsFor,
  meetingDocumentSchema,
  meetingDocumentTitles,
  upsertMeetingDocument,
  type MeetingDocument,
  type MeetingDocumentKind,
} from "@/lib/template-renderer/board-calendar-meeting-documents";
import type { BoardPackageMeeting } from "@/lib/template-renderer/board-calendar-packages";
import type { TemplateFormData, WorkspaceMemberOption } from "@/lib/template-renderer/types";

import { MeetingDocumentFields } from "./MeetingDocumentFields";
import { downloadMeetingDocumentPdf, fetchMeetingDocumentPdf } from "./meeting-pdf-client";

type DataChangeHandler = (updater: (data: TemplateFormData) => TemplateFormData) => void;

export function MeetingDocumentsDialog({
  canApprove,
  data,
  meeting,
  members,
  onClose,
  onDataChange,
  saveState,
  templateInstanceId,
}: {
  canApprove: boolean;
  data: TemplateFormData;
  meeting: BoardPackageMeeting;
  members: WorkspaceMemberOption[];
  onClose: () => void;
  onDataChange: DataChangeHandler;
  saveState: "saved" | "saving" | "unsaved" | "error";
  templateInstanceId?: string;
}) {
  const availableKinds = meetingDocumentKindsFor(meeting.type);
  const [kind, setKind] = useState<MeetingDocumentKind>(availableKinds[0]);
  const [rsvpRoster, setRsvpRoster] = useState<Array<{ userId: string; response: string }>>([]);
  const [draft, setDraft] = useState<MeetingDocument>(() => loadDocument(availableKinds[0]));
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(Boolean(canApprove && templateInstanceId));
  const attendanceEdited = useRef(false);

  useEffect(() => {
    if (!canApprove || !templateInstanceId) return;
    let cancelled = false;
    void getBoardCalendarRsvpRoster(templateInstanceId, meeting.id).then((rows) => {
      if (cancelled) return;
      setRsvpRoster(rows);
      if (!attendanceEdited.current) {
        setDraft((current) => current.status === "approved" ? current : seedAttendance(current, rows));
      }
    }).catch(() => { /* Attendance remains editable when the roster is unavailable. */ })
      .finally(() => { if (!cancelled) setRsvpLoading(false); });
    return () => { cancelled = true; };
  }, [canApprove, data, meeting.id, templateInstanceId]);

  function loadDocument(nextKind: MeetingDocumentKind) {
    const existing = getMeetingDocuments(data).find((document) =>
      document.meetingId === meeting.id && document.kind === nextKind,
    );
    return existing ?? seedAttendance(createMeetingDocument(meeting.id, nextKind, members.map((member) => member.id)), rsvpRoster);
  }

  function selectKind(nextKind: MeetingDocumentKind) {
    if (dirty) {
      setError("Save or discard your changes before switching documents.");
      return;
    }
    setKind(nextKind);
    setDraft(loadDocument(nextKind));
    setError("");
    setDirty(false);
  }

  function requestClose() {
    if (dirty) {
      setError("Save or discard your changes before closing this document.");
      return;
    }
    onClose();
  }

  function discardChanges() {
    setDraft(loadDocument(kind));
    setDirty(false);
    setError("");
  }

  function persist(status: MeetingDocument["status"]) {
    const next = { ...draft, status, updatedAt: new Date().toISOString() };
    if (status === "approved" && !hasApprovalContent(next)) {
      setError("Add consent or regular agenda items, or minutes content, before approval.");
      return;
    }
    const parsed = meetingDocumentSchema.safeParse(next);
    if (!parsed.success) {
      setError("Check required motion and action descriptions, dates, and vote counts.");
      return;
    }
    onDataChange((current) => upsertMeetingDocument(current, parsed.data));
    setDraft(parsed.data);
    setError("");
    setDirty(false);
  }

  async function exportPdf() {
    if (!templateInstanceId) return;
    setIsExporting(true);
    setError("");
    try {
      const pdf = await fetchMeetingDocumentPdf({ acknowledged, kind, meetingId: meeting.id, templateInstanceId });
      downloadMeetingDocumentPdf(pdf.bytes, pdf.fileName);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to export this document.");
    } finally {
      setIsExporting(false);
    }
  }

  const readOnly = !canApprove;

  return (
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Meeting documents: {meeting.title}</DialogTitle>
          <DialogDescription>
            {[meeting.date, meeting.time].filter(Boolean).join(" at ") || "Date not set"}. Draft and approve the documents attached to this meeting.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={kind} onValueChange={(value) => selectKind(value as MeetingDocumentKind)}>
          <TabsList className="grid w-full grid-cols-2">
            {availableKinds.map((value) => <TabsTrigger key={value} value={value}>{meetingDocumentTitles[value]}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline">{draft.status === "approved" ? "Approved" : "Draft"}</Badge>
          {draft.status === "approved" ? <span className="text-slate-500">Included in this meeting&apos;s board package.</span> : null}
        </div>
        {readOnly ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Only an organization owner or administrator can change meeting documents.</p> : null}
        <fieldset disabled={readOnly}>
          <MeetingDocumentFields document={draft} members={members} onChange={(next) => {
            if (next.attendance.some((row, index) => row.status !== draft.attendance[index]?.status)) {
              attendanceEdited.current = true;
            }
            setDraft(next);
            setDirty(true);
          }} />
        </fieldset>
        {error ? <p role="alert" className="text-sm font-medium text-red-700">{error}</p> : null}
        {rsvpLoading ? <p role="status" className="text-sm text-slate-600">Loading meeting RSVPs before saving attendance...</p> : null}
        {saveState === "error" ? <p role="alert" className="text-sm font-medium text-red-700">The calendar could not save this document. Keep this dialog open and try again.</p> : null}
        {draft.status === "approved" ? <div className="flex items-start gap-2 rounded-lg border p-3">
          <Checkbox id="meeting-document-ack" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
          <label htmlFor="meeting-document-ack" className="text-sm leading-5">I acknowledge that this board document is confidential before exporting it.</label>
        </div> : null}
        <DialogFooter className="sm:flex-wrap">
          <Button type="button" variant="outline" onClick={requestClose}>Close</Button>
          {dirty ? <Button type="button" variant="outline" onClick={discardChanges}>Discard changes</Button> : null}
          <Button type="button" variant="outline" disabled={dirty || saveState !== "saved" || !templateInstanceId || isExporting || (draft.status === "approved" && !acknowledged) || !getMeetingDocuments(data).some((item) => item.meetingId === meeting.id && item.kind === kind)} onClick={() => void exportPdf()}>
            {isExporting ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />} Export PDF
          </Button>
          {!readOnly ? <Button type="button" variant="outline" disabled={rsvpLoading || saveState === "saving" || saveState === "unsaved"} onClick={() => persist("draft")}>
            {saveState === "saving" || saveState === "unsaved" ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saveState === "saving" || saveState === "unsaved" ? "Saving..." : "Save draft"}
          </Button> : null}
          {canApprove && draft.status !== "approved" ? <Button type="button" disabled={rsvpLoading || saveState === "saving" || saveState === "unsaved"} onClick={() => persist("approved")}><FileCheck2 className="size-4" /> Approve for package</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function seedAttendance(document: MeetingDocument, roster: Array<{ userId: string; response: string }>): MeetingDocument {
  const byMember = new Map(roster.map((row) => [row.userId, row.response]));
  return { ...document, attendance: document.attendance.map((row) => ({
    ...row,
    status: row.status !== "not_recorded" ? row.status
      : byMember.get(row.memberId) === "attending" ? "present"
      : byMember.get(row.memberId) === "not_attending" ? "absent" : row.status,
  })) };
}
