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
  selectedTemplateIds: string[];
}

export interface BrandProfile {
  organizationName: string;
  logoInitials: string;
  logoPath?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  address?: string;
  phone?: string;
  contactEmail?: string;
  website?: string;
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
  availableAt?: string | null;
  selectedAt?: string | null;
  lockedUntil?: string | null;
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

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: OrganizationRole;
  status: "invited" | "active" | "suspended";
  joinedAt: string | null;
}

export interface TeamData {
  currentMember: Member;
  organization: Organization;
  activeMemberCount: number;
  reservedSeatCount: number;
  members: TeamMember[];
  invitations: TeamInvitation[];
  canManage: boolean;
}

export interface GrantRound {
  id: string;
  name: string;
  programName: string;
  programType: "quarterly" | "summit" | "named_sponsor";
  description: string;
  status: "draft" | "upcoming" | "open" | "reviewing" | "awarded" | "closed";
  opensAt: string;
  closesAt: string;
  decisionAt: string | null;
  awardAmountCents: number;
  availableAwards: number;
  budgetCents: number;
  publicNotes: string | null;
  existingApplicationId: string | null;
}

export interface GrantApplicationSummary {
  id: string;
  roundId: string;
  roundName: string;
  organizationName: string;
  status:
    | "draft"
    | "submitted"
    | "in_review"
    | "shortlisted"
    | "approved"
    | "declined"
    | "withdrawn";
  focusArea: string;
  fundingRequest: string;
  expectedOutcome: string;
  requestedAmountCents: number;
  annualRevenueCents: number | null;
  craGoodStanding: boolean;
  registeredInCanada: boolean;
  submittedAt: string | null;
  withdrawnAt: string | null;
  updatedAt: string;
  award: {
    id: string;
    status: "approved" | "scheduled" | "paid" | "canceled";
    amountCents: number;
    paidOn: string | null;
    paymentReference: string | null;
    impactStory: string | null;
    impactStoryConsent: boolean;
    outcomeReceivedAt: string | null;
  } | null;
  reviews?: Array<{
    id: string;
    score: number | null;
    recommendation: string | null;
    internalNotes: string | null;
    reviewedAt: string;
  }>;
}

export interface Webinar {
  id: string;
  slug: string;
  type:
    | "webinar"
    | "speaker_session"
    | "funder_ama"
    | "networking"
    | "workshop"
    | "summit";
  title: string;
  summary: string;
  status: "scheduled" | "live" | "completed" | "canceled" | "rescheduled";
  startsAt: string;
  endsAt: string;
  timezone: string;
  capacity: number | null;
  joinUrl: string | null;
  meetingProvider: string | null;
  providerEventId: string | null;
  recordingAvailable: boolean;
  available: boolean;
  registered: boolean;
  registrationStatus:
    | "registered"
    | "waitlisted"
    | "canceled"
    | "attended"
    | "no_show"
    | null;
  included: boolean;
  complimentaryTicketLimit: number | null;
  complimentaryTicketsUsed: number;
  ticketPriceCents: number | null;
  currency: string;
  allowedPlanIds: MembershipTier[];
}

export interface CommunitySpace {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  allowedPlanIds: MembershipTier[];
}

export interface CommunityPost {
  id: string;
  spaceId: string;
  authorUserId: string;
  authorName: string;
  authorOrganizationName: string;
  kind: "discussion" | "announcement" | "resource";
  title: string;
  body: string;
  resourceUrl: string | null;
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string;
  comments: CommunityPostComment[];
  likedByCurrentUser: boolean;
  likeCount: number;
}

export interface CommunityPostComment {
  id: string;
  authorUserId: string;
  authorName: string;
  authorOrganizationName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  likedByCurrentUser: boolean;
  likeCount: number;
}

export interface CommunityEvent {
  id: string;
  spaceId: string | null;
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  zoomUrl: string | null;
  recordingUrl: string | null;
  status: "scheduled" | "live" | "completed" | "canceled";
}

export interface CommunityHome {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  spaces: CommunitySpace[];
  posts: CommunityPost[];
  events: CommunityEvent[];
  canManage: boolean;
  currentUserId: string;
}
