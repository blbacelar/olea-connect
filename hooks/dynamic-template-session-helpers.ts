import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import { calculateCompletionPercent } from "@/lib/template-renderer/validation";
import type {
  DynamicTemplateSession,
  TemplateSavePayload,
} from "@/lib/template-renderer/types";

import { mergeSavedSession, toSavePayload } from "./dynamic-template-session-payload";

export type SaveState = "saved" | "saving" | "unsaved" | "error";

type SessionSetter = Dispatch<SetStateAction<DynamicTemplateSession>>;

export function getInitialSessionKey(session: DynamicTemplateSession) {
  return `${session.id || "new"}:${session.resourceId}:${session.lastSavedAt}`;
}

export function syncInitialSession({
  hasUnsavedEditsRef,
  initialSession,
  isPersistingRef,
  preserveSameResourceRefresh,
  saveState,
  sessionRef,
  setSaveError,
  setSaveState,
  setSession,
}: {
  hasUnsavedEditsRef: MutableRefObject<boolean>;
  initialSession: DynamicTemplateSession;
  isPersistingRef: MutableRefObject<boolean>;
  preserveSameResourceRefresh: boolean;
  saveState: SaveState;
  sessionRef: MutableRefObject<DynamicTemplateSession>;
  setSaveError: (message: string) => void;
  setSaveState: (state: SaveState) => void;
  setSession: SessionSetter;
}) {
  const decision = getInitialSessionSyncDecision({
    currentSession: sessionRef.current,
    hasUnsavedEdits: hasUnsavedEditsRef.current,
    initialSession,
    isPersisting: isPersistingRef.current,
    preserveSameResourceRefresh,
    requestedSessionId: getRequestedSessionId(),
    saveState,
  });

  if (decision === "ignore") return;
  if (decision === "preserve_active_resource") {
    applyPersistedIdentity({ initialSession, sessionRef, setSession });
    setSaveError("");
    return;
  }
  if (decision === "merge_same_resource") {
    applyPersistedIdentity({ initialSession, sessionRef, setSession });
    if (!hasUnsavedEditsRef.current) setSaveError("");
    return;
  }

  sessionRef.current = initialSession;
  setSession(initialSession);
  setSaveError("");
  setSaveState("saved");
}

export async function persistDynamicTemplateSession({
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
}: {
  editVersion: MutableRefObject<number>;
  enableCompletionFlow: boolean;
  hasUnsavedEditsRef: MutableRefObject<boolean>;
  isPersistingRef: MutableRefObject<boolean>;
  onSaved?: (
    saved: DynamicTemplateSession,
    previousSession: DynamicTemplateSession,
    hasNewerLocalEdits: boolean,
  ) => void;
  saveSession: (payload: TemplateSavePayload) => Promise<DynamicTemplateSession>;
  sessionRef: MutableRefObject<DynamicTemplateSession>;
  setSaveError: (message: string) => void;
  setSaveState: (state: SaveState) => void;
  setSession: SessionSetter;
  status: "draft" | "completed";
}) {
  if (isPersistingRef.current) return sessionRef.current;

  isPersistingRef.current = true;
  let saveFailed = false;
  const sessionSnapshot = sessionRef.current;
  const savedEditVersion = editVersion.current;
  const payload = toSavePayload(
    getSessionSnapshotForStatus(sessionSnapshot, status, enableCompletionFlow),
  );

  setSaveState("saving");
  try {
    const saved = await saveSession(payload);
    const hasNewerLocalEdits = editVersion.current !== savedEditVersion;
    reconcileSavedSession({
      currentSnapshot: sessionSnapshot,
      hasNewerLocalEdits,
      onSaved,
      saved,
      sessionRef,
      setSaveError,
      setSaveState,
      setSession,
    });
    hasUnsavedEditsRef.current = hasNewerLocalEdits;
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
    if (!saveFailed && hasUnsavedEditsRef.current) setSaveState("unsaved");
  }
}

function getInitialSessionSyncDecision({
  currentSession,
  hasUnsavedEdits,
  initialSession,
  isPersisting,
  preserveSameResourceRefresh,
  requestedSessionId,
  saveState,
}: {
  currentSession: DynamicTemplateSession;
  hasUnsavedEdits: boolean;
  initialSession: DynamicTemplateSession;
  isPersisting: boolean;
  preserveSameResourceRefresh: boolean;
  requestedSessionId: string | null;
  saveState: SaveState;
}) {
  const sameResource = isSameResource(currentSession, initialSession);
  const explicitSwitch = isExplicitSessionSwitch(
    currentSession,
    initialSession,
    requestedSessionId,
  );
  const explicitNew = isExplicitNewSession(
    currentSession,
    initialSession,
    requestedSessionId,
  );

  if (sameResource && (isPersisting || hasUnsavedEdits) && !explicitSwitch && !explicitNew) {
    return "preserve_active_resource";
  }
  if (isCompatibleRefresh(currentSession, initialSession, preserveSameResourceRefresh)) {
    return hasUnsavedEdits || saveState === "saved" ? "merge_same_resource" : "ignore";
  }

  return "replace";
}

function applyPersistedIdentity({
  initialSession,
  sessionRef,
  setSession,
}: {
  initialSession: DynamicTemplateSession;
  sessionRef: MutableRefObject<DynamicTemplateSession>;
  setSession: SessionSetter;
}) {
  setSession((current) => {
    const nextSession = {
      ...current,
      id: initialSession.id || current.id,
      lastSavedAt: initialSession.lastSavedAt,
    };

    sessionRef.current = nextSession;
    return nextSession;
  });
}

function reconcileSavedSession({
  currentSnapshot,
  hasNewerLocalEdits,
  onSaved,
  saved,
  sessionRef,
  setSaveError,
  setSaveState,
  setSession,
}: {
  currentSnapshot: DynamicTemplateSession;
  hasNewerLocalEdits: boolean;
  onSaved?: (
    saved: DynamicTemplateSession,
    previousSession: DynamicTemplateSession,
    hasNewerLocalEdits: boolean,
  ) => void;
  saved: DynamicTemplateSession;
  sessionRef: MutableRefObject<DynamicTemplateSession>;
  setSaveError: (message: string) => void;
  setSaveState: (state: SaveState) => void;
  setSession: SessionSetter;
}) {
  setSession((current) => {
    const nextSession = mergeSavedSession(current, saved, hasNewerLocalEdits);
    sessionRef.current = nextSession;
    return nextSession;
  });
  onSaved?.(saved, currentSnapshot, hasNewerLocalEdits);
  setSaveError("");
  setSaveState(hasNewerLocalEdits ? "unsaved" : "saved");
}

function getSessionSnapshotForStatus(
  session: DynamicTemplateSession,
  status: "draft" | "completed",
  enableCompletionFlow: boolean,
) {
  if (!enableCompletionFlow) {
    return { ...session, status: "draft" as const };
  }

  return {
    ...session,
    completionPercent:
      status === "completed"
        ? 100
        : calculateCompletionPercent(session.schemaSnapshot, session.formData),
    status,
  };
}

function getRequestedSessionId() {
  if (typeof window === "undefined") return null;
  return new URL(window.location.href).searchParams.get("session");
}

function isCompatibleRefresh(
  currentSession: DynamicTemplateSession,
  initialSession: DynamicTemplateSession,
  preserveSameResourceRefresh: boolean,
) {
  return (
    isSameSavedSession(currentSession, initialSession) ||
    isSameDraftSession(currentSession, initialSession) ||
    isNewlyPersistedActiveSession(currentSession, initialSession) ||
    (preserveSameResourceRefresh && isSameResourceRefresh(currentSession, initialSession))
  );
}

function isSameResource(
  currentSession: DynamicTemplateSession,
  initialSession: DynamicTemplateSession,
) {
  return (
    currentSession.resourceId === initialSession.resourceId &&
    currentSession.organizationId === initialSession.organizationId
  );
}

function isSameSavedSession(
  currentSession: DynamicTemplateSession,
  initialSession: DynamicTemplateSession,
) {
  return Boolean(currentSession.id) && currentSession.id === initialSession.id;
}

function isSameDraftSession(
  currentSession: DynamicTemplateSession,
  initialSession: DynamicTemplateSession,
) {
  return (
    !currentSession.id &&
    !initialSession.id &&
    currentSession.resourceId === initialSession.resourceId
  );
}

function isNewlyPersistedActiveSession(
  currentSession: DynamicTemplateSession,
  initialSession: DynamicTemplateSession,
) {
  return (
    !currentSession.id &&
    Boolean(initialSession.id) &&
    currentSession.resourceId === initialSession.resourceId
  );
}

function isSameResourceRefresh(
  currentSession: DynamicTemplateSession,
  initialSession: DynamicTemplateSession,
) {
  return (
    isSameResource(currentSession, initialSession) &&
    (currentSession.id === initialSession.id ||
      (!currentSession.id && Boolean(initialSession.id)))
  );
}

function isExplicitSessionSwitch(
  currentSession: DynamicTemplateSession,
  initialSession: DynamicTemplateSession,
  requestedSessionId: string | null,
) {
  return (
    Boolean(initialSession.id) &&
    currentSession.id !== initialSession.id &&
    requestedSessionId === initialSession.id
  );
}

function isExplicitNewSession(
  currentSession: DynamicTemplateSession,
  initialSession: DynamicTemplateSession,
  requestedSessionId: string | null,
) {
  return !initialSession.id && Boolean(currentSession.id) && requestedSessionId === "new";
}
