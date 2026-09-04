import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import { setValue } from "@/lib/template-renderer/schema";
import { calculateCompletionPercent } from "@/lib/template-renderer/validation";
import type {
  DynamicTemplateSession,
  FieldPath,
  TemplateFormData,
  TemplateValue,
} from "@/lib/template-renderer/types";

import type { SaveState } from "./dynamic-template-session-helpers";

type SessionSetter = Dispatch<SetStateAction<DynamicTemplateSession>>;

export function createDynamicTemplateSessionEditors({
  editVersion,
  enableCompletionFlow,
  hasUnsavedEditsRef,
  isPersistingRef,
  sessionRef,
  setSaveState,
  setSession,
}: {
  editVersion: MutableRefObject<number>;
  enableCompletionFlow: boolean;
  hasUnsavedEditsRef: MutableRefObject<boolean>;
  isPersistingRef: MutableRefObject<boolean>;
  sessionRef: MutableRefObject<DynamicTemplateSession>;
  setSaveState: (state: SaveState) => void;
  setSession: SessionSetter;
}) {
  return {
    updateData: (updater: (currentData: TemplateFormData) => TemplateFormData) =>
      applySessionDataEdit({
        editVersion,
        enableCompletionFlow,
        formDataFactory: updater,
        hasUnsavedEditsRef,
        isPersistingRef,
        sessionRef,
        setSaveState,
        setSession,
      }),
    updateTitle: (title: string) =>
      applySessionPatch({
        editVersion,
        hasUnsavedEditsRef,
        isPersistingRef,
        patch: { title },
        sessionRef,
        setSaveState,
        setSession,
      }),
    updateValue: (path: FieldPath, value: TemplateValue) =>
      applySessionDataEdit({
        editVersion,
        enableCompletionFlow,
        formDataFactory: (currentData) => setValue(currentData, path, value),
        hasUnsavedEditsRef,
        isPersistingRef,
        sessionRef,
        setSaveState,
        setSession,
      }),
  };
}

function applySessionDataEdit({
  editVersion,
  enableCompletionFlow,
  formDataFactory,
  hasUnsavedEditsRef,
  isPersistingRef,
  sessionRef,
  setSaveState,
  setSession,
}: {
  editVersion: MutableRefObject<number>;
  enableCompletionFlow: boolean;
  formDataFactory: (currentData: TemplateFormData) => TemplateFormData;
  hasUnsavedEditsRef: MutableRefObject<boolean>;
  isPersistingRef: MutableRefObject<boolean>;
  sessionRef: MutableRefObject<DynamicTemplateSession>;
  setSaveState: (state: SaveState) => void;
  setSession: SessionSetter;
}) {
  const current = sessionRef.current;
  const formData = formDataFactory(current.formData);
  applySessionPatch({
    editVersion,
    hasUnsavedEditsRef,
    isPersistingRef,
    patch: {
      completionPercent: enableCompletionFlow
        ? calculateCompletionPercent(current.schemaSnapshot, formData)
        : current.completionPercent,
      formData,
    },
    sessionRef,
    setSaveState,
    setSession,
  });
}

function applySessionPatch({
  editVersion,
  hasUnsavedEditsRef,
  isPersistingRef,
  patch,
  sessionRef,
  setSaveState,
  setSession,
}: {
  editVersion: MutableRefObject<number>;
  hasUnsavedEditsRef: MutableRefObject<boolean>;
  isPersistingRef: MutableRefObject<boolean>;
  patch: Partial<DynamicTemplateSession>;
  sessionRef: MutableRefObject<DynamicTemplateSession>;
  setSaveState: (state: SaveState) => void;
  setSession: SessionSetter;
}) {
  editVersion.current += 1;
  hasUnsavedEditsRef.current = true;
  const nextSession = { ...sessionRef.current, ...patch };

  sessionRef.current = nextSession;
  setSession(nextSession);
  if (!isPersistingRef.current) setSaveState("unsaved");
}
