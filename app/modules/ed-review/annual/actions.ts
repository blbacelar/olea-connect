"use server";

import * as z from "zod";

import { getAnnualDocumentContext } from "@/lib/data/ed-annual-document";
import { annualCompetencySchema, annualCompensationSchema, annualGeneralSchema,
  annualReviewDefaults, annualReviewRoleMatrix, type AnnualCompetency,
  type AnnualGeneral, type AnnualReviewSection } from "@/lib/ed-review/annual-document";

const writableSection = z.enum(["cover", "self", "chair", "dev", "signoff", "comp", "future"]);
const selfInputSchema = z.object({
  competencies: z.array(annualCompetencySchema.omit({ chairRating: true, chairEvidence: true })).min(1).max(100),
  narrative: annualGeneralSchema.shape.selfNarrative,
}).strict();
const chairInputSchema = z.object({
  ratings: z.array(annualCompetencySchema.pick({ id: true, chairRating: true, chairEvidence: true })).max(100),
  narrative: annualGeneralSchema.shape.chairNarrative,
}).strict();

export type AnnualSaveResult = { status: "success" | "conflict" | "error"; revision: number; message: string };

function nextGeneral(current: AnnualGeneral, section: AnnualReviewSection, data: unknown): AnnualGeneral {
  if (section === "cover") return { ...current, cover: annualGeneralSchema.shape.cover.parse(data) };
  if (section === "dev") return { ...current, development: annualGeneralSchema.shape.development.parse(data) };
  if (section === "signoff") return { ...current, signoff: annualGeneralSchema.shape.signoff.parse(data) };
  if (section === "self") {
    const parsed = selfInputSchema.parse(data);
    const existing = new Map(current.competencies.map((item) => [item.id, item]));
    return { ...current, competencies: parsed.competencies.map((item): AnnualCompetency => ({ ...item,
      chairRating: existing.get(item.id)?.chairRating ?? null,
      chairEvidence: existing.get(item.id)?.chairEvidence ?? "",
    })), selfNarrative: parsed.narrative };
  }
  if (section === "chair") {
    const parsed = chairInputSchema.parse(data);
    const ratings = new Map(parsed.ratings.map((item) => [item.id, item]));
    if (ratings.size !== parsed.ratings.length ||
      [...ratings.keys()].some((id) => !current.competencies.some((item) => item.id === id))) {
      throw new Error("The competency list changed. Reload before saving Chair ratings.");
    }
    return { ...current, competencies: current.competencies.map((item) => ({ ...item,
      chairRating: ratings.get(item.id)?.chairRating ?? item.chairRating,
      chairEvidence: ratings.get(item.id)?.chairEvidence ?? item.chairEvidence,
    })), chairNarrative: parsed.narrative };
  }
  throw new Error("This section cannot be saved to the general review.");
}

export async function saveAnnualReviewSection(input: {
  section: AnnualReviewSection;
  revision: number;
  data: unknown;
}): Promise<AnnualSaveResult> {
  const revision = z.number().int().min(0).parse(input.revision);
  const section = writableSection.parse(input.section);
  const context = await getAnnualDocumentContext();
  if (annualReviewRoleMatrix[context.role][section] !== "edit") {
    throw new Error("Your assigned role cannot edit this section.");
  }
  const table = section === "comp" || section === "future"
    ? "ed_review_annual_compensation" : "ed_review_annual_general";
  const { data: row, error: readError } = await context.admin.from(table)
    .select("data, revision").eq("cycle_id", context.cycle.id).maybeSingle();
  if (readError) throw readError;
  if ((row?.revision ?? 0) !== revision) return {
    status: "conflict", revision, message: "A newer version was saved. Reload before editing this section.",
  };
  const defaults = annualReviewDefaults();
  const nextData = table === "ed_review_annual_general"
    ? annualGeneralSchema.parse(nextGeneral(row ? annualGeneralSchema.parse(row.data) : defaults.general,
      section, input.data))
    : section === "comp" ? annualCompensationSchema.parse(input.data)
      : annualCompensationSchema.parse({ ...(row ? annualCompensationSchema.parse(row.data) : defaults.compensation),
        ...z.object({ futureRemunerationEnabled: z.boolean(),
          future: annualCompensationSchema.shape.future }).strict().parse(input.data) });
  const fields = { data: nextData, updated_at: new Date().toISOString(), updated_by: context.session.member.id };
  if (revision === 0) {
    const { data, error } = await context.admin.from(table).insert({ ...fields,
      cycle_id: context.cycle.id, organization_id: context.session.organization.id, revision: 1 })
      .select("revision").maybeSingle();
    if (error?.code === "23505") return { status: "conflict", revision,
      message: "Another editor started this document. Reload before saving." };
    if (error) throw error;
    return { status: "success", revision: data!.revision, message: "Section saved." };
  }
  const { data, error } = await context.admin.from(table).update({ ...fields, revision: revision + 1 })
    .eq("cycle_id", context.cycle.id).eq("organization_id", context.session.organization.id)
    .eq("revision", revision).select("revision").maybeSingle();
  if (error) throw error;
  if (!data) return { status: "conflict", revision, message: "A newer version was saved. Reload before editing this section." };
  return { status: "success", revision: data.revision, message: "Section saved." };
}

export async function assignAnnualReviewRole(input: { userId: string; role: "ed" | "admin" | "hr" | "cfo" | "full" }) {
  const context = await getAnnualDocumentContext();
  if (context.role !== "chair" && context.role !== "full") {
    throw new Error("Only the Board Chair can assign annual document access.");
  }
  const userId = z.string().uuid().parse(input.userId);
  const role = z.enum(["ed", "admin", "hr", "cfo", "full"]).parse(input.role);
  if (role === "full" && context.session.member.membershipRole !== "owner") {
    throw new Error("Only the organization owner can assign full template editor access.");
  }
  const { data: member, error: memberError } = await context.admin.from("organization_members")
    .select("user_id").eq("organization_id", context.session.organization.id)
    .eq("user_id", userId).eq("status", "active").maybeSingle();
  if (memberError) throw memberError;
  if (!member) throw new Error("Choose an active member of this organization.");
  const { error } = await context.admin.from("ed_review_annual_access").upsert({
    cycle_id: context.cycle.id, organization_id: context.session.organization.id,
    user_id: userId, role, granted_by: context.session.member.id,
  }, { onConflict: "cycle_id,user_id" });
  if (error) throw error;
  return { status: "success" as const, message: "Annual review access updated." };
}

export async function revokeAnnualReviewRole(userIdInput: string) {
  const context = await getAnnualDocumentContext();
  if (context.role !== "chair" && context.role !== "full") {
    throw new Error("Only the Board Chair can remove annual document access.");
  }
  const userId = z.string().uuid().parse(userIdInput);
  const { error } = await context.admin.from("ed_review_annual_access")
    .delete().eq("cycle_id", context.cycle.id).eq("organization_id", context.session.organization.id)
    .eq("user_id", userId);
  if (error) throw error;
  return { status: "success" as const, message: "Annual review access removed." };
}
