import "server-only";

import { annualCompensationSchema, annualGeneralSchema, annualReviewDefaults,
  annualReviewRoleMatrix, calculateAnnualReview, type AnnualReviewRole } from "@/lib/ed-review/annual-document";
import { getGovernanceGrowthContext } from "@/lib/governance-growth/access";

export class AnnualDocumentAccessError extends Error {}

export async function getAnnualDocumentContext() {
  const context = await getGovernanceGrowthContext("ed_review");
  if (!context.hasAccess) throw new AnnualDocumentAccessError("ED Review is not included in this membership.");
  const { data: cycle, error: cycleError } = await context.admin.from("ed_review_cycles")
    .select("id, organization_id, title, review_year").eq("organization_id", context.session.organization.id)
    .neq("status", "archived").order("review_year", { ascending: false }).limit(1).maybeSingle();
  if (cycleError) throw cycleError;
  if (!cycle) throw new AnnualDocumentAccessError("Start an ED Review cycle before opening the annual document.");
  const [{ data: access, error: accessError }, { data: reviewers, error: reviewersError }] = await Promise.all([
    context.admin.from("ed_review_annual_access").select("role").eq("cycle_id", cycle.id)
      .eq("user_id", context.session.member.id).maybeSingle(),
    context.admin.from("ed_review_reviewer_assignments").select("role")
      .eq("cycle_id", cycle.id).eq("user_id", context.session.member.id),
  ]);
  if (accessError) throw accessError;
  if (reviewersError) throw reviewersError;
  const role = (context.session.member.membershipRole === "owner" ? "full" : access?.role ?? (
    (reviewers ?? []).some((item) => item.role === "board_chair") ? "chair" :
      (reviewers ?? []).some((item) => item.role === "hr_reviewer") ? "hr" :
        context.session.member.membershipRole === "admin" ? "admin" : null)) as AnnualReviewRole | null;
  if (!role) throw new AnnualDocumentAccessError("You do not have access to this annual review document.");
  return { ...context, cycle, role };
}

export async function getAnnualDocumentData(options: { previewRole?: "cfo" } = {}) {
  const context = await getAnnualDocumentContext();
  const previewing = options.previewRole === "cfo" &&
    (context.role === "chair" || context.role === "full");
  const role: AnnualReviewRole = previewing ? "cfo" : context.role;
  const defaults = annualReviewDefaults();
  const [{ data: generalRow, error: generalError }, { data: compRow, error: compError }] = await Promise.all([
    context.admin.from("ed_review_annual_general").select("data, revision")
      .eq("cycle_id", context.cycle.id).maybeSingle(),
    annualReviewRoleMatrix[role].comp !== "hide" || annualReviewRoleMatrix[role].future !== "hide"
      ? context.admin.from("ed_review_annual_compensation").select("data, revision")
        .eq("cycle_id", context.cycle.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (generalError) throw generalError;
  if (compError) throw compError;
  const general = generalRow ? annualGeneralSchema.parse(generalRow.data) : defaults.general;
  const compensation = compRow ? annualCompensationSchema.parse(compRow.data) : defaults.compensation;
  const modes = annualReviewRoleMatrix[role];
  let accessAssignments: Array<{ userId: string; role: string; name: string }> = [];
  let availableMembers: Array<{ userId: string; name: string }> = [];
  if (role === "chair" || role === "full") {
    const [{ data: assignments, error: assignmentError }, { data: members, error: memberError }] = await Promise.all([
      context.admin.from("ed_review_annual_access").select("user_id, role")
        .eq("cycle_id", context.cycle.id).eq("organization_id", context.session.organization.id),
      context.admin.from("organization_members").select("user_id")
        .eq("organization_id", context.session.organization.id).eq("status", "active"),
    ]);
    if (assignmentError) throw assignmentError;
    if (memberError) throw memberError;
    const ids = [...new Set((members ?? []).map((item) => item.user_id))];
    const { data: profiles, error: profileError } = ids.length
      ? await context.admin.from("profiles").select("id, full_name").in("id", ids)
      : { data: [], error: null };
    if (profileError) throw profileError;
    const names = new Map((profiles ?? []).map((item) => [item.id, item.full_name || "Workspace member"]));
    availableMembers = ids.map((userId) => ({ userId, name: names.get(userId) ?? "Workspace member" }));
    accessAssignments = (assignments ?? []).map((item) => ({ userId: item.user_id, role: item.role,
      name: names.get(item.user_id) ?? "Workspace member" }));
  }
  const view = {
    cover: modes.cover === "hide" ? null : general.cover,
    competencies: modes.self !== "hide" || modes.chair !== "hide" || modes.summary !== "hide"
      ? general.competencies.map((item) => ({ ...item,
        selfEvidence: modes.self === "hide" ? "" : item.selfEvidence,
        chairEvidence: modes.chair === "hide" ? "" : item.chairEvidence,
        selfRating: modes.self === "hide" && modes.summary === "hide" ? null : item.selfRating,
        chairRating: modes.chair === "hide" && modes.summary === "hide" ? null : item.chairRating,
      })) : [],
    selfNarrative: modes.self === "hide" ? null : general.selfNarrative,
    chairNarrative: modes.chair === "hide" ? null : general.chairNarrative,
    development: modes.dev === "hide" ? null : general.development,
    signoff: modes.signoff === "hide" ? null : general.signoff,
    compensation: modes.comp === "hide" ? null : compensation,
    future: modes.future === "hide" ? null : compensation.future,
  };
  const calculation = calculateAnnualReview(general, modes.comp === "hide" ? null : compensation);
  const summary = role === "cfo" ? { ...calculation, selfScore: null, gap: null,
    gaps: [], effectiveWeights: [], weightTotal: 0, anyWeightSet: false,
    weightWarning: false, developmentCostCents: 0 } :
    role === "admin" ? { ...calculation, selfScore: null, chairScore: null,
      gap: null, gaps: [], effectiveWeights: [], weightTotal: 0, anyWeightSet: false,
      weightWarning: false, activeBand: null, recommendedSalaryCents: null,
    milestoneTotalCents: null, developmentCostCents: 0 } :
    modes.comp === "hide" ? { ...calculation, activeBand: null,
      recommendedSalaryCents: null, milestoneTotalCents: null } : calculation;
  return { cycle: context.cycle, role, previewing, modes, view,
    accessAssignments, availableMembers,
    generalRevision: generalRow?.revision ?? 0, compensationRevision: compRow?.revision ?? 0,
    summary };
}
