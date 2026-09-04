"use client";

import { Save } from "lucide-react";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  saveAccreditationTemplateAction,
  type AccreditationActionResult,
} from "@/app/modules/accreditation/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  emptyResponse,
  mergeResponse,
} from "@/lib/accreditation/domain";
import type {
  AccreditationTemplateDefinition,
  AccreditationTemplateResponse,
} from "@/lib/accreditation/types";

import {
  EditorAside,
  ModeSpecificFields,
  NotesField,
  SaveError,
  StatusFields,
  TemplatePicker,
} from "./accreditation-editor-fields";

export function EditorTab({
  onSelectTemplate,
  response,
  setResponses,
  template,
  templates,
}: {
  onSelectTemplate: (templateCode: string) => void;
  response: AccreditationTemplateResponse;
  setResponses: Dispatch<SetStateAction<AccreditationTemplateResponse[]>>;
  template: AccreditationTemplateDefinition;
  templates: AccreditationTemplateDefinition[];
}) {
  const [draft, setDraft] = useState(response);
  const draftRef = useRef(response);
  const [state, setState] = useState<AccreditationActionResult>({ ok: true });
  const [pending, startTransition] = useTransition();

  function updateDraft(next: Partial<AccreditationTemplateResponse>) {
    const updated = { ...draftRef.current, ...next };
    draftRef.current = updated;
    setDraft(updated);
  }

  useEffect(() => {
    draftRef.current = response;
    setDraft(response);
    setState({ ok: true });
  }, [response]);

  function submit(formData: FormData) {
    const currentDraft = draftRef.current;
    setState({ ok: true });
    prepareTemplateFormData({ currentDraft, formData, template });
    startTransition(async () => {
      const result = await saveAccreditationTemplateAction(formData);
      const savedResponse = handleTemplateSaveResult({
        currentDraft,
        result,
        setDraft,
        setResponses,
        setState,
        template,
      });
      if (savedResponse) draftRef.current = savedResponse;
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardContent className="p-5">
          <TemplatePicker
            onSelectTemplate={onSelectTemplate}
            template={template}
            templates={templates}
          />
          <form action={submit} className="mt-6 space-y-5">
            <input name="templateId" type="hidden" value={template.code} />
            <StatusFields
              draft={draft}
              template={template}
              updateDraft={updateDraft}
            />
            <ModeSpecificFields
              draft={draft}
              state={state}
              template={template}
              updateDraft={updateDraft}
            />
            <NotesField draft={draft} state={state} updateDraft={updateDraft} />
            <SaveError state={state} />
            <Button disabled={pending} type="submit">
              <Save className="size-4" />
              {pending ? "Saving..." : "Save template status"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <EditorAside template={template} />
    </div>
  );
}

function prepareTemplateFormData({
  currentDraft,
  formData,
  template,
}: {
  currentDraft: AccreditationTemplateResponse;
  formData: FormData;
  template: AccreditationTemplateDefinition;
}) {
  formData.set("templateId", template.code);
  formData.set("documentMode", currentDraft.documentMode);
  formData.set("approvalStatus", getApprovalStatus(currentDraft, template));
  formData.set("evidenceName", currentDraft.evidenceName);
  formData.set("evidenceLocation", currentDraft.evidenceLocation);
  formData.set("textDraft", currentDraft.textDraft);
  formData.set("notes", currentDraft.notes);
}

function handleTemplateSaveResult({
  currentDraft,
  result,
  setDraft,
  setResponses,
  setState,
  template,
}: {
  currentDraft: AccreditationTemplateResponse;
  result: AccreditationActionResult;
  setDraft: Dispatch<SetStateAction<AccreditationTemplateResponse>>;
  setResponses: Dispatch<SetStateAction<AccreditationTemplateResponse[]>>;
  setState: Dispatch<SetStateAction<AccreditationActionResult>>;
  template: AccreditationTemplateDefinition;
}) {
  setState(result);
  if (!result.ok) return null;

  const savedResponse = result.response ?? getFallbackSavedResponse(currentDraft, template);
  setDraft(savedResponse);
  setResponses((current) => mergeResponse(current, savedResponse));
  return savedResponse;
}

function getFallbackSavedResponse(
  currentDraft: AccreditationTemplateResponse,
  template: AccreditationTemplateDefinition,
) {
  return (
    mergeResponse([], {
      approvalStatus: getApprovalStatus(currentDraft, template),
      documentMode: currentDraft.documentMode,
      evidenceFile: currentDraft.evidenceFile,
      evidenceLocation: currentDraft.evidenceLocation,
      evidenceName: currentDraft.evidenceName,
      notes: currentDraft.notes,
      templateId: template.code,
      textDraft: currentDraft.textDraft,
    })[0] ?? emptyResponse(template.code)
  );
}

function getApprovalStatus(
  currentDraft: AccreditationTemplateResponse,
  template: AccreditationTemplateDefinition,
) {
  return template.boardApprovalRequired
    ? currentDraft.approvalStatus
    : "not_required";
}
