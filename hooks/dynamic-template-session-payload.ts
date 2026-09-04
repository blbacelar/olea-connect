import type {
  DynamicTemplateSession,
  TemplateSavePayload,
} from "@/lib/template-renderer/types";

export function toSavePayload(
  session: DynamicTemplateSession,
): TemplateSavePayload {
  return {
    brandingSnapshot: session.brandingSnapshot,
    completionPercent: session.completionPercent,
    formData: session.formData,
    id: session.id,
    organizationId: session.organizationId,
    resourceId: session.resourceId,
    schemaSnapshot: session.schemaSnapshot,
    schemaVersion: session.schemaVersion,
    status: session.status === "completed" ? "completed" : "draft",
    title: session.title,
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
