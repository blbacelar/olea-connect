import type {
  Member,
  Organization,
  Session,
  Template,
  TemplateSession,
} from "@/lib/types";

export const mockOrganization: Organization = {
  id: "org-jp-centre",
  name: "JP Centre for Youth",
  tier: "roots",
  seatsUsed: 1,
  seatLimit: 2,
  renewalDate: "2027-06-10",
  brand: {
    organizationName: "JP Centre for Youth",
    logoInitials: "JP",
    primaryColor: "#4A7C59",
    secondaryColor: "#2D5C3E",
  },
};

export const mockMember: Member = {
  id: "member-sarah",
  organizationId: mockOrganization.id,
  name: "Sarah Mitchell",
  firstName: "Sarah",
  role: "Executive Director",
  email: "sarah@jpcentre.ca",
};

export const mockSession: Session = {
  member: mockMember,
  organization: mockOrganization,
};

export const mockTemplates: Template[] = [
  {
    id: "template-board-evaluation",
    slug: "board-self-evaluation",
    name: "Board Self-Evaluation",
    description: "An annual survey to strengthen board performance and governance.",
    category: "Governance",
    requiredTier: "roots",
    available: true,
    estimatedTime: "~20 min",
    status: "Last used May 2026",
  },
  {
    id: "template-board-agenda",
    slug: "board-meeting-agenda",
    name: "Board Meeting Agenda",
    description: "A focused, repeatable agenda for productive board meetings.",
    category: "Board Operations",
    requiredTier: "roots",
    available: true,
    estimatedTime: "~10 min",
    status: "Not started yet",
    isNew: true,
  },
  {
    id: "template-director-onboarding",
    slug: "director-onboarding-checklist",
    name: "Director Onboarding Checklist",
    description: "Give new directors the context and tools they need to contribute.",
    category: "People",
    requiredTier: "roots",
    available: true,
    estimatedTime: "~12 min",
    status: "Not started yet",
  },
  {
    id: "template-conflict-policy",
    slug: "conflict-of-interest-policy",
    name: "Conflict of Interest Policy",
    description: "A clear policy framework for disclosure and ethical decisions.",
    category: "Policy",
    requiredTier: "canopy",
    available: false,
    estimatedTime: "~12 min",
    status: "",
  },
];

export const mockTemplateSession: TemplateSession = {
  id: "session-board-evaluation",
  templateId: "template-board-evaluation",
  organizationId: mockOrganization.id,
  boardYear: "2026–2027",
  surveyPeriod: "June 2026",
  answers: {},
  openEndedAnswers: {},
  administrator: "Sarah Mitchell",
  contact: "sarah@jpcentre.ca",
  deadline: "2026-06-30",
  updatedAt: "2026-06-10T12:00:00.000Z",
};
