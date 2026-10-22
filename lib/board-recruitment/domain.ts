import type {
  CoverageLevel,
  RecruitmentMember,
  RecruitmentTerm,
  RecruitmentWorkspace,
} from "./types";

export const recruitmentCategories = [
  {
    name: "Professional Expertise",
    skills: [
      "Law / Legal Affairs",
      "Finance / Accounting",
      "Medicine / Healthcare",
      "Mental Health / Psychology",
      "Business / Entrepreneurship",
      "Human Resources",
      "Marketing / Communications / PR",
      "Technology / IT / Cybersecurity",
      "Government / Public Policy",
      "Social Work / Community Services",
      "Education / Academia",
      "Nonprofit / Charitable Sector",
      "Engineering / Architecture / Trades",
      "Environment / Natural Sciences",
      "Arts / Culture / Creative Industries",
      "Research / Evaluation",
      "Real Estate / Property Management",
      "Agriculture / Food Systems",
    ],
  },
  {
    name: "Governance & Leadership",
    skills: [
      "Prior Nonprofit Board Experience",
      "Prior For-Profit Board Experience",
      "Executive Leadership (ED / CEO / COO)",
      "Board Chair or Committee Chair",
      "Strategic Planning",
      "Risk Management",
      "Fundraising / Development",
      "Advocacy / Government Relations",
      "Audit or Finance Committee",
      "Conflict Resolution / Mediation",
    ],
  },
  {
    name: "Community & Networks",
    skills: [
      "Volunteer Leadership",
      "Grassroots Community Organizing",
      "Community / Neighbourhood Association",
      "Faith Community Leadership",
      "Sports & Recreation Leadership",
      "Parent / School Council",
      "Youth Program Leadership",
      "Cultural / Multicultural Organization",
      "Environmental / Conservation",
      "Peer Support / Lived Experience Community",
      "Business / Chamber / Service Club",
      "Advocacy / Social Justice",
    ],
  },
  {
    name: "Contributions This Year",
    skills: [
      "Legal or Regulatory Knowledge",
      "Financial Analysis or Oversight",
      "Business or Organizational Strategy",
      "Health or Social Services Knowledge",
      "Technology or Data Management",
      "Marketing, Communications, or PR",
      "Government, Policy, or Advocacy",
      "Human Resources or People Management",
      "Community Organizing or Lived Experience",
      "Research, Evaluation, or Data Analysis",
      "Fundraising or Donor Relations",
      "Cultural or Community-Specific Knowledge",
      "Nonprofit or Charitable Sector Experience",
    ],
  },
] as const;

export const defaultCommittees = [
  "Executive",
  "Finance & Audit",
  "Governance & HR",
  "Community Engagement (Events)",
  "Philanthropy (Fundraising)",
] as const;

export const officerLabels = {
  "": "Not an officer",
  chair: "Chair / President",
  vice: "Vice Chair / President",
  secretary: "Board Secretary",
  treasurer: "Board Treasurer",
} as const;

export function coverageLevel(
  holderCount: number,
  activeDirectors: number,
): CoverageLevel {
  if (activeDirectors <= 0 || holderCount <= 0) return "none";
  const pct = (holderCount / activeDirectors) * 100;
  if (pct >= 60) return "strong";
  if (pct >= 30) return "moderate";
  return "gap";
}

export function calculateTerm(
  member: Pick<RecruitmentMember, "memberType" | "dateJoined">,
  workspace: Pick<
    RecruitmentWorkspace,
    | "termLengthYears"
    | "maxConsecutiveTerms"
    | "maxYearsOfService"
    | "upcomingAgmYear"
  >,
): RecruitmentTerm {
  if (member.memberType === "staff") {
    return { termNumber: 0, endYear: null, status: "staff", eligible: false };
  }
  if (!member.dateJoined) {
    return {
      termNumber: 0,
      endYear: null,
      status: "continuing",
      eligible: true,
    };
  }
  const joinedYear = Number(member.dateJoined.slice(0, 4));
  let termNumber = 1;
  let endYear = joinedYear + workspace.termLengthYears;
  while (endYear < workspace.upcomingAgmYear) {
    termNumber += 1;
    endYear += workspace.termLengthYears;
  }
  const nextTerm = termNumber + 1;
  const yearsAtNextEnd = endYear + workspace.termLengthYears - joinedYear;
  return {
    termNumber,
    endYear,
    status:
      endYear === workspace.upcomingAgmYear
        ? "standing"
        : nextTerm > workspace.maxConsecutiveTerms ||
            yearsAtNextEnd > workspace.maxYearsOfService
          ? "term-limited"
          : "continuing",
    eligible:
      nextTerm <= workspace.maxConsecutiveTerms &&
      yearsAtNextEnd <= workspace.maxYearsOfService,
  };
}

export function getInvitationStatus(status: string | undefined) {
  if (status === "responded" || status === "sent") return status;
  return "pending" as const;
}

export function statusLabel(status: ReturnType<typeof getInvitationStatus>) {
  return status === "responded"
    ? "Responded"
    : status === "sent"
      ? "Invited"
      : "Not started";
}
