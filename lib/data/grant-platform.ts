import "server-only";

import { createClient } from "@/utils/supabase/server";

export interface GrantPlatformWorkspaceData {
  organizationName: string;
  summary: string;
  sections: Array<{
    id: string;
    title: string;
    description: string;
    highlights: string[];
  }>;
}

export async function getGrantPlatformData(): Promise<GrantPlatformWorkspaceData> {
  const supabase = await createClient();
  const { data: organization, error } = await supabase
    .from("organizations")
    .select("name")
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return {
    organizationName: organization?.name ?? "Your organization",
    summary:
      "A grant management workspace rooted in the handoff prototype and aligned with the platform’s module pattern.",
    sections: [
      {
        id: "dashboard",
        title: "Dashboard",
        description:
          "View active grants, deadlines, and funding health in one place.",
        highlights: [
          "Upcoming deadlines and status snapshots",
          "Board-ready metrics for leadership",
          "Clear next-step guidance for grant teams",
        ],
      },
      {
        id: "pipeline",
        title: "Grant Pipeline",
        description:
          "Track opportunities, responsibilities, and submission readiness.",
        highlights: [
          "Submissions mapped to the current pipeline",
          "Collaborator visibility and handoffs",
          "Submission reminders and readiness cues",
        ],
      },
      {
        id: "coaching",
        title: "Writing Coaching",
        description:
          "Support drafting, planning, and post-award follow-through.",
        highlights: [
          "Stage-specific coaching prompts",
          "Common mistakes and guidance",
          "Compliance checkpoints after approval",
        ],
      },
      {
        id: "reports",
        title: "Reports",
        description:
          "Turn grant activity into reporting and insight for funders, finance, and board leadership.",
        highlights: [
          "Funder performance summaries",
          "Financial insight snapshots",
          "Export-ready reporting structure",
        ],
      },
      {
        id: "settings",
        title: "Settings",
        description:
          "Manage organization, team, and partner details that keep the workflow running smoothly.",
        highlights: [
          "Organization configuration",
          "Team member and permission management",
          "Partner and collaborator upkeep",
        ],
      },
    ],
  };
}
