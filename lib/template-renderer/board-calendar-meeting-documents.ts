import { z } from "zod";

import type { TemplateFormData } from "./types";

export const meetingDocumentKinds = ["consent_agenda", "board_minutes"] as const;
export type MeetingDocumentKind = (typeof meetingDocumentKinds)[number];

const attendanceSchema = z.object({
  memberId: z.string().min(1).max(200),
  status: z.enum(["not_recorded", "present", "remote", "absent"]),
});

const motionSchema = z.object({
  id: z.string().min(1).max(200),
  text: z.string().trim().min(1).max(2000),
  movedBy: z.string().max(200),
  secondedBy: z.string().max(200),
  votesFor: z.number().int().min(0).max(10000),
  votesAgainst: z.number().int().min(0).max(10000),
  abstentions: z.number().int().min(0).max(10000),
  outcome: z.enum(["pending", "carried", "failed"]),
});

const actionSchema = z.object({
  id: z.string().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  ownerId: z.string().max(200),
  dueDate: z.union([z.literal(""), z.iso.date()]),
  done: z.boolean(),
});

export const meetingDocumentSchema = z.object({
  meetingId: z.string().min(1).max(200),
  kind: z.enum(meetingDocumentKinds),
  status: z.enum(["draft", "approved"]),
  sections: z.record(z.string(), z.string().max(4000)),
  attendance: z.array(attendanceSchema).max(100),
  motions: z.array(motionSchema).max(100),
  actions: z.array(actionSchema).max(100),
  updatedAt: z.iso.datetime(),
});

export type MeetingDocument = z.infer<typeof meetingDocumentSchema>;

export const meetingDocumentSections: Record<
  MeetingDocumentKind,
  { id: string; label: string; placeholder: string }[]
> = {
  consent_agenda: [
    { id: "call", label: "Call to order", placeholder: "Chair, start time, and quorum." },
    { id: "consent", label: "Consent agenda", placeholder: "List routine items for one motion. Note any items pulled for separate discussion." },
    { id: "regular", label: "Regular agenda", placeholder: "List discussion and decision items in order." },
    { id: "reports", label: "Reports", placeholder: "Executive Director, finance, and committee reports." },
    { id: "new", label: "New business", placeholder: "Other matters for the board." },
    { id: "adjourn", label: "Adjournment", placeholder: "Planned adjournment and next meeting." },
  ],
  board_minutes: [
    { id: "prior", label: "Approval of prior minutes", placeholder: "Record the approval or changes requested." },
    { id: "discussion", label: "Discussion summary", placeholder: "Summarize key deliberations without a verbatim transcript." },
    { id: "adjourn", label: "Adjournment and next meeting", placeholder: "Record adjournment time and the next meeting date." },
  ],
};

export function createMeetingDocument(
  meetingId: string,
  kind: MeetingDocumentKind,
  memberIds: string[],
): MeetingDocument {
  return {
    meetingId,
    kind,
    status: "draft",
    sections: Object.fromEntries(meetingDocumentSections[kind].map(({ id }) => [id, ""])),
    attendance: memberIds.map((memberId) => ({ memberId, status: "not_recorded" })),
    motions: [],
    actions: [],
    updatedAt: new Date().toISOString(),
  };
}

export function getMeetingDocuments(data: TemplateFormData): MeetingDocument[] {
  const rows = data.meeting_documents;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const result = meetingDocumentSchema.safeParse(row);
    return result.success ? [result.data] : [];
  });
}

export function upsertMeetingDocument(
  data: TemplateFormData,
  document: MeetingDocument,
): TemplateFormData {
  const parsed = meetingDocumentSchema.parse(document);
  const rows = getMeetingDocuments(data).filter(
    (row) => row.meetingId !== parsed.meetingId || row.kind !== parsed.kind,
  );
  return { ...data, meeting_documents: [...rows, parsed] };
}

export function validateMeetingDocuments(data: TemplateFormData): MeetingDocument[] {
  const rows = data.meeting_documents;
  if (rows === undefined) return [];
  if (!Array.isArray(rows) || rows.length > 400) {
    throw new Error("Invalid meeting documents.");
  }

  const meetings = Array.isArray(data.meetings) ? data.meetings : [];
  const validMeetingIds = new Set(
    meetings.map((meeting, index) =>
      meeting && typeof meeting === "object" && "id" in meeting && typeof meeting.id === "string"
        ? meeting.id
        : `meeting-${index}`,
    ),
  );
  const parsed = rows.map((row) => meetingDocumentSchema.parse(row));
  const keys = new Set<string>();
  for (const document of parsed) {
    if (!validMeetingIds.has(document.meetingId)) {
      throw new Error("A meeting document references a missing meeting.");
    }
    const key = `${document.meetingId}:${document.kind}`;
    if (keys.has(key)) throw new Error("Duplicate meeting document.");
    keys.add(key);
    if (document.status === "approved" && !hasApprovalContent(document)) {
      throw new Error("Add meeting content before approving this document.");
    }
  }
  return parsed;
}

export function assertMeetingDocumentWriteAccess({
  before,
  after,
  canApprove,
}: {
  before: MeetingDocument[];
  after: MeetingDocument[];
  canApprove: boolean;
}) {
  if (canApprove) return;
  const previous = new Map(before.map((document) => [`${document.meetingId}:${document.kind}`, document]));
  const next = new Map(after.map((document) => [`${document.meetingId}:${document.kind}`, document]));
  for (const [key, document] of next) {
    if (document.status === "approved" && JSON.stringify(previous.get(key)) !== JSON.stringify(document)) {
      throw new Error("Only an organization administrator can approve or edit approved meeting documents.");
    }
  }
  for (const [key, document] of previous) {
    if (document.status === "approved" && JSON.stringify(next.get(key)) !== JSON.stringify(document)) {
      throw new Error("Only an organization administrator can change approved meeting documents.");
    }
  }
}

export function assertMeetingDocumentMembers({
  before,
  after,
  activeMemberIds,
}: {
  before: MeetingDocument[];
  after: MeetingDocument[];
  activeMemberIds: string[];
}) {
  const allowed = new Set(activeMemberIds);
  for (const document of before) {
    for (const row of document.attendance) allowed.add(row.memberId);
    for (const motion of document.motions) {
      if (motion.movedBy) allowed.add(motion.movedBy);
      if (motion.secondedBy) allowed.add(motion.secondedBy);
    }
    for (const action of document.actions) if (action.ownerId) allowed.add(action.ownerId);
  }
  for (const document of after) {
    const ids = [
      ...document.attendance.map((row) => row.memberId),
      ...document.motions.flatMap((motion) => [motion.movedBy, motion.secondedBy]),
      ...document.actions.map((action) => action.ownerId),
    ];
    if (ids.some((id) => id && !allowed.has(id))) {
      throw new Error("Meeting participants must belong to this workspace.");
    }
  }
}

export function hasApprovalContent(document: MeetingDocument): boolean {
  if (document.kind === "consent_agenda") {
    return Boolean(document.sections.consent?.trim() || document.sections.regular?.trim());
  }
  return Boolean(
    document.sections.discussion?.trim() || document.motions.length || document.actions.length,
  );
}
