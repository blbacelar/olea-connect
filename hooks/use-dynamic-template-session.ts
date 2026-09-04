"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  calculateCompletionPercent,
  validateTemplateData,
} from "@/lib/template-renderer/validation";
import type {
  DynamicTemplateSession,
  TemplateSavePayload,
} from "@/lib/template-renderer/types";
import { createDynamicTemplateSessionEditors } from "@/hooks/dynamic-template-session-editors";
import {
  type SaveState,
  getInitialSessionKey,
  persistDynamicTemplateSession,
  syncInitialSession,
} from "@/hooks/dynamic-template-session-helpers";
import { mergeSavedSession } from "@/hooks/dynamic-template-session-payload";

export { mergeSavedSession };

export function useDynamicTemplateSession({
  enableCompletionFlow = true,
  initialSession,
  onSaved,
  preserveSameResourceRefresh = false,
  saveSession,
}: {
  enableCompletionFlow?: boolean;
  initialSession: DynamicTemplateSession;
  onSaved?: (
    saved: DynamicTemplateSession,
    previousSession: DynamicTemplateSession,
    hasNewerLocalEdits: boolean,
  ) => void;
  preserveSameResourceRefresh?: boolean;
  saveSession: (payload: TemplateSavePayload) => Promise<DynamicTemplateSession>;
}) {
  const [session, setSession] = useState(initialSession);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const [isCompleting, startCompleteTransition] = useTransition();
  const didMount = useRef(false);
  const editVersion = useRef(0);
  const hasUnsavedEditsRef = useRef(false);
  const isPersistingRef = useRef(false);
  const sessionRef = useRef(initialSession);
  const initialSessionKey = getInitialSessionKey(initialSession);
  const previousInitialSessionKey = useRef(initialSessionKey);

  const validationErrors = useMemo(
    () =>
      enableCompletionFlow
        ? validateTemplateData(session.schemaSnapshot, session.formData)
        : [],
    [enableCompletionFlow, session.formData, session.schemaSnapshot],
  );
  const completionPercent = useMemo(
    () =>
      enableCompletionFlow
        ? calculateCompletionPercent(session.schemaSnapshot, session.formData)
        : session.completionPercent,
    [
      enableCompletionFlow,
      session.completionPercent,
      session.formData,
      session.schemaSnapshot,
    ],
  );

  useEffect(() => {
    if (previousInitialSessionKey.current === initialSessionKey) return;
    previousInitialSessionKey.current = initialSessionKey;
    syncInitialSession({
      hasUnsavedEditsRef,
      initialSession,
      isPersistingRef,
      preserveSameResourceRefresh,
      saveState,
      sessionRef,
      setSaveError,
      setSaveState,
      setSession,
    });
  }, [
    initialSession,
    initialSessionKey,
    preserveSameResourceRefresh,
    saveState,
  ]);

  const { updateData, updateTitle, updateValue } =
    createDynamicTemplateSessionEditors({
      editVersion,
      enableCompletionFlow,
      hasUnsavedEditsRef,
      isPersistingRef,
      sessionRef,
      setSaveState,
      setSession,
    });

  const persist = async (status: "draft" | "completed" = "draft") => {
    const saved = await persistDynamicTemplateSession({
      editVersion,
      enableCompletionFlow,
      hasUnsavedEditsRef,
      isPersistingRef,
      onSaved,
      saveSession,
      sessionRef,
      setSaveError,
      setSaveState,
      setSession,
      status,
    });

    return saved;
  };

  const saveNow = enableCompletionFlow
    ? () => persist("draft")
    : undefined;

  const complete = enableCompletionFlow
    ? () => {
        if (validationErrors.length > 0) {
          setSaveError("Please fix the highlighted fields before completing.");
          return;
        }

        startCompleteTransition(async () => {
          await persist("completed");
        });
      }
    : undefined;

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (saveState !== "unsaved") return;

    const timer = window.setTimeout(() => {
      void persist("draft");
    }, 800);

    return () => window.clearTimeout(timer);
    // saveState intentionally drives the debounce; session is read at timeout setup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveState, session]);

  return {
    session,
    updateTitle,
    updateValue,
    updateData,
    saveState,
    saveError,
    validationErrors,
    completionPercent,
    isCompleting,
    saveNow,
    complete,
  };
}
