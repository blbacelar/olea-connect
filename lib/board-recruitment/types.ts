export type RecruitmentTab =
  "overview" | "survey" | "matrix" | "terms" | "committees" | "report";

export type RecruitmentMemberType = "director" | "staff";
export type RecruitmentOffice =
  "" | "chair" | "vice" | "secretary" | "treasurer";
export type InvitationStatus = "pending" | "sent" | "responded";
export type CoverageLevel = "strong" | "moderate" | "gap" | "none";

export type RecruitmentWorkspace = {
  id: string;
  organizationId: string;
  organizationName: string;
  accentColor: string;
  surveyYear: number;
  termLengthYears: number;
  maxConsecutiveTerms: number;
  maxYearsOfService: number;
  upcomingAgmYear: number;
};

export type RecruitmentMember = {
  id: string;
  fullName: string;
  roleTitle: string;
  memberType: RecruitmentMemberType;
  office: RecruitmentOffice;
  email: string;
  dateJoined: string | null;
  active: boolean;
  notes: string;
};

export type RecruitmentSkill = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  isCustom: boolean;
  sortOrder: number;
};

export type RecruitmentInvitation = {
  id: string;
  memberId: string;
  status: InvitationStatus;
  surveyYear: number;
  expiresAt: string | null;
};

export type PublicRecruitmentSurvey = {
  token: string;
  organizationName: string;
  surveyYear: number;
  memberName: string;
  skills: RecruitmentSkill[];
  responses: RecruitmentResponse[];
  expiresAt: string;
  submitted: boolean;
};

export type RecruitmentResponse = {
  memberId: string;
  skillId: string;
  hasSkill: boolean;
};

export type RecruitmentCommittee = {
  id: string;
  name: string;
  sortOrder: number;
  memberIds: string[];
  chairId: string | null;
};

export type RecruitmentTerm = {
  termNumber: number;
  endYear: number | null;
  status: "continuing" | "standing" | "term-limited" | "staff";
  eligible: boolean;
};

export type RecruitmentData = {
  workspace: RecruitmentWorkspace;
  members: RecruitmentMember[];
  skills: RecruitmentSkill[];
  invitations: RecruitmentInvitation[];
  responses: RecruitmentResponse[];
  committees: RecruitmentCommittee[];
};
