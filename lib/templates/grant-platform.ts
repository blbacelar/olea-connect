export interface GrantPlatformTemplateSection {
  id: string;
  title: string;
  description: string;
  highlights: string[];
}

export interface GrantPlatformTemplateDefinition {
  slug: string;
  name: string;
  category: string;
  summary: string;
  sections: GrantPlatformTemplateSection[];
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
  };
}
