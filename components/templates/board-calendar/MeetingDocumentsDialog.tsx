"use client";

import { useState } from "react";
import { Download, FileCheck2, LoaderCircle, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createMeetingDocument,
  getMeetingDocuments,
  hasApprovalContent,
  meetingDocumentSchema,
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
  const [kind, setKind] = useState<MeetingDocumentKind>("consent_agenda");
  const [draft, setDraft] = useState<MeetingDocument>(() => loadDocument("consent_agenda"));
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  function loadDocument(nextKind: MeetingDocumentKind) {
    return getMeetingDocuments(data).find((document) =>
      document.meetingId === meeting.id && document.kind === nextKind,
    ) ?? createMeetingDocument(meeting.id, nextKind, members.map((member) => member.id));
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
      const pdf = await fetchMeetingDocumentPdf({ kind, meetingId: meeting.id, templateInstanceId });
      downloadMeetingDocumentPdf(pdf.bytes, pdf.fileName);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to export this document.");
    } finally {
      setIsExporting(false);
    }
  }

  const readOnly = draft.status === "approved" && !canApprove;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Meeting documents: {meeting.title}</DialogTitle>
          <DialogDescription>
            {[meeting.date, meeting.time].filter(Boolean).join(" at ") || "Date not set"}. Draft and approve the documents attached to this meeting.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={kind} onValueChange={(value) => selectKind(value as MeetingDocumentKind)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="consent_agenda">Consent agenda</TabsTrigger>
            <TabsTrigger value="board_minutes">Board minutes</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline">{draft.status === "approved" ? "Approved" : "Draft"}</Badge>
          {draft.status === "approved" ? <span className="text-slate-500">Included in this meeting&apos;s board package.</span> : null}
        </div>
        {readOnly ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Only an organization owner or administrator can change an approved document.</p> : null}
        <fieldset disabled={readOnly}>
          <MeetingDocumentFields document={draft} members={members} onChange={(next) => { setDraft(next); setDirty(true); }} />
        </fieldset>
        {error ? <p role="alert" className="text-sm font-medium text-red-700">{error}</p> : null}
        {saveState === "error" ? <p role="alert" className="text-sm font-medium text-red-700">The calendar could not save this document. Keep this dialog open and try again.</p> : null}
        <DialogFooter className="sm:flex-wrap">
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          <Button type="button" variant="outline" disabled={dirty || saveState !== "saved" || !templateInstanceId || isExporting || !getMeetingDocuments(data).some((item) => item.meetingId === meeting.id && item.kind === kind)} onClick={() => void exportPdf()}>
            {isExporting ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />} Export PDF
          </Button>
          {!readOnly ? <Button type="button" variant="outline" disabled={saveState === "saving" || saveState === "unsaved"} onClick={() => persist("draft")}>
            {saveState === "saving" || saveState === "unsaved" ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saveState === "saving" || saveState === "unsaved" ? "Saving..." : "Save draft"}
          </Button> : null}
          {canApprove && draft.status !== "approved" ? <Button type="button" disabled={saveState === "saving" || saveState === "unsaved"} onClick={() => persist("approved")}><FileCheck2 className="size-4" /> Approve for package</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
