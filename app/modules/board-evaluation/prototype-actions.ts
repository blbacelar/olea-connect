"use server";

import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAppUrl, getEmailRecipient, getEmailSender, getReplyTo, getResend } from "@/lib/email/server";
import { parseBoardEvaluationInviteEmails } from "@/lib/board-evaluation/invitations";
import { parseQuestionSelection } from "@/lib/board-evaluation/question-bank";
import { buildBoardEvaluationReportHtml } from "@/lib/board-evaluation/report-html";
import { createBrandingSnapshot } from "@/lib/data/brand-assets";
import { getBoardEvaluationPrototypeData } from "@/lib/data/board-evaluation-prototype";
import { requireGovernanceGrowthManager } from "@/lib/governance-growth/access";
import { buildBoardPackageMeetings } from "@/lib/template-renderer/board-calendar-packages";
import type { TemplateFormData } from "@/lib/template-renderer/types";
import { renderHtmlToPdfBuffer } from "@/lib/template-renderer/html-pdf-export";

import type { EvaluationActionState } from "./actions";

const path = "/modules/board-evaluation";
const uuid = z.uuid();
const val = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const success = (message: string): EvaluationActionState => ({ status: "success", message });
const failure = (error: unknown): EvaluationActionState => ({
  status: "error", message: error instanceof Error ? error.message : "The change could not be saved.",
});

export async function sendAnnualBoardEvaluationInvitations(
  _state: EvaluationActionState, form: FormData,
): Promise<EvaluationActionState> {
  try {
    const context = await requireGovernanceGrowthManager("board_evaluation");
    const cycleId = uuid.parse(val(form, "cycleId"));
    const emails = parseBoardEvaluationInviteEmails(val(form, "emails"));
    const orgId = context.session.organization.id;
    const { data: cycle, error: cycleError } = await context.admin.from("board_evaluation_cycles")
      .select("id,year,public_token,status,closes_on,invited_count")
      .eq("id", cycleId).eq("organization_id", orgId).maybeSingle();
    if (cycleError) throw cycleError;
    if (!cycle || cycle.status !== "open" ||
        (cycle.closes_on && cycle.closes_on < new Date().toISOString().slice(0, 10))) {
      throw new Error("Open the annual evaluation before sending invitations.");
    }
    const { data: existing, error: auditReadError } = await context.admin.from("audit_logs")
      .select("metadata").eq("organization_id", orgId)
      .eq("action", "board_evaluation.annual_invitation_sent")
      .contains("metadata", { cycle_id: cycleId }).limit(10000);
    if (auditReadError) throw auditReadError;
    const alreadySent = new Set((existing ?? []).map((row) => {
      const metadata = row.metadata as Record<string, unknown> | null;
      return typeof metadata?.recipient_email === "string" ? metadata.recipient_email.toLowerCase() : "";
    }).filter(Boolean));
    const pending = emails.filter((email) => !alreadySent.has(email));
    if (!pending.length) {
      if (alreadySent.size > cycle.invited_count) {
        const { error: countError } = await context.admin.from("board_evaluation_cycles")
          .update({ invited_count: alreadySent.size }).eq("id", cycleId).eq("organization_id", orgId);
        if (countError) throw countError;
        revalidatePath(path);
      }
      return success("All listed recipients already received this shared survey link.");
    }
    const link = new URL(`/board-evaluation/annual/${cycle.public_token}`, getAppUrl()).toString();
    const organization = context.session.organization.brand.organizationName;
    const deadline = cycle.closes_on ? `\nResponse deadline / Date limite : ${cycle.closes_on}` : "";
    const body = `${organization} invites you to complete its ${cycle.year} annual board self-evaluation. Your response is anonymous. The same link is sent to all board members; please do not forward it outside the board.\n\n${link}${deadline}\n\n${organization} vous invite à remplir son autoévaluation annuelle du conseil ${cycle.year}. Votre réponse est anonyme. Le même lien est envoyé à tous les membres du conseil; veuillez ne pas le transmettre à l’extérieur du conseil.\n\n${link}`;
    const idempotencyKey = createHash("sha256")
      .update(JSON.stringify([cycleId, [...pending].sort()])).digest("hex");
    const { error: sendError } = await getResend().batch.send(pending.map((email) => ({
      from: getEmailSender(), to: getEmailRecipient(email), replyTo: getReplyTo(),
      subject: `${organization}: annual board evaluation / autoévaluation annuelle du conseil`, text: body,
    })), { idempotencyKey });
    if (sendError) throw new Error("Invitations could not be sent. Check the email service and try again.");
    const { error: auditError } = await context.admin.from("audit_logs").insert(pending.map((email) => ({
        action: "board_evaluation.annual_invitation_sent", actor_user_id: context.session.member.id,
        organization_id: orgId, entity_type: "board_evaluation", entity_id: cycleId,
        changes: null, metadata: { cycle_id: cycleId, recipient_email: email },
    })));
    if (auditError) throw auditError;
    for (const email of pending) alreadySent.add(email);
    const { error: updateError } = await context.admin.from("board_evaluation_cycles")
      .update({ invited_count: Math.max(cycle.invited_count, alreadySent.size) })
      .eq("id", cycleId).eq("organization_id", orgId);
    if (updateError) throw updateError;
    revalidatePath(path);
    return success(`${pending.length} invitations sent with one shared anonymous link.`);
  } catch (error) { return failure(error); }
}

export async function sendMeetingBoardEvaluationInvitations(
  _state: EvaluationActionState, form: FormData,
): Promise<EvaluationActionState> {
  try {
    const context = await requireGovernanceGrowthManager("board_evaluation");
    const surveyId = uuid.parse(val(form, "surveyId"));
    const emails = parseBoardEvaluationInviteEmails(val(form, "emails"));
    const orgId = context.session.organization.id;
    const { data: survey, error: surveyError } = await context.admin.from("board_evaluation_meeting_surveys")
      .select("id,meeting_title,meeting_date,public_token,status")
      .eq("id", surveyId).eq("organization_id", orgId).maybeSingle();
    if (surveyError) throw surveyError;
    if (!survey || survey.status !== "open") throw new Error("Open the meeting evaluation before sending invitations.");
    const { data: existing, error: auditReadError } = await context.admin.from("audit_logs")
      .select("metadata").eq("organization_id", orgId)
      .eq("action", "board_evaluation.meeting_invitation_sent")
      .contains("metadata", { survey_id: surveyId }).limit(10000);
    if (auditReadError) throw auditReadError;
    const alreadySent = new Set((existing ?? []).map((row) => {
      const metadata = row.metadata as Record<string, unknown> | null;
      return typeof metadata?.recipient_email === "string" ? metadata.recipient_email.toLowerCase() : "";
    }).filter(Boolean));
    const pending = emails.filter((email) => !alreadySent.has(email));
    if (!pending.length) return success("All listed recipients already received this shared meeting link.");
    const link = new URL(`/board-evaluation/meeting/${survey.public_token}`, getAppUrl()).toString();
    const organization = context.session.organization.brand.organizationName;
    const body = `${organization} invites you to complete an anonymous evaluation of the ${survey.meeting_title} meeting on ${survey.meeting_date}. The same link is sent to everyone; no individual response is linked to an email address.\n\n${link}\n\n${organization} vous invite à évaluer anonymement la réunion ${survey.meeting_title} du ${survey.meeting_date}. Le même lien est envoyé à toutes et à tous; aucune réponse individuelle n’est liée à une adresse courriel.\n\n${link}`;
    const idempotencyKey = createHash("sha256")
      .update(JSON.stringify([surveyId, [...pending].sort()])).digest("hex");
    const { error: sendError } = await getResend().batch.send(pending.map((email) => ({
      from: getEmailSender(), to: getEmailRecipient(email), replyTo: getReplyTo(),
      subject: `${organization}: meeting evaluation / évaluation de la réunion`, text: body,
    })), { idempotencyKey });
    if (sendError) throw new Error("Meeting invitations could not be sent. Check the email service and try again.");
    const { error: auditError } = await context.admin.from("audit_logs").insert(pending.map((email) => ({
      action: "board_evaluation.meeting_invitation_sent", actor_user_id: context.session.member.id,
      organization_id: orgId, entity_type: "board_evaluation", entity_id: surveyId,
      changes: null, metadata: { survey_id: surveyId, recipient_email: email },
    })));
    if (auditError) throw auditError;
    revalidatePath(path);
    return success(`${pending.length} meeting invitations sent with one shared anonymous link.`);
  } catch (error) { return failure(error); }
}

export async function saveBoardEvaluationConfiguration(
  _state: EvaluationActionState, form: FormData,
): Promise<EvaluationActionState> {
  try {
    const context = await requireGovernanceGrowthManager("board_evaluation");
    const cycleId = uuid.parse(val(form, "cycleId"));
    const invitedCount = z.coerce.number().int().min(0).max(10000).parse(val(form, "invitedCount"));
    const raw = JSON.parse(val(form, "selection"));
    const selection = parseQuestionSelection(raw);
    if (!selection) throw new Error("Choose valid survey questions before saving.");
    const { count: responseCount, error: countError } = await context.admin
      .from("board_evaluation_anonymous_ratings")
      .select("id", { count: "exact", head: true })
      .eq("cycle_id", cycleId).eq("organization_id", context.session.organization.id);
    if (countError) throw countError;
    if (responseCount) throw new Error("Survey questions cannot change after responses have been received.");
    const { data, error } = await context.admin.from("board_evaluation_cycles")
      .update({ invited_count: invitedCount, question_selection: selection })
      .eq("id", cycleId).eq("organization_id", context.session.organization.id)
      .eq("status", "open").select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("The open evaluation was not found in your organization.");
    revalidatePath(path);
    return success("Survey configuration saved.");
  } catch (error) { return failure(error); }
}

export async function saveBoardEvaluationThankYou(
  _state: EvaluationActionState, form: FormData,
): Promise<EvaluationActionState> {
  try {
    const context = await requireGovernanceGrowthManager("board_evaluation");
    const cycleId = uuid.parse(val(form, "cycleId"));
    const copy = z.object({
      enTitle: z.string().trim().min(3).max(160),
      frTitle: z.string().trim().min(3).max(160),
      enMessage: z.string().trim().min(10).max(1000),
      frMessage: z.string().trim().min(10).max(1000),
    }).parse(JSON.parse(val(form, "copy")));
    const { data, error } = await context.admin.from("board_evaluation_cycles")
      .update({ thank_you_copy: copy }).eq("id", cycleId)
      .eq("organization_id", context.session.organization.id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("The evaluation was not found in your organization.");
    revalidatePath(path);
    return success("Thank-you message saved in English and French.");
  } catch (error) { return failure(error); }
}

export async function createPostMeetingEvaluation(
  _state: EvaluationActionState, form: FormData,
): Promise<EvaluationActionState> {
  try {
    const context = await requireGovernanceGrowthManager("board_evaluation");
    const templateInstanceId = uuid.parse(val(form, "templateInstanceId"));
    const meetingId = z.string().min(1).max(200).parse(val(form, "meetingId"));
    const orgId = context.session.organization.id;
    const { data: instance, error: instanceError } = await context.admin
      .from("template_instances").select("id,form_data,resources!inner(slug)")
      .eq("id", templateInstanceId).eq("organization_id", orgId)
      .eq("resources.slug", "board-calendar-operational-workflow").maybeSingle();
    if (instanceError) throw instanceError;
    if (!instance) throw new Error("The board calendar is not available to your organization.");
    const meeting = buildBoardPackageMeetings(instance.form_data as TemplateFormData)
      .find((row) => row.id === meetingId);
    if (!meeting || !z.iso.date().safeParse(meeting.date).success) {
      throw new Error("Choose a dated meeting from your board calendar.");
    }
    const { data: cycle, error: cycleError } = await context.admin.from("board_evaluation_cycles")
      .select("question_selection").eq("organization_id", orgId)
      .eq("status", "open").order("year", { ascending: false }).limit(1).maybeSingle();
    if (cycleError) throw cycleError;
    const selection = parseQuestionSelection(cycle?.question_selection);
    const meetingSelection = selection?.meeting.length ? {
      rated: [], open: [], meeting: selection.meeting, meetingOpen: selection.meetingOpen,
    } : {};
    const { error } = await context.admin.from("board_evaluation_meeting_surveys")
      .upsert({
        organization_id: orgId,
        template_instance_id: templateInstanceId,
        meeting_id: meetingId,
        meeting_title: meeting.title.slice(0, 200),
        meeting_date: meeting.date,
        question_selection: meetingSelection,
        created_by: context.session.member.id,
      }, { onConflict: "organization_id,template_instance_id,meeting_id", ignoreDuplicates: true });
    if (error) throw error;
    revalidatePath(path);
    return success("Post-meeting evaluation link is ready.");
  } catch (error) { return failure(error); }
}

export async function closePostMeetingEvaluation(
  _state: EvaluationActionState, form: FormData,
): Promise<EvaluationActionState> {
  try {
    const context = await requireGovernanceGrowthManager("board_evaluation");
    const surveyId = uuid.parse(val(form, "surveyId"));
    const { data, error } = await context.admin.from("board_evaluation_meeting_surveys")
      .update({ status: "closed" }).eq("id", surveyId)
      .eq("organization_id", context.session.organization.id)
      .eq("status", "open").select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("This evaluation is already closed or unavailable.");
    revalidatePath(path);
    return success("Post-meeting evaluation closed.");
  } catch (error) { return failure(error); }
}

export async function saveBoardEvaluationSummary(
  _state: EvaluationActionState, form: FormData,
): Promise<EvaluationActionState> {
  try {
    const context = await requireGovernanceGrowthManager("board_evaluation");
    const cycleId = uuid.parse(val(form, "cycleId"));
    const report = z.object({
      themes: z.array(z.string().trim().max(1500)).max(4),
      priorities: z.array(z.object({
        title: z.string().trim().max(200),
        owner: z.string().trim().max(160),
        dueOn: z.union([z.iso.date(), z.literal("")]),
        checkInOn: z.union([z.iso.date(), z.literal("")]),
        measure: z.string().trim().max(500),
      })).length(3),
      strengths: z.array(z.string().trim().max(500)).length(3),
      concerns: z.array(z.string().trim().max(500)).length(3),
      monitor: z.array(z.string().trim().max(500)).length(3),
      discussionQuestions: z.array(z.string().trim().max(500)).length(3),
      yearRecord: z.array(z.object({
        year: z.string().trim().max(20),
        overall: z.string().trim().max(20),
        strength: z.string().trim().max(300),
        priority: z.string().trim().max(300),
        responseRate: z.string().trim().max(20),
      })).length(5),
      notes: z.string().trim().max(4000),
    }).parse(JSON.parse(val(form, "report")));
    const { data, error } = await context.admin.from("board_evaluation_cycles")
      .update({ summary_report: report })
      .eq("id", cycleId).eq("organization_id", context.session.organization.id)
      .select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("The evaluation was not found in your organization.");
    revalidatePath(path);
    return success("Summary and action plan saved.");
  } catch (error) { return failure(error); }
}

export async function reviewBoardEvaluationOpenAnswer(
  _state: EvaluationActionState, form: FormData,
): Promise<EvaluationActionState> {
  try {
    const context = await requireGovernanceGrowthManager("board_evaluation");
    const cycleId = uuid.parse(val(form, "cycleId"));
    const answerId = uuid.parse(val(form, "answerId"));
    const redacted = z.string().trim().max(4000).parse(val(form, "redacted"));
    const approved = val(form, "approved") === "true";
    if (approved && redacted.length < 3) throw new Error("Write a safe paraphrase before approving this answer.");
    const { data: cycle, error: cycleError } = await context.admin.from("board_evaluation_cycles")
      .select("id,status").eq("id", cycleId)
      .eq("organization_id", context.session.organization.id).maybeSingle();
    if (cycleError) throw cycleError;
    if (!cycle || cycle.status !== "closed") throw new Error("Close the evaluation before reviewing responses.");
    const { count, error: countError } = await context.admin.from("board_evaluation_anonymous_ratings")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", context.session.organization.id).eq("cycle_id", cycleId);
    if (countError) throw countError;
    if ((count ?? 0) < 5) throw new Error("At least five responses are needed before reviewing open answers.");
    const { data, error } = await context.admin.from("board_evaluation_open_text")
      .update({ redacted_body: redacted || null, approved_for_report: approved })
      .eq("id", answerId).eq("cycle_id", cycleId)
      .eq("organization_id", context.session.organization.id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("This answer is unavailable.");
    revalidatePath(path);
    return success("Open answer review saved.");
  } catch (error) { return failure(error); }
}

export async function reviewBoardEvaluationMeetingComment(
  _state: EvaluationActionState, form: FormData,
): Promise<EvaluationActionState> {
  try {
    const context = await requireGovernanceGrowthManager("board_evaluation");
    const surveyId = uuid.parse(val(form, "surveyId"));
    const commentId = uuid.parse(val(form, "commentId"));
    const redacted = z.string().trim().max(4000).parse(val(form, "redacted"));
    const approved = val(form, "approved") === "true";
    if (approved && redacted.length < 3) throw new Error("Write a safe paraphrase before approving this comment.");
    const orgId = context.session.organization.id;
    const { data: survey, error: surveyError } = await context.admin.from("board_evaluation_meeting_surveys")
      .select("id,status").eq("id", surveyId).eq("organization_id", orgId).maybeSingle();
    if (surveyError) throw surveyError;
    if (!survey || survey.status !== "closed") throw new Error("Close the meeting evaluation before reviewing comments.");
    const { count, error: countError } = await context.admin.from("board_evaluation_meeting_ratings")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId).eq("survey_id", surveyId);
    if (countError) throw countError;
    if ((count ?? 0) < 5) throw new Error("At least five responses are needed before reviewing comments.");
    const { data, error } = await context.admin.from("board_evaluation_meeting_comments")
      .update({ redacted_body: redacted || null, approved_for_report: approved })
      .eq("id", commentId).eq("survey_id", surveyId).eq("organization_id", orgId)
      .select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("This comment is unavailable.");
    revalidatePath(path);
    return success("Meeting comment review saved.");
  } catch (error) { return failure(error); }
}

export async function generateBoardEvaluationReportPdf(cycleId: string, french: boolean) {
  try {
    const context = await requireGovernanceGrowthManager("board_evaluation");
    const id = uuid.parse(cycleId);
    const data = await getBoardEvaluationPrototypeData(id);
    if (!data.cycle || data.cycle.id !== id || !data.annual) {
      throw new Error("The evaluation was not found in your organization.");
    }
    if (data.cycle.status !== "closed") throw new Error("Close the survey before exporting its findings report.");
    const brand = await createBrandingSnapshot(context.admin, context.session.organization.brand);
    const report = data.cycle.summaryReport;
    const themes = Array.isArray(report.themes) ? report.themes.filter((value): value is string => typeof value === "string") : [];
    const priorities = Array.isArray(report.priorities) ? report.priorities as Array<{ title: string; owner: string; dueOn: string; checkInOn: string; measure: string }> : [];
    const html = buildBoardEvaluationReportHtml({
      organizationName: brand.organizationName,
      year: data.cycle.year,
      logoUrl: brand.logoUrl,
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor,
      results: data.annual,
      themes,
      priorities,
      strengths: Array.isArray(report.strengths) ? report.strengths as string[] : [],
      concerns: Array.isArray(report.concerns) ? report.concerns as string[] : [],
      monitor: Array.isArray(report.monitor) ? report.monitor as string[] : [],
      discussionQuestions: Array.isArray(report.discussionQuestions) ? report.discussionQuestions as string[] : [],
      yearRecord: Array.isArray(report.yearRecord) ? report.yearRecord as Array<{ year: string; overall: string; strength: string; priority: string; responseRate: string }> : [],
      notes: typeof report.notes === "string" ? report.notes : "",
      french,
    });
    const pdf = await renderHtmlToPdfBuffer(html);
    return { ok: true as const, base64: pdf.toString("base64"), fileName: `board-evaluation-${data.cycle.year}.pdf` };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "The report could not be generated." };
  }
}
