export interface GrantPlatformTemplateSection {
  id: string;
  title: string;
  description: string;
  highlights: string[];
}

export interface GrantPlatformSettingsOption {
  id: string;
  title: string;
  description: string;
  details: string[];
}

export interface GrantPlatformWorkflowStage {
  id: string;
  title: string;
  description: string;
  status: "active" | "up-next" | "done";
  checklist: string[];
}

export interface GrantPlatformTemplateDefinition {
  slug: string;
  name: string;
  category: string;
  summary: string;
  sections: GrantPlatformTemplateSection[];
  settingsOptions: GrantPlatformSettingsOption[];
  workflowStages: GrantPlatformWorkflowStage[];
}

export function buildGrantPlatformTemplate(): GrantPlatformTemplateDefinition {
  return {
    slug: "grant-platform",
    name: "Grant Platform Workspace",
    category: "Grant Management",
    summary:
      "A Canadian nonprofit grant management workspace modeled on the provided handoff prototype.",
    sections: [
      {
        id: "dashboard",
        title: "Dashboard",
        description:
          "Surface the essentials of the grant portfolio in one place: status, deadlines, and funding health.",
        highlights: [
          "Key metrics for active grants and upcoming deadlines",
          "Funding overview for finance and leadership visibility",
          "A clear path from planning to post-award next steps",
        ],
      },
      {
        id: "pipeline",
        title: "Grant Pipeline",
        description:
          "Track grant opportunities, collaborators, and submission readiness without leaving the workspace.",
        highlights: [
          "Opportunity status and next action tracking",
          "Partner and team collaboration in one view",
          "Submission readiness prompts for each grant",
        ],
      },
      {
        id: "coaching",
        title: "Writing Coaching",
        description:
          "Support teams with stage-based guidance for planning, drafting, and follow-through.",
        highlights: [
          "Planning-stage prompts for strong applications",
          "Common mistakes and coaching reminders",
          "Post-award compliance and reporting checkpoints",
        ],
      },
      {
        id: "reports",
        title: "Reports",
        description:
          "Turn grant activity into board-ready insights for performance, finance, and funder relationships.",
        highlights: [
          "Funder performance summaries and recommendations",
          "Financial insights and budget tracking snapshots",
          "Board-friendly reporting and export-ready data",
        ],
      },
      {
        id: "settings",
        title: "Settings",
        description:
          "Manage the organization details, team permissions, and partner information that sustain the workflow.",
        highlights: [
          "Organization settings and team member access",
          "Partner and collaborator management",
          "Controls for workflow and operational handoffs",
        ],
      },
    ],
    settingsOptions: [
      {
        id: "workflow",
        title: "Application workflow",
        description: "Choose how new requests move from draft to submission and review.",
        details: [
          "Draft and submit controls",
          "Round-based review sequencing",
          "Editable or locked submission states",
        ],
      },
      {
        id: "reporting",
        title: "Reporting cadence",
        description: "Define how the team tracks updates, deliverables, and board-facing summaries.",
        details: [
          "Milestone reminders",
          "Leadership reporting checkpoints",
          "Export-ready summary bundles",
        ],
      },
      {
        id: "team-access",
        title: "Team access",
        description: "Manage who can view, edit, or review active grant work.",
        details: [
          "Role-based visibility",
          "Staff and reviewer permissions",
          "Shared collaboration ownership",
        ],
      },
      {
        id: "notifications",
        title: "Notifications",
        description: "Keep program managers and approvers informed of close dates and status changes.",
        details: [
          "Upcoming deadline reminders",
          "Submission and review alerts",
          "Board and leadership summaries",
        ],
      },
    ],
    workflowStages: [
      {
        id: "intake",
        title: "Intake and eligibility",
        description: "Confirm the organization, round fit, and readiness to proceed.",
        status: "active",
        checklist: ["Round fit confirmed", "Required eligibility details captured", "Organization context reviewed"],
      },
      {
        id: "drafting",
        title: "Drafting and evidence",
        description: "Build the narrative, gather documents, and prepare the package.",
        status: "up-next",
        checklist: ["Narrative drafted", "Budget and impact notes prepared", "Supporting documents attached"],
      },
      {
        id: "submission",
        title: "Submission and tracking",
        description: "Submit the request and monitor delivery against deadlines.",
        status: "up-next",
        checklist: ["Submission sent", "Deadline tracked", "Internal owners notified"],
      },
      {
        id: "review",
        title: "Review and decision",
        description: "Coordinate board, leadership, and program review before the final decision.",
        status: "up-next",
        checklist: ["Review notes collected", "Decision criteria checked", "Next step assigned"],
      },
      {
        id: "decision",
        title: "Decision and award",
        description: "Move from review to approved, declined, or pending follow-up.",
        status: "up-next",
        checklist: ["Outcome recorded", "Award details captured", "Communication sent"],
      },
      {
        id: "reporting",
        title: "Reporting and stewardship",
        description: "Track the work after award and keep reporting ready for funders and leadership.",
        status: "up-next",
        checklist: ["Reporting schedule set", "Impact updates logged", "Board-ready summary prepared"],
      },
    ],
  };
}
