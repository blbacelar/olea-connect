import type {
  AccreditationSection,
  AccreditationTemplateDefinition,
} from "@/lib/accreditation/types";

export const accreditationResourceSlug = "imagine-canada-accreditation-prep";

export const accreditationSections: AccreditationSection[] = [
  {
    id: "A",
    name: "Board Governance",
    description: "Mission, strategy, board policies, oversight, and ethics.",
  },
  {
    id: "B",
    name: "Financial Accountability",
    description: "Financial reporting, audit, reserves, remittances, and controls.",
  },
  {
    id: "C",
    name: "Fundraising",
    description: "Donor privacy, fundraising ethics, restricted funds, and gifts.",
  },
  {
    id: "D",
    name: "Staff Management",
    description: "Hiring, job descriptions, compensation, reviews, and HR practices.",
  },
  {
    id: "E",
    name: "Volunteer Involvement",
    description: "Volunteer program policies, onboarding, supervision, and recognition.",
  },
];

const policyMistakes = [
  "Uploading an informal note instead of an approved policy.",
  "Missing the approval date, owner, or review cadence.",
  "Using policy language that does not match the organization’s actual practice.",
];

const procedureMistakes = [
  "Documenting a process without naming the owner responsible for it.",
  "Skipping review or escalation steps.",
  "Leaving the procedure too vague for a new staff or board member to follow.",
];

const evidenceMistakes = [
  "Uploading evidence that is outdated or missing dates.",
  "Providing a file name without explaining where the source document lives.",
  "Marking a document ready before confirming the Imagine Canada checklist items.",
];

const planMistakes = [
  "Treating the plan as a one-time document without review dates.",
  "Missing assigned owners for follow-up actions.",
  "Leaving risks, dependencies, or board approval status unclear.",
];

function defaultStructure(kind: AccreditationTemplateDefinition["kind"]) {
  if (kind === "policy") {
    return [
      "Purpose and scope",
      "Policy statements",
      "Roles and responsibilities",
      "Approval date and review cycle",
    ];
  }
  if (kind === "procedure") {
    return [
      "Purpose",
      "Step-by-step process",
      "Responsible role",
      "Records or evidence retained",
    ];
  }
  if (kind === "plan") {
    return [
      "Objective",
      "Current state",
      "Actions, owners, and timelines",
      "Review and board approval",
    ];
  }
  return [
    "Document or evidence name",
    "Location or source",
    "Date last reviewed",
    "Owner responsible for keeping it current",
  ];
}

function defaultChecklist(title: string, requiresApproval: boolean) {
  return [
    `${title} is current and organization-specific.`,
    "Responsible owner is named.",
    "Review date or evidence date is visible.",
    requiresApproval
      ? "Board approval is recorded before submission."
      : "Document is ready to attach or reference in the accreditation portal.",
  ];
}

function defaultDraft(title: string, kind: AccreditationTemplateDefinition["kind"]) {
  if (kind === "document") {
    return `${title}\n\nDocument owner:\nDocument location:\nDate last reviewed:\nEvidence notes:`;
  }
  return `${title}\n\nPurpose:\n\nScope:\n\nResponsible owner:\n\nKey content:\n\nReview cadence:`;
}

function template(
  code: string,
  title: string,
  sectionId: AccreditationTemplateDefinition["sectionId"],
  kind: AccreditationTemplateDefinition["kind"],
  boardApprovalRequired: boolean,
  whoCompletes: string,
  requirement: string,
): AccreditationTemplateDefinition {
  const mistakes =
    kind === "policy"
      ? policyMistakes
      : kind === "procedure"
        ? procedureMistakes
        : kind === "plan"
          ? planMistakes
          : evidenceMistakes;

  return {
    boardApprovalRequired,
    checklist: defaultChecklist(title, boardApprovalRequired),
    code,
    commonMistakes: mistakes,
    defaultDraft: defaultDraft(title, kind),
    icRequirement: requirement,
    kind,
    sectionId,
    structure: defaultStructure(kind),
    title,
    whoCompletes,
  };
}

export const accreditationTemplates: AccreditationTemplateDefinition[] = [
  template("A1", "Mission Review", "A", "plan", true, "Board Chair / Executive Director", "The board and staff have a current document that articulates the organization’s mission and vision."),
  template("A2", "Strategic Plan", "A", "plan", true, "Board and Executive Director", "The organization has a strategic plan or strategic priorities approved by the board."),
  template("A3", "Staff Recruitment", "A", "procedure", false, "Executive Director / HR Lead", "The organization follows a fair recruitment process for staff roles."),
  template("A4", "Conflict of Interest", "A", "policy", true, "Board Chair", "The organization has a written conflict of interest policy requiring directors to disclose potential conflicts."),
  template("A5", "Board Procedures", "A", "policy", true, "Board Chair / Governance Committee", "The organization documents board meeting, decision-making, quorum, minutes, and committee procedures."),
  template("A6", "Board Evaluation", "A", "procedure", false, "Board Chair / Governance Committee", "The board reviews its performance and uses results to improve governance."),
  template("A6a", "ED Succession Planning", "A", "plan", true, "Board Chair / Executive Committee", "The board maintains a succession plan for planned or unexpected Executive Director transitions."),
  template("A7", "Risk Management", "A", "plan", true, "Board and Executive Director", "The organization identifies, assesses, and manages key strategic and operational risks."),
  template("A8", "Insurance Review", "A", "document", false, "Executive Director / Finance Lead", "The organization reviews insurance coverage and retains evidence of current policies."),
  template("A11", "Code of Ethics", "A", "policy", true, "Board Chair", "The organization has a code of ethics that guides board, staff, and volunteer conduct."),
  template("A15", "Whistleblower Policy", "A", "policy", true, "Board Chair / HR Lead", "The organization has a safe process for reporting wrongdoing or serious concerns."),
  template("A25", "Anti-Harassment Policy", "A", "policy", true, "Executive Director / HR Lead", "The organization has a policy addressing harassment, discrimination, and complaint handling."),
  template("A27", "Equity & Inclusion Policy", "A", "policy", true, "Board and Executive Director", "The organization documents its commitment and practices for equity, inclusion, and accessibility."),
  template("B1", "Financial Reporting", "B", "document", false, "Finance Lead / Treasurer", "The organization prepares regular financial reports for management and board oversight."),
  template("B2", "Independent Audit", "B", "document", false, "Treasurer / Finance Committee", "The organization completes an independent audit or review engagement as applicable."),
  template("B3", "Expense Reconciliation", "B", "procedure", false, "Finance Lead", "The organization reconciles expenses and accounts on a regular schedule."),
  template("B4", "Tax Filing Tracking", "B", "procedure", false, "Finance Lead", "The organization tracks statutory tax and charity filings and keeps evidence of submission."),
  template("B5", "Financial Reserves Policy", "B", "policy", true, "Treasurer / Board", "The organization has a reserves policy that defines target levels and use of reserves."),
  template("B6", "Statutory Remittances", "B", "procedure", false, "Finance Lead / Payroll Lead", "The organization remits payroll, tax, and statutory obligations on time."),
  template("B7", "Fundraising Costs", "B", "document", false, "Finance Lead / Fundraising Lead", "The organization tracks fundraising costs and can explain cost allocation."),
  template("C1", "Donor Privacy", "C", "policy", true, "Fundraising Lead / Privacy Lead", "The organization protects donor information and complies with privacy obligations."),
  template("C2", "Fundraising Ethics", "C", "policy", true, "Fundraising Lead / Board", "The organization has ethical fundraising practices and clear standards for donor communications."),
  template("C3", "Restricted Funds", "C", "procedure", false, "Finance Lead / Fundraising Lead", "The organization tracks and uses restricted funds according to donor intent."),
  template("C4", "Donation Receipts", "C", "document", false, "Finance Lead / Gift Processing", "The organization issues accurate donation receipts and keeps receipt records."),
  template("C5", "Gift Acceptance", "C", "procedure", true, "Fundraising Lead / Board", "The organization defines what gifts it will accept and when board review is required."),
  template("D1", "Hiring Process", "D", "procedure", false, "Executive Director / HR Lead", "The organization has a documented recruitment and hiring process for staff."),
  template("D2", "Job Descriptions", "D", "document", false, "Executive Director / HR Lead", "The organization has current job descriptions for staff positions."),
  template("D3", "Compensation Review", "D", "procedure", false, "Executive Director / Board", "The organization periodically reviews compensation practices and records decisions."),
  template("D4", "Performance Review", "D", "procedure", false, "Executive Director / HR Lead", "The organization conducts and documents staff performance reviews."),
  template("D5", "Grievance Resolution", "D", "procedure", false, "HR Lead / Executive Director", "The organization has a process for employees to raise and resolve concerns."),
  template("D6", "Confidentiality", "D", "policy", true, "HR Lead / Board", "The organization has a confidentiality policy for staff, board, and volunteers."),
  template("D7", "Professional Development", "D", "document", false, "Executive Director / HR Lead", "The organization documents staff learning and professional development practices."),
  template("E1", "Volunteer Program", "E", "policy", true, "Volunteer Manager / Executive Director", "The organization has a documented volunteer program policy."),
  template("E2", "Orientation & Training", "E", "procedure", false, "Volunteer Manager", "The organization orients and trains volunteers for their roles."),
  template("E3", "Assignment & Supervision", "E", "procedure", false, "Volunteer Manager", "The organization assigns, supervises, and supports volunteers appropriately."),
  template("E4", "Evaluation & Recognition", "E", "document", false, "Volunteer Manager", "The organization evaluates volunteer involvement and recognizes contributions."),
];

export function getAccreditationTemplate(code: string) {
  return accreditationTemplates.find((item) => item.code === code) ?? null;
}
