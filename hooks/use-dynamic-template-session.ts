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
  const initialSessionKey = `${initialSession.id || "new"}:${initialSession.resourceId}:${initialSession.lastSavedAt}`;
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
    const currentSession = sessionRef.current;
    const isSameSavedSession =
      Boolean(currentSession.id) && currentSession.id === initialSession.id;
    const isSameDraftSession =
      !currentSession.id &&
      !initialSession.id &&
      currentSession.resourceId === initialSession.resourceId;
    const isNewlyPersistedActiveSession =
      !currentSession.id &&
      Boolean(initialSession.id) &&
      currentSession.resourceId === initialSession.resourceId;
    const isSameResourceRefresh =
      preserveSameResourceRefresh &&
      currentSession.resourceId === initialSession.resourceId &&
      currentSession.organizationId === initialSession.organizationId &&
      (currentSession.id === initialSession.id ||
        (!currentSession.id && Boolean(initialSession.id)));
    const isSameResource =
      currentSession.resourceId === initialSession.resourceId &&
      currentSession.organizationId === initialSession.organizationId;
    const requestedSessionId =
      typeof window === "undefined"
        ? null
        : new URL(window.location.href).searchParams.get("session");
    const isExplicitSessionSwitch =
      Boolean(initialSession.id) &&
      currentSession.id !== initialSession.id &&
      requestedSessionId === initialSession.id;
    const isExplicitNewSession =
      !initialSession.id &&
      Boolean(currentSession.id) &&
      requestedSessionId === "new";

    // Saving a new workbook can return server snapshots out of order. Any
    // snapshot for the active resource must preserve local state unless the
    // user explicitly navigated to a different saved workbook.
    if (
      isSameResource &&
      (isPersistingRef.current || hasUnsavedEditsRef.current) &&
      !isExplicitSessionSwitch &&
      !isExplicitNewSession
    ) {
      setSession((current) => {
        const nextSession = {
          ...current,
          id: current.id || initialSession.id,
          lastSavedAt: initialSession.lastSavedAt,
        };

        sessionRef.current = nextSession;
        return nextSession;
      });
      setSaveError("");
      return;
    }

    if (
      isSameSavedSession ||
      isSameDraftSession ||
      isNewlyPersistedActiveSession ||
      isSameResourceRefresh
    ) {
      // A route refresh can arrive while a newly created session still has local
      // edits that have not reached the server. Keep those edits, but accept the
      // persisted session ID so subsequent saves update the same workbook.
      if (hasUnsavedEditsRef.current) {
        setSession((current) => {
          const nextSession = {
            ...current,
            id: initialSession.id || current.id,
            lastSavedAt: initialSession.lastSavedAt,
          };

          sessionRef.current = nextSession;
          return nextSession;
        });
        return;
      }

      if (saveState !== "saved") return;

      setSession((current) => {
        const nextSession = {
          ...current,
          id: initialSession.id || current.id,
          lastSavedAt: initialSession.lastSavedAt,
        };

        sessionRef.current = nextSession;
        return nextSession;
      });
      setSaveError("");
      return;
    }

    sessionRef.current = initialSession;
    setSession(initialSession);
    setSaveError("");
    setSaveState("saved");
  }, [
    initialSession,
    initialSessionKey,
    preserveSameResourceRefresh,
    saveState,
  ]);

  const updateValue = (path: FieldPath, value: TemplateValue) => {
    editVersion.current += 1;
    hasUnsavedEditsRef.current = true;
    const current = sessionRef.current;
    const formData = setValue(current.formData, path, value);
    const nextSession = {
      ...current,
      completionPercent: enableCompletionFlow
        ? calculateCompletionPercent(current.schemaSnapshot, formData)
        : current.completionPercent,
      formData,
    };

    sessionRef.current = nextSession;
    setSession(nextSession);
    if (!isPersistingRef.current) setSaveState("unsaved");
  };

  const updateData = (
    updater: (currentData: TemplateFormData) => TemplateFormData,
  ) => {
    editVersion.current += 1;
    hasUnsavedEditsRef.current = true;
    const current = sessionRef.current;
    const formData = updater(current.formData);
    const nextSession = {
      ...current,
      completionPercent: enableCompletionFlow
        ? calculateCompletionPercent(current.schemaSnapshot, formData)
        : current.completionPercent,
      formData,
    };

    sessionRef.current = nextSession;
    setSession(nextSession);
    if (!isPersistingRef.current) setSaveState("unsaved");
  };

  const updateTitle = (title: string) => {
    editVersion.current += 1;
    hasUnsavedEditsRef.current = true;
    const nextSession = {
      ...sessionRef.current,
      title,
    };

    sessionRef.current = nextSession;
    setSession(nextSession);
    if (!isPersistingRef.current) setSaveState("unsaved");
  };

  const persist = async (status: "draft" | "completed" = "draft") => {
    if (isPersistingRef.current) return sessionRef.current;

    isPersistingRef.current = true;
    let saveFailed = false;
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

      setSession((current) => {
        const nextSession = mergeSavedSession(current, saved, hasNewerLocalEdits);

        sessionRef.current = nextSession;
        return nextSession;
      });
      onSaved?.(saved, sessionSnapshot, hasNewerLocalEdits);
      setSaveError("");
      hasUnsavedEditsRef.current = hasNewerLocalEdits;
      setSaveState(hasNewerLocalEdits ? "unsaved" : "saved");
      return saved;
    } catch (error) {
      saveFailed = true;
      hasUnsavedEditsRef.current = true;
      setSaveError(
        error instanceof Error ? error.message : "Unable to save this template.",
      );
      setSaveState("error");
      throw error;
    } finally {
      isPersistingRef.current = false;

      // An edit can occur after the save response is reconciled but before the
      // in-flight flag is released. Queue one more autosave for that edit.
      if (!saveFailed && hasUnsavedEditsRef.current) {
        setSaveState("unsaved");
      }
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

  return {
    ...current,
    ...saved,
    formData: current.formData,
    schemaSnapshot: current.schemaSnapshot,
    slug: current.slug,
  };
}
