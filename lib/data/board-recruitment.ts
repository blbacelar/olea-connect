import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";
import { requireMemberContext } from "@/lib/data/member-context";
import {
  defaultCommittees,
  recruitmentCategories,
} from "@/lib/board-recruitment/domain";
import type {
  InvitationStatus,
  RecruitmentCommittee,
  RecruitmentData,
  RecruitmentInvitation,
  RecruitmentMember,
  RecruitmentResponse,
  RecruitmentSkill,
  RecruitmentWorkspace,
} from "@/lib/board-recruitment/types";

type Row = Record<string, unknown>;

async function ensureWorkspace() {
  const session = await requireMemberContext();
  if (!["owner", "admin"].includes(session.member.membershipRole)) {
    throw new Error(
      "Only organization owners and administrators can access Board Recruitment.",
    );
  }
  const supabase = createAdminClient();
  const organizationId = session.organization.id;

  const { data: existing, error: existingError } = await supabase
    .from("board_recruitment_workspaces")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle<Row>();
  if (existingError) throw existingError;

  let workspace = existing;
  if (!workspace) {
    const { data: created, error: createError } = await supabase
      .from("board_recruitment_workspaces")
      .insert({
        organization_id: organizationId,
        created_by: session.member.id,
        survey_year: new Date().getFullYear(),
        upcoming_agm_year: new Date().getFullYear(),
      })
      .select("*")
      .single<Row>();
    if (createError && createError.code !== "23505") {
      throw createError;
    }

    if (created) {
      workspace = created;
    } else {
      // A concurrent request, a connection retry, or a representation response
      // can leave the insert without a row even though the write succeeded.
      const { data: recoveredWorkspace, error: recoveryError } = await supabase
        .from("board_recruitment_workspaces")
        .select("*")
        .eq("organization_id", organizationId)
        .single<Row>();
      if (recoveryError) {
        throw new Error(
          `The recruitment workspace could not be created: ${
            createError?.message ?? recoveryError.message
          }`,
        );
      }
      workspace = recoveredWorkspace;
    }
  }

  const { count: categoryCount, error: categoryCountError } = await supabase
    .from("board_recruitment_skill_categories")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id as string);
  if (categoryCountError) throw categoryCountError;

  if (!categoryCount) {
    const categories = recruitmentCategories.map((category, index) => ({
      workspace_id: workspace?.id,
      name: category.name,
      sort_order: index + 1,
    }));
    const { data: categoryRows, error: categoryError } = await supabase
      .from("board_recruitment_skill_categories")
      .upsert(categories, { onConflict: "workspace_id,name" })
      .select("id, name");
    if (categoryError) throw categoryError;

    const skills = (categoryRows ?? []).flatMap((category) => {
      const source = recruitmentCategories.find(
        (item) => item.name === category.name,
      );
      return (source?.skills ?? []).map((name, index) => ({
        workspace_id: workspace?.id,
        category_id: category.id,
        name,
        sort_order: index + 1,
      }));
    });
    const { error: skillError } = await supabase
      .from("board_recruitment_skills")
      .upsert(skills, { onConflict: "workspace_id,name" });
    if (skillError) throw skillError;
  }

  const { count: committeeCount, error: committeeCountError } = await supabase
    .from("board_recruitment_committees")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id as string);
  if (committeeCountError) throw committeeCountError;
  if (!committeeCount) {
    const { error } = await supabase
      .from("board_recruitment_committees")
      .upsert(
        defaultCommittees.map((name, index) => ({
          workspace_id: workspace?.id,
          name,
          sort_order: index + 1,
        })),
        { onConflict: "workspace_id,name" },
      );
    if (error) throw error;
  }

  return { session, workspace: workspace as Row, supabase };
}

function mapWorkspace(
  row: Row,
  organizationName: string,
): RecruitmentWorkspace {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    organizationName,
    accentColor: String(row.accent_color),
    surveyYear: Number(row.survey_year),
    termLengthYears: Number(row.term_length_years),
    maxConsecutiveTerms: Number(row.max_consecutive_terms),
    maxYearsOfService: Number(row.max_years_of_service),
    upcomingAgmYear: Number(row.upcoming_agm_year),
  };
}

export async function getBoardRecruitmentData(): Promise<RecruitmentData> {
  const { session, workspace, supabase } = await ensureWorkspace();
  const workspaceId = String(workspace.id);
  const [
    membersResult,
    categoriesResult,
    skillsResult,
    invitationResult,
    assignmentResult,
    responseResult,
    committeesResult,
    committeeMembersResult,
  ] = await Promise.all([
    supabase
      .from("board_recruitment_members")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at"),
    supabase
      .from("board_recruitment_skill_categories")
      .select("id, name, sort_order")
      .eq("workspace_id", workspaceId)
      .order("sort_order"),
    supabase
      .from("board_recruitment_skills")
      .select("id, category_id, name, is_custom, sort_order")
      .eq("workspace_id", workspaceId)
      .order("sort_order"),
    supabase
      .from("board_recruitment_invitations")
      .select("id, member_id, status, survey_year")
      .eq("workspace_id", workspaceId)
      .eq("survey_year", Number(workspace.survey_year)),
    supabase
      .from("board_recruitment_skill_assignments")
      .select("member_id, skill_id")
      .eq("workspace_id", workspaceId)
      .eq("survey_year", Number(workspace.survey_year)),
    supabase
      .from("board_recruitment_responses")
      .select("member_id, skill_id, has_skill")
      .eq("workspace_id", workspaceId)
      .eq("survey_year", Number(workspace.survey_year)),
    supabase
      .from("board_recruitment_committees")
      .select("id, name, sort_order")
      .eq("workspace_id", workspaceId)
      .order("sort_order"),
    supabase
      .from("board_recruitment_committee_members")
      .select("committee_id, member_id, is_chair"),
  ]);
  for (const result of [
    membersResult,
    categoriesResult,
    skillsResult,
    invitationResult,
    assignmentResult,
    responseResult,
    committeesResult,
    committeeMembersResult,
  ]) {
    if (result.error) throw result.error;
  }

  const categories = (categoriesResult.data ?? []) as Row[];
  const categoryById = new Map(
    categories.map((category) => [String(category.id), String(category.name)]),
  );
  const members: RecruitmentMember[] = (
    (membersResult.data ?? []) as Row[]
  ).map((member) => ({
    id: String(member.id),
    fullName: String(member.full_name),
    roleTitle: String(member.role_title ?? ""),
    memberType: member.member_type === "staff" ? "staff" : "director",
    office: String(member.office ?? "") as RecruitmentMember["office"],
    email: String(member.email ?? ""),
    dateJoined: member.date_joined ? String(member.date_joined) : null,
    active: Boolean(member.active),
    notes: String(member.notes ?? ""),
  }));
  const skills: RecruitmentSkill[] = ((skillsResult.data ?? []) as Row[]).map(
    (skill) => ({
      id: String(skill.id),
      categoryId: String(skill.category_id),
      categoryName: categoryById.get(String(skill.category_id)) ?? "Other",
      name: String(skill.name),
      isCustom: Boolean(skill.is_custom),
      sortOrder: Number(skill.sort_order),
    }),
  );
  const invitations: RecruitmentInvitation[] = (
    (invitationResult.data ?? []) as Row[]
  ).map((invitation) => ({
    id: String(invitation.id),
    memberId: String(invitation.member_id),
    status: (invitation.status as InvitationStatus) ?? "pending",
    surveyYear: Number(invitation.survey_year),
    expiresAt: invitation.expires_at ? String(invitation.expires_at) : null,
  }));
  const responses: RecruitmentResponse[] = (
    (responseResult.data ?? []) as Row[]
  ).map((response) => ({
    memberId: String(response.member_id),
    skillId: String(response.skill_id),
    hasSkill: Boolean(response.has_skill),
  }));
  const skillAssignments: RecruitmentResponse[] = (
    (assignmentResult.data ?? []) as Row[]
  ).map((assignment) => ({
    memberId: String(assignment.member_id),
    skillId: String(assignment.skill_id),
    hasSkill: true,
  }));
  const committeeMembers = (committeeMembersResult.data ?? []) as Row[];
  const committees: RecruitmentCommittee[] = (
    (committeesResult.data ?? []) as Row[]
  ).map((committee) => {
    const assignments = committeeMembers.filter(
      (item) => String(item.committee_id) === String(committee.id),
    );
    return {
      id: String(committee.id),
      name: String(committee.name),
      sortOrder: Number(committee.sort_order),
      memberIds: assignments.map((item) => String(item.member_id)),
      chairId: assignments.find((item) => Boolean(item.is_chair))?.member_id
        ? String(assignments.find((item) => Boolean(item.is_chair))?.member_id)
        : null,
    };
  });

  return {
    workspace: mapWorkspace(
      workspace,
      session.organization.brand.organizationName,
    ),
    members,
    skills,
    invitations,
    skillAssignments,
    responses,
    committees,
  };
}

export async function requireBoardRecruitmentWorkspace(workspaceId: string) {
  const { session, workspace, supabase } = await ensureWorkspace();
  if (String(workspace.id) !== workspaceId)
    throw new Error("This recruitment workspace is invalid.");
  return { session, workspace, supabase };
}
