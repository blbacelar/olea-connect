export type GrantPlatformApplicationActionState = {
  canEdit: boolean;
  canReview: boolean;
  canWithdraw: boolean;
};

export type GrantPlatformPipelineSnapshot = {
  stage: string;
  milestone: string;
  urgency: "upcoming" | "active" | "urgent";
};

export type GrantPlatformCollaborationChecklistItem = {
  title: string;
  detail: string;
};

export function getGrantPlatformCollaborationNote(value?: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidateKeys = ["note", "value", "text", "collaborationNote", "collaboration_note"];
    for (const key of candidateKeys) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
  }
  return null;
}

export function normalizeGrantPlatformRoundStatus(status?: string | null) {
  switch ((status ?? "").trim().toLowerCase()) {
    case "planning":
    case "planned":
    case "draft":
      return "draft";
    case "in_progress":
    case "in-progress":
    case "in progress":
      return "upcoming";
    case "applied":
      return "open";
    case "approved":
      return "awarded";
    case "declined":
      return "closed";
    default:
      return "draft";
  }
}

export function buildGrantPlatformApplicationStatusUpdate(status: string, note?: string | null) {
  const normalizedStatus = (status ?? "").trim().toLowerCase();
  const cleanedNote = getGrantPlatformCollaborationNote(note) ?? null;
  const updates: Record<string, string | null> = {
    collaboration_note: cleanedNote,
    status: normalizedStatus,
  };

  if (normalizedStatus === "draft") {
    updates.submitted_at = null;
    updates.withdrawn_at = null;
  } else {
    updates.submitted_at = new Date().toISOString();
    if (normalizedStatus === "withdrawn") {
      updates.withdrawn_at = new Date().toISOString();
    } else {
      updates.withdrawn_at = null;
    }
  }

  return { status: normalizedStatus, updates };
}

export function getGrantPlatformApplicationActionState(
  status?: string | null,
): GrantPlatformApplicationActionState {
  switch (status) {
    case "draft":
      return { canEdit: true, canReview: false, canWithdraw: true };
    case "submitted":
    case "in_review":
    case "shortlisted":
      return { canEdit: false, canReview: true, canWithdraw: true };
    case "approved":
    case "declined":
    case "withdrawn":
    default:
      return { canEdit: false, canReview: false, canWithdraw: false };
  }
}

export function getGrantPlatformPipelineSnapshot(
  status?: string | null,
  deadline?: string | null,
): GrantPlatformPipelineSnapshot {
  const isOverdue = deadline ? new Date(deadline).getTime() < Date.now() : false;

  switch (status) {
    case "draft":
      return {
        milestone: "Finalize evidence and refine the narrative package.",
        stage: "Intake",
        urgency: "upcoming",
      };
    case "submitted":
      return {
        milestone: "Prepare the review packet and confirm the decision checkpoint.",
        stage: "Review",
        urgency: isOverdue ? "urgent" : "active",
      };
    case "in_review":
    case "shortlisted":
      return {
        milestone: "Collect stakeholder feedback and prepare the next decision point.",
        stage: "Review",
        urgency: "active",
      };
    case "approved":
      return {
        milestone: "Kick off reporting and delivery milestones for the award.",
        stage: "Delivery",
        urgency: "active",
      };
    case "declined":
      return {
        milestone: "Capture learnings and revisit fit for the next opportunity.",
        stage: "Learning",
        urgency: "upcoming",
      };
    case "withdrawn":
      return {
        milestone: "Archive the request and note the decision trail.",
        stage: "Closed",
        urgency: "upcoming",
      };
    default:
      return {
        milestone: "Create the first draft and start collecting evidence.",
        stage: "Planning",
        urgency: "upcoming",
      };
  }
}

export function getGrantPlatformCollaborationChecklist(
  status?: string | null,
  deadline?: string | null,
): GrantPlatformCollaborationChecklistItem[] {
  const isUrgent = deadline ? new Date(deadline).getTime() < Date.now() : false;

  switch (status) {
    case "draft":
      return [
        {
          title: "Evidence checklist",
          detail: "Confirm the narrative, budget, and supporting documents are ready.",
        },
        {
          title: "Internal review",
          detail: "Share the draft with program staff before submission.",
        },
        {
          title: "Timeline check",
          detail: isUrgent ? "The deadline is already past due; escalate quickly." : "Keep the deadline visible for the full team.",
        },
      ];
    case "submitted":
    case "in_review":
    case "shortlisted":
      return [
        {
          title: "Decision prep",
          detail: "Prepare the board-ready update and reviewer notes.",
        },
        {
          title: "Stakeholder follow-up",
          detail: "Confirm who owns the final review and next response.",
        },
        {
          title: "Deadline watch",
          detail: isUrgent ? "The response window is urgent; prioritize follow-up." : "Keep the review window on the team calendar.",
        },
      ];
    case "approved":
      return [
        {
          title: "Delivery kickoff",
          detail: "Set the first reporting milestone and delivery owner.",
        },
        {
          title: "Impact tracking",
          detail: "Collect the first outcome update for the funder and leadership.",
        },
        {
          title: "Next review",
          detail: "Keep the award timeline visible for the full team.",
        },
      ];
    default:
      return [
        {
          title: "Starter checklist",
          detail: "Create the first action item and owner for the grant team.",
        },
        {
          title: "Communication",
          detail: "Share the current status with the people involved in delivery.",
        },
        {
          title: "Next checkpoint",
          detail: "Set the next review point before the next milestone begins.",
        },
      ];
  }
}
