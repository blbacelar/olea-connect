"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { setValue } from "@/lib/template-renderer/schema";
import {
  calculateCompletionPercent,
  validateTemplateData,
} from "@/lib/template-renderer/validation";
import type {
  DynamicTemplateSession,
  FieldPath,
  TemplateFormData,
  TemplateSavePayload,
  TemplateValue,
} from "@/lib/template-renderer/types";

type SaveState = "saved" | "saving" | "unsaved" | "error";

export function useDynamicTemplateSession({
  enableCompletionFlow = true,
  initialSession,
  onSaved,
  saveSession,
}: {
  enableCompletionFlow?: boolean;
  initialSession: DynamicTemplateSession;
  onSaved?: (
    saved: DynamicTemplateSession,
    previousSession: DynamicTemplateSession,
    hasNewerLocalEdits: boolean,
  ) => void;
  saveSession: (payload: TemplateSavePayload) => Promise<DynamicTemplateSession>;
}) {
  const [session, setSession] = useState(initialSession);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const [isCompleting, startCompleteTransition] = useTransition();
  const didMount = useRef(false);
  const editVersion = useRef(0);
  const sessionRef = useRef(initialSession);
  const initialSessionKey = `${initialSession.id || "new"}:${initialSession.resourceId}:${initialSession.lastSavedAt}`;
  const previousInitialSessionKey = useRef(initialSessionKey);
  sessionRef.current = session;

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
    const currentSession = sessionRef.current;
    const isSameSavedSession =
      Boolean(currentSession.id) && currentSession.id === initialSession.id;
    const isSameDraftSession =
      !currentSession.id &&
      !initialSession.id &&
      currentSession.resourceId === initialSession.resourceId;

    if ((isSameSavedSession || isSameDraftSession) && saveState !== "saved") {
      return;
    }

    sessionRef.current = initialSession;
    setSession(initialSession);
    setSaveError("");
    setSaveState("saved");
  }, [initialSession, initialSessionKey, saveState]);

  const updateValue = (path: FieldPath, value: TemplateValue) => {
    editVersion.current += 1;
    setSession((current) => {
      const formData = setValue(current.formData, path, value);

      return {
        ...current,
        completionPercent: enableCompletionFlow
          ? calculateCompletionPercent(current.schemaSnapshot, formData)
          : current.completionPercent,
        formData,
      };
    });
    setSaveState("unsaved");
  };

  const updateData = (
    updater: (currentData: TemplateFormData) => TemplateFormData,
  ) => {
    editVersion.current += 1;
    setSession((current) => {
      const formData = updater(current.formData);
      return {
        ...current,
        completionPercent: enableCompletionFlow
          ? calculateCompletionPercent(current.schemaSnapshot, formData)
          : current.completionPercent,
        formData,
      };
    });
    setSaveState("unsaved");
  };

  const updateTitle = (title: string) => {
    editVersion.current += 1;
    setSession((current) => ({
      ...current,
      title,
    }));
    setSaveState("unsaved");
  };

  const persist = async (status: "draft" | "completed" = "draft") => {
    const sessionSnapshot = sessionRef.current;
    const savedEditVersion = editVersion.current;
    const payload = toSavePayload({
      ...sessionSnapshot,
      status: enableCompletionFlow ? status : "draft",
      completionPercent: enableCompletionFlow
        ? status === "completed"
          ? 100
          : calculateCompletionPercent(
              sessionSnapshot.schemaSnapshot,
              sessionSnapshot.formData,
            )
        : sessionSnapshot.completionPercent,
    });

    setSaveState("saving");
    try {
      const saved = await saveSession(payload);
      const hasNewerLocalEdits = editVersion.current !== savedEditVersion;

      setSession((current) =>
        mergeSavedSession(current, saved, hasNewerLocalEdits),
      );
      onSaved?.(saved, sessionSnapshot, hasNewerLocalEdits);
      setSaveError("");
      setSaveState(hasNewerLocalEdits ? "unsaved" : "saved");
      return saved;
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save this template.",
      );
      setSaveState("error");
      throw error;
    }
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

function toSavePayload(session: DynamicTemplateSession): TemplateSavePayload {
  return {
    id: session.id,
    resourceId: session.resourceId,
    organizationId: session.organizationId,
    title: session.title,
    schemaVersion: session.schemaVersion,
    schemaSnapshot: session.schemaSnapshot,
    brandingSnapshot: session.brandingSnapshot,
    formData: session.formData,
    completionPercent: session.completionPercent,
    status: session.status === "completed" ? "completed" : "draft",
  };
}

export function mergeSavedSession(
  current: DynamicTemplateSession,
  saved: DynamicTemplateSession,
  hasNewerLocalEdits: boolean,
): DynamicTemplateSession {
  if (hasNewerLocalEdits) {
    return {
      ...current,
      id: saved.id || current.id,
      lastSavedAt: saved.lastSavedAt,
      slug: current.slug,
    };
  }

  return { ...current, ...saved, slug: current.slug };
}
