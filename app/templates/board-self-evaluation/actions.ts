"use server";

import { requireMemberContext } from "@/lib/data/member-context";
import type { TemplateSession } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

export async function saveTemplateSession(
  session: TemplateSession,
): Promise<TemplateSession> {
  const { member, organization } = await requireMemberContext();
  if (session.organizationId !== organization.id) {
    throw new Error("This template belongs to another organization.");
  }

  const supabase = await createClient();
  const formData = {
    boardYear: session.boardYear,
    surveyPeriod: session.surveyPeriod,
    answers: session.answers,
    openEndedAnswers: session.openEndedAnswers,
    administrator: session.administrator,
    contact: session.contact,
    deadline: session.deadline,
  };

  const query = session.id
    ? supabase
        .from("template_instances")
        .update({ form_data: formData })
        .eq("id", session.id)
        .eq("organization_id", organization.id)
    : supabase.from("template_instances").insert({
        organization_id: organization.id,
        resource_id: session.templateId,
        created_by: member.id,
        title: `Board Self-Evaluation ${session.boardYear}`.trim(),
        form_data: formData,
        branding_snapshot: organization.brand,
      });
  const { data, error } = await query.select("id, updated_at").single();

  if (error) throw error;
  return { ...session, id: data.id, updatedAt: data.updated_at };
}
