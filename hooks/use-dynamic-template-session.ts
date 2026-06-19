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
  initialSession,
  saveSession,
}: {
  initialSession: DynamicTemplateSession;
  saveSession: (payload: TemplateSavePayload) => Promise<DynamicTemplateSession>;
}) {
  const [session, setSession] = useState(initialSession);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const [isCompleting, startCompleteTransition] = useTransition();
  const didMount = useRef(false);

  const validationErrors = useMemo(
    () => validateTemplateData(session.schemaSnapshot, session.formData),
    [session.formData, session.schemaSnapshot],
  );
  const completionPercent = useMemo(
    () => calculateCompletionPercent(session.schemaSnapshot, session.formData),
    [session.formData, session.schemaSnapshot],
  );

  const updateValue = (path: FieldPath, value: TemplateValue) => {
    setSession((current) => {
      const formData = setValue(current.formData, path, value);

      return {
        ...current,
        completionPercent: calculateCompletionPercent(
          current.schemaSnapshot,
          formData,
        ),
        formData,
      };
    });
    setSaveState("unsaved");
  };

  const persist = async (status: "draft" | "completed" = "draft") => {
    const payload = toSavePayload({
      ...session,
      status,
      completionPercent:
        status === "completed"
          ? 100
          : calculateCompletionPercent(session.schemaSnapshot, session.formData),
    });

    setSaveState("saving");
    try {
      const saved = await saveSession(payload);
      setSession((current) => ({ ...current, ...saved, slug: current.slug }));
      setSaveError("");
      setSaveState("saved");
      return saved;
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save this template.",
      );
      setSaveState("error");
      throw error;
    }
  };

  const complete = () => {
    if (validationErrors.length > 0) {
      setSaveError("Please fix the highlighted fields before completing.");
      return;
    }

    startCompleteTransition(async () => {
      await persist("completed");
    });
  };

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
    updateValue,
    saveState,
    saveError,
    validationErrors,
    completionPercent,
    isCompleting,
    saveNow: () => persist("draft"),
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
