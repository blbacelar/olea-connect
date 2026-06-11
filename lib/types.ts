export type Tier = "roots" | "canopy" | "forest";
export type MembershipTier = "seedling" | "roots" | "canopy" | "harvest";

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
  brand: BrandProfile;
}

export interface Member {
  id: string;
  organizationId: string;
  name: string;
  firstName: string;
  role: string;
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
