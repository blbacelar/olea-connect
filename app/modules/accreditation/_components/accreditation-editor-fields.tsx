"use client";

import { Paperclip } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AccreditationActionResult } from "@/app/modules/accreditation/actions";
import type {
  AccreditationDocumentMode,
  AccreditationTemplateDefinition,
  AccreditationTemplateResponse,
} from "@/lib/accreditation/types";

import {
  Field,
  InfoPanel,
  fieldError,
} from "./accreditation-workspace-utils";

export function TemplatePicker({
  onSelectTemplate,
  template,
  templates,
}: {
  onSelectTemplate: (templateCode: string) => void;
  template: AccreditationTemplateDefinition;
  templates: AccreditationTemplateDefinition[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="templatePicker">Template</Label>
        <Select value={template.code} onValueChange={onSelectTemplate}>
          <SelectTrigger id="templatePicker" className="mt-2 h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {templates.map((item) => (
              <SelectItem key={item.code} value={item.code}>
                {item.code} · {item.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm leading-6 text-slate-500">
        <span className="font-medium text-slate-700">Requirement</span>:{" "}
        {template.icRequirement}
      </p>
    </div>
  );
}

export function StatusFields({
  draft,
  template,
  updateDraft,
}: {
  draft: AccreditationTemplateResponse;
  template: AccreditationTemplateDefinition;
  updateDraft: (next: Partial<AccreditationTemplateResponse>) => void;
}) {
  const approvalStatus = template.boardApprovalRequired
    ? draft.approvalStatus
    : "not_required";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DocumentStatusField draft={draft} updateDraft={updateDraft} />
      <BoardApprovalField
        approvalStatus={approvalStatus}
        template={template}
        updateDraft={updateDraft}
      />
    </div>
  );
}

export function ModeSpecificFields({
  draft,
  state,
  template,
  updateDraft,
}: {
  draft: AccreditationTemplateResponse;
  state: AccreditationActionResult;
  template: AccreditationTemplateDefinition;
  updateDraft: (next: Partial<AccreditationTemplateResponse>) => void;
}) {
  if (draft.documentMode === "have") {
    return (
      <EvidenceFields draft={draft} state={state} updateDraft={updateDraft} />
    );
  }
  if (draft.documentMode === "create") {
    return (
      <DraftField
        draft={draft}
        state={state}
        template={template}
        updateDraft={updateDraft}
      />
    );
  }
  return null;
}

export function NotesField({
  draft,
  state,
  updateDraft,
}: {
  draft: AccreditationTemplateResponse;
  state: AccreditationActionResult;
  updateDraft: (next: Partial<AccreditationTemplateResponse>) => void;
}) {
  return (
    <Field error={fieldError(state, "notes")} label="Internal notes">
      <Textarea
        aria-label="Internal notes"
        name="notes"
        onChange={(event) => updateDraft({ notes: event.target.value })}
        placeholder="Gaps, owner follow-up, approval context, or IC submission notes."
        value={draft.notes}
      />
    </Field>
  );
}

export function SaveError({ state }: { state: AccreditationActionResult }) {
  if (state.ok) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
      {state.error}
    </div>
  );
}

export function EditorAside({
  template,
}: {
  template: AccreditationTemplateDefinition;
}) {
  return (
    <aside className="space-y-4">
      <InfoPanel title="Who completes this" items={[template.whoCompletes]} />
      <InfoPanel title="Submission checklist" items={template.checklist} />
      <InfoPanel title="Common mistakes" items={template.commonMistakes} warning />
      <InfoPanel title="Expected structure" items={template.structure} />
    </aside>
  );
}

function DocumentStatusField({
  draft,
  updateDraft,
}: {
  draft: AccreditationTemplateResponse;
  updateDraft: (next: Partial<AccreditationTemplateResponse>) => void;
}) {
  return (
    <div>
      <Label>Document status</Label>
      <Select
        value={draft.documentMode}
        onValueChange={(value) =>
          updateDraft({ documentMode: value as AccreditationDocumentMode })
        }
      >
        <SelectTrigger
          aria-label="Document status"
          className="mt-2 h-11"
          data-testid="accreditation-document-status"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="not_started">Not started</SelectItem>
          <SelectItem value="have">We already have it</SelectItem>
          <SelectItem value="create">Create document here</SelectItem>
        </SelectContent>
      </Select>
      <input name="documentMode" type="hidden" value={draft.documentMode} />
    </div>
  );
}

function BoardApprovalField({
  approvalStatus,
  template,
  updateDraft,
}: {
  approvalStatus: string;
  template: AccreditationTemplateDefinition;
  updateDraft: (next: Partial<AccreditationTemplateResponse>) => void;
}) {
  return (
    <div>
      <Label>Board approval</Label>
      <Select
        disabled={!template.boardApprovalRequired}
        value={approvalStatus}
        onValueChange={(value) =>
          updateDraft({
            approvalStatus: value as AccreditationTemplateResponse["approvalStatus"],
          })
        }
      >
        <SelectTrigger
          aria-label="Board approval"
          className="mt-2 h-11"
          data-testid="accreditation-board-approval"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="not_required">Not required</SelectItem>
          <SelectItem value="needs_board_approval">
            Needs board approval
          </SelectItem>
          <SelectItem value="ready_for_board">Ready for board</SelectItem>
          <SelectItem value="board_approved">Board approved</SelectItem>
        </SelectContent>
      </Select>
      <input name="approvalStatus" type="hidden" value={approvalStatus} />
    </div>
  );
}

function EvidenceFields({
  draft,
  state,
  updateDraft,
}: {
  draft: AccreditationTemplateResponse;
  state: AccreditationActionResult;
  updateDraft: (next: Partial<AccreditationTemplateResponse>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field error={fieldError(state, "evidenceName")} label="Document name">
          <Input
            aria-label="Document name"
            name="evidenceName"
            onChange={(event) => updateDraft({ evidenceName: event.target.value })}
            placeholder="Board-approved conflict policy.pdf"
            value={draft.evidenceName}
          />
        </Field>
        <EvidenceLocationField
          state={state}
          updateDraft={updateDraft}
          value={draft.evidenceLocation}
        />
      </div>
      <EvidenceFileField state={state} />
      {draft.evidenceFile ? (
        <div className="flex items-center gap-2 rounded-lg border bg-olea-light/40 px-3 py-2 text-sm font-semibold text-slate-700">
          <Paperclip className="size-4 text-olea-green" />
          Uploaded evidence: {draft.evidenceFile.name}
        </div>
      ) : null}
    </div>
  );
}

function EvidenceLocationField({
  state,
  updateDraft,
  value,
}: {
  state: AccreditationActionResult;
  updateDraft: (next: Partial<AccreditationTemplateResponse>) => void;
  value: string;
}) {
  return (
    <Field error={fieldError(state, "evidenceLocation")} label="Document location">
      <Input
        aria-label="Document location"
        name="evidenceLocation"
        onChange={(event) => updateDraft({ evidenceLocation: event.target.value })}
        placeholder="Google Drive folder, SharePoint, board book..."
        value={value}
      />
    </Field>
  );
}

function EvidenceFileField({ state }: { state: AccreditationActionResult }) {
  return (
    <Field error={fieldError(state, "evidenceFile")} label="Upload evidence file">
      <Input
        accept=".doc,.docx,.jpeg,.jpg,.pdf,.png,.txt,.xls,.xlsx,image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
        aria-label="Upload evidence file"
        data-testid="accreditation-evidence-file"
        name="evidenceFile"
        type="file"
      />
      <p className="mt-2 text-sm text-slate-500">
        Optional when the official document already lives in Drive, SharePoint,
        or a board package. HTML and code files are blocked.
      </p>
    </Field>
  );
}

function DraftField({
  draft,
  state,
  template,
  updateDraft,
}: {
  draft: AccreditationTemplateResponse;
  state: AccreditationActionResult;
  template: AccreditationTemplateDefinition;
  updateDraft: (next: Partial<AccreditationTemplateResponse>) => void;
}) {
  return (
    <Field error={fieldError(state, "textDraft")} label="Working draft">
      <Textarea
        aria-label="Working draft"
        className="min-h-[320px] font-mono text-sm"
        name="textDraft"
        onChange={(event) => updateDraft({ textDraft: event.target.value })}
        placeholder={template.defaultDraft}
        value={draft.textDraft}
      />
    </Field>
  );
}
