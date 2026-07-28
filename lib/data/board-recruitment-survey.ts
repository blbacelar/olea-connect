import "server-only";

import { createHash } from "node:crypto";

import { createAdminClient } from "@/utils/supabase/admin";
import type {
  PublicRecruitmentSurvey,
  RecruitmentResponse,
  RecruitmentSkill,
} from "@/lib/board-recruitment/types";

export async function getPublicRecruitmentSurvey(
  token: string,
): Promise<PublicRecruitmentSurvey | null> {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const supabase = createAdminClient();
  const { data: invitation, error: invitationError } = await supabase
    .from("board_recruitment_invitations")
    .select("id, workspace_id, member_id, survey_year, expires_at, status")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (invitationError) throw invitationError;
  if (!invitation || new Date(invitation.expires_at) <= new Date()) return null;

  const [
    workspaceResult,
    memberResult,
    categoriesResult,
    skillsResult,
    responsesResult,
  ] = await Promise.all([
    supabase
      .from("board_recruitment_workspaces")
      .select("organization_id")
      .eq("id", invitation.workspace_id)
      .single(),
    supabase
      .from("board_recruitment_members")
      .select("full_name, member_type, active")
      .eq("id", invitation.member_id)
      .eq("workspace_id", invitation.workspace_id)
      .single(),
    supabase
      .from("board_recruitment_skill_categories")
      .select("id, name")
      .eq("workspace_id", invitation.workspace_id),
    supabase
      .from("board_recruitment_skills")
      .select("id, category_id, name, is_custom, sort_order")
      .eq("workspace_id", invitation.workspace_id)
      .order("sort_order"),
    supabase
      .from("board_recruitment_responses")
      .select("member_id, skill_id, has_skill")
      .eq("workspace_id", invitation.workspace_id)
      .eq("member_id", invitation.member_id)
      .eq("survey_year", invitation.survey_year),
  ]);
  for (const result of [
    workspaceResult,
    memberResult,
    categoriesResult,
    skillsResult,
    responsesResult,
  ]) {
    if (result.error) throw result.error;
  }
  if (!workspaceResult.data || !memberResult.data) return null;
  if (
    !memberResult.data?.active ||
    memberResult.data.member_type !== "director"
  )
    return null;

  const categoryNames = new Map(
    (categoriesResult.data ?? []).map((category) => [
      category.id,
      category.name,
    ]),
  );
  const skills: RecruitmentSkill[] = (skillsResult.data ?? []).map((skill) => ({
    id: skill.id,
    categoryId: skill.category_id,
    categoryName: categoryNames.get(skill.category_id) ?? "Other",
    name: skill.name,
    isCustom: skill.is_custom,
    sortOrder: skill.sort_order,
  }));
  const responses: RecruitmentResponse[] = (responsesResult.data ?? []).map(
    (response) => ({
      memberId: response.member_id,
      skillId: response.skill_id,
      hasSkill: response.has_skill,
    }),
  );
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", workspaceResult.data.organization_id)
    .single();
  if (organizationError) throw organizationError;

  return {
    token,
    organizationName: organization.name,
    surveyYear: invitation.survey_year,
    memberName: memberResult.data.full_name,
    skills,
    responses,
    expiresAt: invitation.expires_at,
    submitted: invitation.status === "responded",
  };
}
