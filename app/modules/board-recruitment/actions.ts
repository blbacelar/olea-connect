"use server";

import { createHash, randomBytes } from "node:crypto";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireBoardRecruitmentWorkspace } from "@/lib/data/board-recruitment";
import { createAdminClient } from "@/utils/supabase/admin";

const PATH = "/modules/board-recruitment";
const idSchema = z.string().uuid();
const text = (label: string, max = 160) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} is too long.`);
const email = z
  .string()
  .trim()
  .max(160)
  .refine(
    (value) => !value || z.string().email().safeParse(value).success,
    "Enter a valid email address.",
  );
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  .or(z.literal(""))
  .nullable();

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function createSurveyToken() {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

async function queueSurveyInvitation({
  workspace,
  session,
  supabase,
  member,
}: {
  workspace: Record<string, unknown>;
  session: Awaited<
    ReturnType<typeof requireBoardRecruitmentWorkspace>
  >["session"];
  supabase: Awaited<
    ReturnType<typeof requireBoardRecruitmentWorkspace>
  >["supabase"];
  member: { id: string; email: string; full_name: string };
}) {
  const { rawToken, tokenHash } = createSurveyToken();
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const surveyYear = Number(workspace.survey_year);
  const invitationPath = `/modules/board-recruitment/survey/${rawToken}`;

  const { error: invitationError } = await supabase
    .from("board_recruitment_invitations")
    .upsert(
      {
        workspace_id: workspace.id,
        member_id: member.id,
        survey_year: surveyYear,
        token_hash: tokenHash,
        expires_at: expiresAt,
        status: "sent",
        sent_at: new Date().toISOString(),
        responded_at: null,
      },
      { onConflict: "workspace_id,member_id,survey_year" },
    );
  if (invitationError) throw invitationError;

  const { error: eventError } = await supabase
    .from("integration_events")
    .insert({
      event_type: "board_recruitment.survey_invitation",
      aggregate_type: "board_recruitment_invitation",
      aggregate_id: member.id,
      provider: "email",
      payload: {
        recipient_email: member.email,
        organization_name: session.organization.brand.organizationName,
        member_name: member.full_name,
        survey_year: surveyYear,
        invitation_path: invitationPath,
        expires_at: expiresAt,
      },
      idempotency_key: `board-recruitment:${workspace.id}:${member.id}:${surveyYear}:${tokenHash}`,
    });
  if (eventError) {
    // Do not leave the UI claiming that an invitation was sent when the
    // durable email event was rejected. The next attempt should be safe.
    const { error: rollbackError } = await supabase
      .from("board_recruitment_invitations")
      .update({
        status: "pending",
        token_hash: null,
        sent_at: null,
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .eq("workspace_id", workspace.id)
      .eq("member_id", member.id)
      .eq("survey_year", surveyYear);
    if (rollbackError) {
      throw new Error(
        `The invitation could not be queued and its status could not be rolled back: ${rollbackError.message}`,
        { cause: eventError },
      );
    }
    throw eventError;
  }
}

function redirectTab(tab: string): never {
  revalidatePath(PATH);
  redirect(`${PATH}?tab=${tab}&refresh=${Date.now()}`);
}

async function workspaceFrom(formData: FormData) {
  return requireBoardRecruitmentWorkspace(
    idSchema.parse(value(formData, "workspaceId")),
  );
}

const memberSchema = z.object({
  full_name: text("Name"),
  role_title: z.string().trim().max(120),
  member_type: z.enum(["director", "staff"]),
  office: z.enum(["", "chair", "vice", "secretary", "treasurer"]),
  email,
  date_joined: date,
  notes: z.string().trim().max(1000),
});

function parseMember(formData: FormData) {
  return memberSchema.parse({
    full_name: value(formData, "fullName"),
    role_title: value(formData, "roleTitle"),
    member_type: value(formData, "memberType"),
    office:
      value(formData, "office") === "none" ? "" : value(formData, "office"),
    email: value(formData, "email"),
    date_joined: value(formData, "dateJoined") || null,
    notes: value(formData, "notes"),
  });
}

const skillIdsSchema = z
  .array(idSchema)
  .max(200, "Select fewer than 200 skills.")
  .superRefine((skillIds, context) => {
    if (new Set(skillIds).size !== skillIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A skill can only be selected once.",
      });
    }
  });

function parseSkillIds(formData: FormData) {
  return skillIdsSchema.parse(
    formData
      .getAll("skillIds")
      .map((skillId) => String(skillId).trim())
      .filter(Boolean),
  );
}

function assertMemberSkillType(
  memberType: "director" | "staff",
  selectedSkillIds: string[],
) {
  if (memberType === "staff" && selectedSkillIds.length > 0) {
    throw new Error("Only directors can have recruitment skills assigned.");
  }
}

async function replaceMemberSkills({
  workspace,
  supabase,
  memberId,
  selectedSkillIds,
}: {
  workspace: Record<string, unknown>;
  supabase: Awaited<
    ReturnType<typeof requireBoardRecruitmentWorkspace>
  >["supabase"];
  memberId: string;
  selectedSkillIds: string[];
}) {
  const { data: member, error: memberError } = await supabase
    .from("board_recruitment_members")
    .select("id")
    .eq("id", memberId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (memberError) throw memberError;
  if (!member) throw new Error("That member is not in this workspace.");

  const { data: skills, error: skillsError } = await supabase
    .from("board_recruitment_skills")
    .select("id")
    .eq("workspace_id", workspace.id);
  if (skillsError) throw skillsError;

  const workspaceSkillIds = new Set((skills ?? []).map((skill) => skill.id));
  if (selectedSkillIds.some((skillId) => !workspaceSkillIds.has(skillId))) {
    throw new Error("One or more selected skills are not in this workspace.");
  }

  const selected = new Set(selectedSkillIds);
  const rows = (skills ?? [])
    .filter((skill) => selected.has(skill.id))
    .map((skill) => ({
      workspace_id: workspace.id,
      member_id: memberId,
      skill_id: skill.id,
      survey_year: workspace.survey_year,
      updated_at: new Date().toISOString(),
    }));

  const { error: deleteError } = await supabase
    .from("board_recruitment_skill_assignments")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("member_id", memberId)
    .eq("survey_year", workspace.survey_year);
  if (deleteError) throw deleteError;
  if (!rows.length) return;

  const { error } = await supabase
    .from("board_recruitment_skill_assignments")
    .insert(rows);
  if (error) throw error;
}

type MemberSkillAssignmentSnapshot = {
  skill_id: string;
  survey_year: number;
};

async function restoreMemberSkillAssignments({
  workspace,
  supabase,
  memberId,
  snapshot,
}: {
  workspace: Record<string, unknown>;
  supabase: Awaited<
    ReturnType<typeof requireBoardRecruitmentWorkspace>
  >["supabase"];
  memberId: string;
  snapshot: MemberSkillAssignmentSnapshot[];
}) {
  const { error: deleteError } = await supabase
    .from("board_recruitment_skill_assignments")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("member_id", memberId)
    .eq("survey_year", workspace.survey_year);
  if (deleteError) throw deleteError;
  if (!snapshot.length) return;

  const { error: restoreError } = await supabase
    .from("board_recruitment_skill_assignments")
    .insert(
      snapshot.map((assignment) => ({
        workspace_id: workspace.id,
        member_id: memberId,
        skill_id: assignment.skill_id,
        survey_year: assignment.survey_year,
        updated_at: new Date().toISOString(),
      })),
    );
  if (restoreError) throw restoreError;
}

export async function saveRecruitmentSettings(formData: FormData) {
  const { workspace, supabase } = await workspaceFrom(formData);
  const parsed = z
    .object({
      accent_color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, "Use a six-digit hex color."),
      survey_year: z.coerce.number().int().min(2000).max(2100),
      term_length_years: z.coerce.number().int().min(1).max(10),
      max_consecutive_terms: z.coerce.number().int().min(1).max(10),
      max_years_of_service: z.coerce.number().int().min(1).max(80),
      upcoming_agm_year: z.coerce.number().int().min(2000).max(2100),
    })
    .parse({
      accent_color: value(formData, "accentColor"),
      survey_year: value(formData, "surveyYear"),
      term_length_years: value(formData, "termLengthYears"),
      max_consecutive_terms: value(formData, "maxConsecutiveTerms"),
      max_years_of_service: value(formData, "maxYearsOfService"),
      upcoming_agm_year: value(formData, "upcomingAgmYear"),
    });
  const { error } = await supabase
    .from("board_recruitment_workspaces")
    .update(parsed)
    .eq("id", workspace.id);
  if (error) throw error;
  redirectTab("overview");
}

export async function createRecruitmentMember(formData: FormData) {
  const { workspace, supabase } = await workspaceFrom(formData);
  const parsedMember = parseMember(formData);
  const selectedSkillIds = parseSkillIds(formData);
  assertMemberSkillType(parsedMember.member_type, selectedSkillIds);
  const { data: member, error } = await supabase
    .from("board_recruitment_members")
    .insert({ workspace_id: workspace.id, ...parsedMember })
    .select("id")
    .single();
  if (error) throw error;
  try {
    await replaceMemberSkills({
      workspace,
      supabase,
      memberId: member.id,
      selectedSkillIds:
        parsedMember.member_type === "director" ? selectedSkillIds : [],
    });
  } catch (skillsError) {
    const { error: rollbackError } = await supabase
      .from("board_recruitment_members")
      .delete()
      .eq("id", member.id)
      .eq("workspace_id", workspace.id);
    if (rollbackError) {
      throw new Error(
        `The member was created, but its skills could not be saved and the member could not be rolled back: ${rollbackError.message}`,
        { cause: skillsError },
      );
    }
    throw skillsError;
  }
  redirectTab("terms");
}

export async function updateRecruitmentMember(formData: FormData) {
  const { workspace, supabase } = await workspaceFrom(formData);
  const memberId = idSchema.parse(value(formData, "memberId"));
  const parsedMember = parseMember(formData);
  const selectedSkillIds = parseSkillIds(formData);
  assertMemberSkillType(parsedMember.member_type, selectedSkillIds);
  const { data: previousMember, error: previousMemberError } = await supabase
    .from("board_recruitment_members")
    .select(
      "full_name, role_title, member_type, office, email, date_joined, notes",
    )
    .eq("id", memberId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (previousMemberError) throw previousMemberError;
  if (!previousMember) throw new Error("That member is not in this workspace.");
  const { data: previousAssignments, error: previousAssignmentsError } =
    await supabase
      .from("board_recruitment_skill_assignments")
      .select("skill_id, survey_year")
      .eq("workspace_id", workspace.id)
      .eq("member_id", memberId)
      .eq("survey_year", workspace.survey_year);
  if (previousAssignmentsError) throw previousAssignmentsError;
  const { data: updatedMember, error } = await supabase
    .from("board_recruitment_members")
    .update(parsedMember)
    .eq("id", memberId)
    .eq("workspace_id", workspace.id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!updatedMember) throw new Error("That member is not in this workspace.");
  try {
    await replaceMemberSkills({
      workspace,
      supabase,
      memberId,
      selectedSkillIds:
        parsedMember.member_type === "director" ? selectedSkillIds : [],
    });
  } catch (skillsError) {
    try {
      await restoreMemberSkillAssignments({
        workspace,
        supabase,
        memberId,
        snapshot: (previousAssignments ??
          []) as MemberSkillAssignmentSnapshot[],
      });
      const { error: rollbackError } = await supabase
        .from("board_recruitment_members")
        .update(previousMember)
        .eq("id", memberId)
        .eq("workspace_id", workspace.id);
      if (rollbackError) throw rollbackError;
    } catch (rollbackError) {
      throw new Error(
        `The member was updated, but its skills could not be saved and the member could not be rolled back: ${
          rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError)
        }`,
        { cause: skillsError },
      );
    }
    throw skillsError;
  }
  redirectTab("terms");
}

export async function toggleRecruitmentMember(formData: FormData) {
  const { workspace, supabase } = await workspaceFrom(formData);
  const memberId = idSchema.parse(value(formData, "memberId"));
  const active = value(formData, "active") === "true";
  const { error } = await supabase
    .from("board_recruitment_members")
    .update({ active: !active })
    .eq("id", memberId)
    .eq("workspace_id", workspace.id);
  if (error) throw error;
  redirectTab("terms");
}

export async function deleteRecruitmentMember(formData: FormData) {
  const { workspace, supabase } = await workspaceFrom(formData);
  const memberId = idSchema.parse(value(formData, "memberId"));
  const { error } = await supabase
    .from("board_recruitment_members")
    .delete()
    .eq("id", memberId)
    .eq("workspace_id", workspace.id);
  if (error) throw error;
  redirectTab("terms");
}

export async function addRecruitmentSkill(formData: FormData) {
  const { workspace, supabase } = await workspaceFrom(formData);
  const categoryId = idSchema.parse(value(formData, "categoryId"));
  const name = text("Skill name", 140).parse(value(formData, "name"));
  const { error } = await supabase.from("board_recruitment_skills").insert({
    workspace_id: workspace.id,
    category_id: categoryId,
    name,
    is_custom: true,
  });
  if (error?.code === "23505")
    throw new Error("That skill already exists in this workspace.");
  if (error) throw error;
  redirectTab("matrix");
}

export async function deleteRecruitmentSkill(formData: FormData) {
  const { workspace, supabase } = await workspaceFrom(formData);
  const skillId = idSchema.parse(value(formData, "skillId"));
  const { error } = await supabase
    .from("board_recruitment_skills")
    .delete()
    .eq("id", skillId)
    .eq("workspace_id", workspace.id)
    .eq("is_custom", true);
  if (error) throw error;
  redirectTab("matrix");
}

export async function sendRecruitmentInvitation(formData: FormData) {
  const { session, workspace, supabase } = await workspaceFrom(formData);
  const memberId = idSchema.parse(value(formData, "memberId"));
  const { data: member, error: memberError } = await supabase
    .from("board_recruitment_members")
    .select("email, full_name, member_type, active")
    .eq("id", memberId)
    .eq("workspace_id", workspace.id)
    .single();
  if (memberError) throw memberError;
  if (!member.active || member.member_type !== "director")
    throw new Error("Only active directors can receive the skills survey.");
  if (!member.email)
    throw new Error("Add an email address before sending an invitation.");
  const { data: existingInvitation, error: existingInvitationError } =
    await supabase
      .from("board_recruitment_invitations")
      .select("status")
      .eq("workspace_id", workspace.id)
      .eq("member_id", memberId)
      .eq("survey_year", workspace.survey_year)
      .maybeSingle();
  if (existingInvitationError) throw existingInvitationError;
  if (existingInvitation?.status === "responded") {
    throw new Error("This director has already completed the survey.");
  }
  await queueSurveyInvitation({
    workspace,
    session,
    supabase,
    member: { id: memberId, email: member.email, full_name: member.full_name },
  });
  redirectTab("survey");
}

export async function sendRecruitmentInvitations(formData: FormData) {
  const { session, workspace, supabase } = await workspaceFrom(formData);
  const { data: directors, error: memberError } = await supabase
    .from("board_recruitment_members")
    .select("id, email, full_name, member_type, active")
    .eq("workspace_id", workspace.id)
    .eq("member_type", "director")
    .eq("active", true)
    .neq("email", "");
  if (memberError) throw memberError;
  if (!directors?.length)
    throw new Error(
      "No active directors with email addresses are ready for invitation.",
    );
  const { data: existing, error: existingError } = await supabase
    .from("board_recruitment_invitations")
    .select("member_id, status")
    .eq("workspace_id", workspace.id)
    .eq("survey_year", workspace.survey_year);
  if (existingError) throw existingError;
  const invited = new Set((existing ?? []).map((row) => row.member_id));
  const pendingDirectors = directors.filter(
    (member) => !invited.has(member.id),
  );
  if (!pendingDirectors.length) {
    throw new Error(
      "All eligible directors have already been invited or responded.",
    );
  }
  for (const member of pendingDirectors) {
    await queueSurveyInvitation({ workspace, session, supabase, member });
  }
  redirectTab("survey");
}

export async function saveRecruitmentResponse(formData: FormData) {
  const { workspace, supabase } = await workspaceFrom(formData);
  const memberId = idSchema.parse(value(formData, "memberId"));
  const answers = z
    .record(idSchema, z.boolean())
    .parse(JSON.parse(value(formData, "answers")));
  const [
    { data: member, error: memberError },
    { data: skills, error: skillsError },
  ] = await Promise.all([
    supabase
      .from("board_recruitment_members")
      .select("id, member_type, active")
      .eq("id", memberId)
      .eq("workspace_id", workspace.id)
      .maybeSingle(),
    supabase
      .from("board_recruitment_skills")
      .select("id")
      .eq("workspace_id", workspace.id),
  ]);
  if (memberError) throw memberError;
  if (skillsError) throw skillsError;
  if (!member || member.member_type !== "director" || !member.active) {
    throw new Error("Only active directors can submit a survey response.");
  }
  const validSkillIds = new Set((skills ?? []).map((skill) => skill.id));
  if (
    Object.keys(answers).some((skillId) => !validSkillIds.has(skillId)) ||
    Object.keys(answers).length !== validSkillIds.size
  ) {
    throw new Error("The survey response is incomplete or invalid.");
  }
  const rows = Object.entries(answers).map(([skillId, hasSkill]) => ({
    workspace_id: workspace.id,
    member_id: memberId,
    skill_id: skillId,
    survey_year: workspace.survey_year,
    has_skill: hasSkill,
    updated_at: new Date().toISOString(),
  }));
  const { error: responseError } = await supabase
    .from("board_recruitment_responses")
    .upsert(rows, {
      onConflict: "workspace_id,member_id,skill_id,survey_year",
    });
  if (responseError) throw responseError;
  const { error: invitationError } = await supabase
    .from("board_recruitment_invitations")
    .upsert(
      {
        workspace_id: workspace.id,
        member_id: memberId,
        survey_year: workspace.survey_year,
        status: "responded",
        responded_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,member_id,survey_year" },
    );
  if (invitationError) throw invitationError;
  redirectTab("survey");
}

export async function submitPublicRecruitmentResponse(formData: FormData) {
  const token = text("Survey token", 200).parse(value(formData, "token"));
  const answers = Object.fromEntries(
    [...formData.entries()]
      .filter(([key]) => key.startsWith("skill-"))
      .map(([key, answer]) => [
        idSchema.parse(key.slice("skill-".length)),
        answer === "true",
      ]),
  );
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const supabase = createAdminClient();
  const { data: invitation, error: invitationError } = await supabase
    .from("board_recruitment_invitations")
    .select("id, workspace_id, member_id, survey_year, expires_at, status")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (invitationError) throw invitationError;
  if (!invitation || new Date(invitation.expires_at) <= new Date())
    throw new Error("This survey link has expired.");
  if (invitation.status === "responded")
    throw new Error("This survey has already been submitted.");

  const { data: skills, error: skillsError } = await supabase
    .from("board_recruitment_skills")
    .select("id")
    .eq("workspace_id", invitation.workspace_id);
  if (skillsError) throw skillsError;
  const skillIds = new Set((skills ?? []).map((skill) => skill.id));
  if (
    Object.keys(answers).length !== skillIds.size ||
    Object.keys(answers).some((skillId) => !skillIds.has(skillId))
  ) {
    throw new Error("The survey response is incomplete or invalid.");
  }

  const { error: responseError } = await supabase.rpc(
    "submit_board_recruitment_response",
    {
      p_token_hash: tokenHash,
      p_answers: answers,
    },
  );
  if (responseError) throw responseError;
  redirect(`/modules/board-recruitment/survey/${token}?submitted=1`);
}

export async function createRecruitmentCommittee(formData: FormData) {
  const { workspace, supabase } = await workspaceFrom(formData);
  const name = text("Committee name", 120).parse(value(formData, "name"));
  const { error } = await supabase
    .from("board_recruitment_committees")
    .insert({ workspace_id: workspace.id, name });
  if (error?.code === "23505")
    throw new Error("That committee already exists.");
  if (error) throw error;
  redirectTab("committees");
}

export async function updateRecruitmentCommittee(formData: FormData) {
  const { workspace, supabase } = await workspaceFrom(formData);
  const committeeId = idSchema.parse(value(formData, "committeeId"));
  const name = text("Committee name", 120).parse(value(formData, "name"));
  const { error } = await supabase
    .from("board_recruitment_committees")
    .update({ name })
    .eq("id", committeeId)
    .eq("workspace_id", workspace.id);
  if (error) throw error;
  redirectTab("committees");
}

export async function deleteRecruitmentCommittee(formData: FormData) {
  const { workspace, supabase } = await workspaceFrom(formData);
  const committeeId = idSchema.parse(value(formData, "committeeId"));
  const { error } = await supabase
    .from("board_recruitment_committees")
    .delete()
    .eq("id", committeeId)
    .eq("workspace_id", workspace.id);
  if (error) throw error;
  redirectTab("committees");
}

export async function toggleCommitteeMember(formData: FormData) {
  const { workspace, supabase } = await workspaceFrom(formData);
  const committeeId = idSchema.parse(value(formData, "committeeId"));
  const memberId = idSchema.parse(value(formData, "memberId"));
  const { data: existing, error: readError } = await supabase
    .from("board_recruitment_committee_members")
    .select("committee_id")
    .eq("committee_id", committeeId)
    .eq("member_id", memberId)
    .maybeSingle();
  if (readError) throw readError;
  const { error } = existing
    ? await supabase
        .from("board_recruitment_committee_members")
        .delete()
        .eq("committee_id", committeeId)
        .eq("member_id", memberId)
    : await supabase
        .from("board_recruitment_committee_members")
        .insert({ committee_id: committeeId, member_id: memberId });
  if (error) throw error;
  redirectTab("committees");
}

export async function setCommitteeChair(formData: FormData) {
  const { workspace, supabase } = await workspaceFrom(formData);
  const committeeId = idSchema.parse(value(formData, "committeeId"));
  const memberId = idSchema.parse(value(formData, "memberId"));
  const { data: committee, error: committeeError } = await supabase
    .from("board_recruitment_committee_members")
    .select("member_id")
    .eq("committee_id", committeeId);
  if (committeeError) throw committeeError;
  if (!(committee ?? []).some((row) => row.member_id === memberId))
    throw new Error("A chair must be a committee member.");
  const { error: clearError } = await supabase
    .from("board_recruitment_committee_members")
    .update({ is_chair: false })
    .eq("committee_id", committeeId);
  if (clearError) throw clearError;
  const { error } = await supabase
    .from("board_recruitment_committee_members")
    .update({ is_chair: true })
    .eq("committee_id", committeeId)
    .eq("member_id", memberId);
  if (error) throw error;
  redirectTab("committees");
}

export { redirectTab };
