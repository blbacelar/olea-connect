export type MembershipTier = "seedling" | "roots" | "canopy" | "harvest";
export type Tier = MembershipTier;
export type OrganizationRole = "owner" | "admin" | "member";

export interface RegistrationState {
  tier: MembershipTier;
  billingCycle: "monthly" | "annual";
  organizationName: string;
  fullName: string;
  email: string;
  password: string;
  province: string;
  emailVerified: boolean;
  brandComplete: boolean;
  logoDataUrl?: string;
  selectedTemplateIds: string[];
}

export interface BrandProfile {
  organizationName: string;
  logoInitials: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface Organization {
  id: string;
  name: string;
  tier: Tier;
  seatsUsed: number;
  seatLimit: number;
  renewalDate: string;
  brandComplete: boolean;
  brand: BrandProfile;
}

export interface Member {
  id: string;
  organizationId: string;
  name: string;
  firstName: string;
  role: string;
  membershipRole: OrganizationRole;
  email: string;
}

export interface Template {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  requiredTier: Tier;
  available: boolean;
  estimatedTime: string;
  status: string;
  isNew?: boolean;
}

export type SurveyScore = 1 | 2 | 3 | 4 | 5 | "na";

export interface SurveyQuestion {
  id: number;
  text: string;
}

export interface SurveySectionData {
  id: string;
  title: string;
  questions: SurveyQuestion[];
}

export interface TemplateSession {
  id: string;
  templateId: string;
  organizationId: string;
  boardYear: string;
  surveyPeriod: string;
  answers: Record<number, SurveyScore>;
  openEndedAnswers: Record<string, string>;
  administrator: string;
  contact: string;
  deadline: string;
  updatedAt: string;
}

export interface Session {
  member: Member;
  organization: Organization;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: OrganizationRole;
  status: "pending" | "accepted" | "expired" | "revoked";
  createdAt: string;
  expiresAt: string;
}

export interface TeamData {
  currentMember: Member;
  organization: Organization;
  activeMemberCount: number;
  invitations: TeamInvitation[];
  canManage: boolean;
}

export interface GrantRound {
  id: string;
  name: string;
  programName: string;
  description: string;
  status: "upcoming" | "open" | "reviewing" | "decided" | "closed";
  opensAt: string;
  closesAt: string;
  awardAmountCents: number;
  availableAwards: number;
}

export interface GrantApplicationSummary {
  id: string;
  roundName: string;
  status: string;
  requestedAmountCents: number;
  submittedAt: string | null;
  updatedAt: string;
}

export interface Webinar {
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: "scheduled" | "live" | "completed" | "canceled";
  startsAt: string;
  endsAt: string;
  timezone: string;
  capacity: number | null;
  recordingUrl: string | null;
  available: boolean;
  registered: boolean;
  allowedPlanIds: MembershipTier[];
}
