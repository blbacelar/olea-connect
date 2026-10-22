import { z } from "zod";

import {
  accreditationSections,
  accreditationTemplates,
  getAccreditationTemplate,
} from "@/lib/accreditation/catalog";
import type {
  AccreditationApprovalStatus,
  AccreditationDocumentMode,
  AccreditationEvidenceFile,
  AccreditationSettings,
  AccreditationTemplateResponse,
  AccreditationWorkspaceData,
} from "@/lib/accreditation/types";

export const accreditationDocumentModes = [
  "not_started",
  "have",
  "create",
] as const satisfies readonly AccreditationDocumentMode[];

export const accreditationApprovalStatuses = [
  "not_required",
  "needs_board_approval",
  "ready_for_board",
  "board_approved",
] as const satisfies readonly AccreditationApprovalStatus[];

export const defaultAccreditationSettings: AccreditationSettings = {
  charityNumber: "",
  leadEmail: "",
  leadName: "",
  organizationName: "",
  targetDate: "",
  teamRoles: [],
};

export const accreditationSettingsSchema = z.object({
  charityNumber: z
    .string()
    .trim()
    .max(30, "Charity number must be 30 characters or fewer.")
    .refine(
      (value) => value === "" || /^[0-9]{9}R[CRT][0-9]{4}$/i.test(value),
      "Use CRA format, for example 123456789RR0001.",
    ),
  leadEmail: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .or(z.literal("")),
  leadName: z.string().trim().max(120, "Lead name is too long."),
  organizationName: z
    .string()
    .trim()
    .min(2, "Enter an organization name with at least 2 characters.")
    .max(140, "Organization name is too long."),
  targetDate: z
    .string()
    .trim()
    .refine((value) => value === "" || isStrictCalendarDate(value), {
      message: "Use a valid target date.",
    }),
  teamRoles: z.array(z.string().trim().min(1)).max(12),
});

const evidenceFileSchema = z.object({
  name: z.string().trim().min(1).max(180),
  path: z.string().trim().min(1).max(500),
  size: z.number().int().positive().max(15 * 1024 * 1024),
  type: z.string().trim().min(1).max(120),
  uploadedAt: z.string().trim().datetime(),
}) satisfies z.ZodType<AccreditationEvidenceFile>;

export const accreditationResponseSchema = z
  .object({
    approvalStatus: z.enum(accreditationApprovalStatuses),
    documentMode: z.enum(accreditationDocumentModes),
    evidenceFile: evidenceFileSchema.nullable().default(null),
    evidenceLocation: z.string().trim().max(240, "Source is too long."),
    evidenceName: z.string().trim().max(180, "Document name is too long."),
    notes: z.string().trim().max(1200, "Notes must be 1,200 characters or fewer."),
    templateId: z.string().trim().min(1),
    textDraft: z.string().trim().max(12000, "Draft text is too long."),
  })
  .superRefine((value, context) => {
    if (value.documentMode === "have") {
      if (!value.evidenceName.trim()) {
        context.addIssue({
          code: "custom",
          message: "Document name is required when you already have or upload this document.",
          path: ["evidenceName"],
        });
      }
      if (!value.evidenceLocation.trim() && !value.evidenceFile) {
        context.addIssue({
          code: "custom",
          message: "Add a document location or upload the evidence file.",
          path: ["evidenceLocation"],
        });
      }
    }

    if (value.documentMode === "create" && value.textDraft.trim().length < 10) {
      context.addIssue({
        code: "custom",
        message: "Add at least 10 characters to the working draft.",
        path: ["textDraft"],
      });
    }
  });

export function emptyResponse(templateId: string): AccreditationTemplateResponse {
  return {
    approvalStatus: "not_required",
    documentMode: "not_started",
    evidenceFile: null,
    evidenceLocation: "",
    evidenceName: "",
    notes: "",
    templateId,
    textDraft: "",
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeSettings(value: unknown, fallbackName: string) {
  const record = isRecord(value) ? value : {};
  const parsed = accreditationSettingsSchema.safeParse({
    ...defaultAccreditationSettings,
    ...record,
    organizationName:
      typeof record.organizationName === "string" && record.organizationName.trim()
        ? record.organizationName
        : fallbackName,
    teamRoles: Array.isArray(record.teamRoles)
      ? record.teamRoles.filter((role): role is string => typeof role === "string")
      : [],
  });

  return parsed.success
    ? parsed.data
    : { ...defaultAccreditationSettings, organizationName: fallbackName };
}

export function normalizeResponses(value: unknown) {
  const rows = Array.isArray(value) ? value : [];
  const byTemplate = new Map<string, AccreditationTemplateResponse>();

  for (const row of rows) {
    const parsed = accreditationResponseSchema.safeParse(row);
    if (parsed.success) {
      byTemplate.set(parsed.data.templateId, {
        ...parsed.data,
        updatedAt:
          isRecord(row) && typeof row.updatedAt === "string"
            ? row.updatedAt
            : new Date().toISOString(),
      });
    }
  }

  return accreditationTemplates.map((template) => {
    const response = byTemplate.get(template.code) ?? emptyResponse(template.code);
    if (!template.boardApprovalRequired) {
      return { ...response, approvalStatus: "not_required" as const };
    }
    if (response.approvalStatus === "not_required") {
      return { ...response, approvalStatus: "needs_board_approval" as const };
    }
    return response;
  });
}

export function mergeResponse(
  current: AccreditationTemplateResponse[],
  next: Omit<AccreditationTemplateResponse, "updatedAt">,
) {
  const now = new Date().toISOString();
  const found = current.some((response) => response.templateId === next.templateId);
  const updated = current.map((response) =>
    response.templateId === next.templateId
      ? { ...response, ...next, updatedAt: now }
      : response,
  );
  return found ? updated : [...updated, { ...next, updatedAt: now }];
}

export function isResponseComplete(response: AccreditationTemplateResponse) {
  const template = getAccreditationTemplate(response.templateId);
  const hasDocument =
    response.documentMode === "have"
      ? Boolean(
          response.evidenceName.trim() &&
            (response.evidenceLocation.trim() || response.evidenceFile),
        )
      : response.documentMode === "create"
        ? response.textDraft.trim().length >= 10
        : false;

  if (!hasDocument) return false;
  if (template?.boardApprovalRequired) {
    return response.approvalStatus === "board_approved";
  }
  return true;
}

export function buildWorkspaceData(args: {
  configured: boolean;
  instanceId: string;
  lastUpdatedAt: string;
  resourceId: string;
  responses: AccreditationTemplateResponse[];
  settings: AccreditationSettings;
}): AccreditationWorkspaceData {
  const sections = accreditationSections.map((section) => {
    const sectionTemplates = accreditationTemplates.filter(
      (template) => template.sectionId === section.id,
    );
    const sectionResponses = args.responses.filter((response) =>
      sectionTemplates.some((template) => template.code === response.templateId),
    );
    return {
      ...section,
      approved: sectionResponses.filter(
        (response) => response.approvalStatus === "board_approved",
      ).length,
      completed: sectionResponses.filter(isResponseComplete).length,
      readyForBoard: sectionResponses.filter(
        (response) => response.approvalStatus === "ready_for_board",
      ).length,
      total: sectionTemplates.length,
    };
  });
  const completed = args.responses.filter(isResponseComplete).length;
  const boardApprovalNeeded = accreditationTemplates.filter(
    (template) => template.boardApprovalRequired,
  ).length;
  const approved = args.responses.filter(
    (response) => response.approvalStatus === "board_approved",
  ).length;
  const readyForBoard = args.responses.filter(
    (response) => response.approvalStatus === "ready_for_board",
  ).length;

  return {
    configured: args.configured,
    completionPercent: Math.round((completed / accreditationTemplates.length) * 100),
    instanceId: args.instanceId,
    lastUpdatedAt: args.lastUpdatedAt,
    resourceId: args.resourceId,
    responses: args.responses,
    sections,
    settings: args.settings,
    templates: accreditationTemplates,
    totals: {
      approved,
      boardApprovalNeeded,
      completed,
      readyForBoard,
      total: accreditationTemplates.length,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStrictCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === value;
}
