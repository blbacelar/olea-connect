import { z } from "zod";

import type { TemplateFormData } from "./types";

export const meetingDocumentKinds = ["consent_agenda", "board_minutes", "committee_agenda", "committee_minutes"] as const;
export type MeetingDocumentKind = (typeof meetingDocumentKinds)[number];

export const meetingDocumentTitles: Record<MeetingDocumentKind, string> = {
  consent_agenda: "Consent agenda",
  board_minutes: "Board minutes",
  committee_agenda: "Committee agenda",
  committee_minutes: "Committee minutes",
};

export function meetingDocumentKindsFor(type: string): MeetingDocumentKind[] {
  return /committee/i.test(type)
    ? ["committee_agenda", "committee_minutes"]
    : ["consent_agenda", "board_minutes"];
}

const attendanceSchema = z.object({
  memberId: z.string().min(1).max(200),
  status: z.enum(["not_recorded", "present", "remote", "absent", "attending", "tentative", "not_attending", "no_response"]),
});

const motionSchema = z.object({
  id: z.string().min(1).max(200),
  text: z.string().trim().min(1).max(2000),
  movedBy: z.string().max(200),
  secondedBy: z.string().max(200),
  movedByName: z.string().trim().max(200).optional(),
  secondedByName: z.string().trim().max(200).optional(),
  votesFor: z.number().int().min(0).max(10000),
  votesAgainst: z.number().int().min(0).max(10000),
  abstentions: z.number().int().min(0).max(10000),
  outcome: z.enum(["pending", "carried", "failed", "tabled"]),
});

const actionSchema = z.object({
  id: z.string().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  ownerId: z.string().max(200),
  ownerName: z.string().trim().max(200).optional(),
  dueDate: z.union([z.literal(""), z.iso.date()]),
  done: z.boolean(),
  status: z.enum(["open", "in_progress", "done"]).optional(),
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
  committee_agenda: [
    { id: "call", label: "Call to order", placeholder: "Confirm the committee and quorum." },
    { id: "review", label: "Review of open action items", placeholder: "Record progress on actions from the last meeting." },
    { id: "agenda", label: "Agenda items", placeholder: "List items in discussion order." },
    { id: "next", label: "Next steps and recommendations to the board", placeholder: "Record what the committee recommends." },
  ],
  committee_minutes: [
    { id: "summary", label: "Summary of discussion", placeholder: "Summarize key deliberations." },
    { id: "next", label: "Next meeting", placeholder: "Record the next meeting date and time." },
  ],
};

const initialSectionText: Partial<Record<MeetingDocumentKind, Record<string, string>>> = {
  consent_agenda: {
    call: "The Chair calls the meeting to order and confirms a quorum is present.",
    consent: "Approved together in a single motion unless an item is pulled:\n• Approval of previous minutes\n• Financial report acceptance\n• Committee reports (received as information)\n• Routine renewals and ratifications",
    regular: "1. \n2. \n3. ",
    reports: "• Executive Director report\n• Treasurer / Finance\n• Committee updates",
    adjourn: "Motion to adjourn. Next meeting date confirmed.",
  },
  board_minutes: {
    prior: "The minutes of the previous meeting were reviewed and approved as presented.",
    adjourn: "Meeting adjourned at ____. Next meeting: ____.",
  },
  committee_agenda: {
    call: "Committee called to order. Quorum confirmed.",
    agenda: "1. \n2. \n3. ",
  },
};

const initialSectionTextFrench: Partial<Record<MeetingDocumentKind, Record<string, string>>> = {
  consent_agenda: {
    call: "La présidence ouvre la séance et confirme le quorum.",
    consent: "Approuvés par une seule motion, sauf si un point est retiré :\n• Approbation du procès-verbal précédent\n• Acceptation du rapport financier\n• Réception des rapports des comités\n• Renouvellements et ratifications courants",
    regular: "1. \n2. \n3. ",
    reports: "• Rapport de la direction générale\n• Trésorerie et finances\n• Nouvelles des comités",
    adjourn: "Motion de lever la séance. Date de la prochaine réunion confirmée.",
  },
  board_minutes: {
    prior: "Le procès-verbal de la réunion précédente a été examiné et approuvé tel que présenté.",
    adjourn: "Séance levée à ____. Prochaine réunion : ____.",
  },
  committee_agenda: {
    call: "La séance du comité est ouverte. Le quorum est confirmé.",
    agenda: "1. \n2. \n3. ",
  },
};

export function createMeetingDocument(
  meetingId: string,
  kind: MeetingDocumentKind,
  memberIds: string[],
  french = false,
): MeetingDocument {
  return {
    meetingId,
    kind,
    status: "draft",
    sections: Object.fromEntries(meetingDocumentSections[kind].map(({ id }) => [id, (french ? initialSectionTextFrench : initialSectionText)[kind]?.[id] ?? ""])),
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
  if (document.kind === "consent_agenda" || document.kind === "committee_agenda") {
    return document.kind === "consent_agenda"
      ? Boolean(document.sections.consent?.trim() || document.sections.regular?.trim())
      : Boolean(document.sections.agenda?.trim() || document.sections.next?.trim() || document.actions.length);
  }
  return Boolean(
    document.sections.discussion?.trim() || document.motions.length || document.actions.length,
  );
}
