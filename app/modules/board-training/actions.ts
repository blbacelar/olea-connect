"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { TrainingCourseId, TrainingLanguage } from "@/lib/board-training/content";
import {
  acceptTrainingInvitation,
  completeTrainingLesson,
  emailTrainingCertificate,
  inviteTrainingMember,
  issueTrainingCertificate,
  removeTrainingDocument,
  resendTrainingInvitation,
  revokeTrainingInvitation,
  saveTrainingActionPlan,
  saveTrainingConfidence,
  saveTrainingLanguage,
  saveTrainingSettings,
  signTrainingOrganization,
  startTraining,
  submitTrainingAssessment,
  uploadTrainingDocument,
} from "@/lib/data/board-training";

const uuid = z.string().uuid();
const courseId = z.enum(["essentials", "refresher"]);
const language = z.enum(["en", "fr"]);
const jurisdiction = z.enum(["bc","ab","sk","mb","on","qc","nb","ns","pe","nl","yt","nt","nu","fed","other"]);
const returnPath = "/modules/board-training";

function refresh() {
  revalidatePath(returnPath);
  revalidatePath(`${returnPath}/[courseId]`, "page");
}

function validationMessage(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Check the required fields.";
  if (error instanceof Error && !["PostgrestError", "AuthApiError", "StorageApiError"].includes(error.name)) return error.message;
  return "We could not save this change. Please try again.";
}

async function run<T>(operation: () => Promise<T>) {
  try {
    const value = await operation();
    refresh();
    return { ok: true as const, value };
  } catch (error) {
    return { ok: false as const, error: validationMessage(error) };
  }
}

export async function startTrainingAction(input: { courseId: TrainingCourseId; language: TrainingLanguage }) {
  const parsed = z.object({ courseId, language }).parse(input);
  await startTraining(parsed.courseId, parsed.language);
  refresh();
  redirect(`${returnPath}/${parsed.courseId}`);
}

export async function saveTrainingLanguageAction(input: { enrollmentId: string; language: TrainingLanguage }) {
  return run(async () => {
    const parsed = z.object({ enrollmentId: uuid, language }).parse(input);
    await saveTrainingLanguage(parsed.enrollmentId, parsed.language);
  });
}

export async function saveTrainingConfidenceAction(input: { enrollmentId: string; phase: "before" | "after"; values: Record<string, number> }) {
  return run(async () => {
    const parsed = z.object({ enrollmentId: uuid, phase: z.enum(["before", "after"]), values: z.record(z.string(), z.number().int().min(1).max(5)) }).parse(input);
    await saveTrainingConfidence(parsed.enrollmentId, parsed.phase, parsed.values);
  });
}

export async function completeTrainingLessonAction(input: { enrollmentId: string; lessonId: string }) {
  return run(async () => {
    const parsed = z.object({ enrollmentId: uuid, lessonId: z.string().regex(/^[lr][1-8]$/) }).parse(input);
    await completeTrainingLesson(parsed.enrollmentId, parsed.lessonId);
  });
}

export async function submitTrainingAssessmentAction(input: { enrollmentId: string; answers: Record<string, string>; testOut: boolean }) {
  return run(async () => {
    const parsed = z.object({ enrollmentId: uuid, answers: z.record(z.string(), z.string().max(10)), testOut: z.boolean() }).parse(input);
    return submitTrainingAssessment(parsed.enrollmentId, parsed.answers, parsed.testOut);
  });
}

export async function signTrainingOrganizationAction(input: {
  enrollmentId: string; noInterests: boolean; interests: string; reviewed: boolean; conduct: boolean; signature: string;
}) {
  return run(async () => {
    const parsed = z.object({
      enrollmentId: uuid, noInterests: z.boolean(), interests: z.string().trim().max(2000),
      reviewed: z.boolean(), conduct: z.boolean(), signature: z.string().trim().min(2).max(160),
    }).parse(input);
    await signTrainingOrganization(parsed);
  });
}

export async function saveTrainingActionPlanAction(input: {
  enrollmentId: string; plan: string[]; followUp: Record<string, string>;
}) {
  return run(async () => {
    const parsed = z.object({ enrollmentId: uuid, plan: z.array(z.string().trim().min(2).max(300)).min(1).max(3), followUp: z.record(z.string(), z.enum(["done", "partly", "not_yet"])) }).parse(input);
    await saveTrainingActionPlan(parsed.enrollmentId, parsed.plan, parsed.followUp);
  });
}

export async function issueTrainingCertificateAction(input: { enrollmentId: string; name: string; acknowledgedStatements: number[] }) {
  return run(async () => {
    const parsed = z.object({ enrollmentId: uuid, name: z.string().trim().min(2).max(160), acknowledgedStatements: z.array(z.number().int().nonnegative()).max(20) }).parse(input);
    const certificateId = await issueTrainingCertificate(parsed.enrollmentId, parsed.name, parsed.acknowledgedStatements);
    let emailed = false;
    try { emailed = await emailTrainingCertificate(certificateId); } catch { /* Certificate remains available for download. */ }
    return { certificateId, emailed };
  });
}

export async function saveTrainingSettingsAction(input: { jurisdiction: string; defaultLocale: TrainingLanguage; chairUserId: string | null; notifyChair: boolean }) {
  return run(async () => {
    const parsed = z.object({ jurisdiction, defaultLocale: language, chairUserId: uuid.nullable(), notifyChair: z.boolean() }).parse(input);
    await saveTrainingSettings(parsed);
  });
}

export async function inviteTrainingMemberAction(input: { email: string; courseId: TrainingCourseId; language: TrainingLanguage; dueDate: string | null }) {
  return run(async () => {
    const parsed = z.object({ email: z.email().max(254), courseId, language, dueDate: z.iso.date().nullable() }).parse(input);
    await inviteTrainingMember(parsed);
  });
}

export async function revokeTrainingInvitationAction(invitationId: string) {
  return run(async () => revokeTrainingInvitation(uuid.parse(invitationId)));
}

export async function resendTrainingInvitationAction(invitationId: string) {
  return run(async () => resendTrainingInvitation(uuid.parse(invitationId)));
}

export async function acceptTrainingInvitationAction(token: string) {
  return run(async () => acceptTrainingInvitation(z.string().regex(/^[A-Za-z0-9_-]{43}$/).parse(token)));
}

export async function uploadTrainingDocumentAction(formData: FormData) {
  return run(async () => {
    const kind = z.enum(["bylaws","strategic_plan","financials","code_of_conduct","coi_policy","minutes","other"]).parse(formData.get("kind"));
    const title = z.string().trim().min(2).max(160).parse(formData.get("title"));
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("Choose a PDF document up to 5 MB.");
    await uploadTrainingDocument({ kind, title, file });
  });
}

export async function removeTrainingDocumentAction(documentId: string) {
  return run(async () => removeTrainingDocument(uuid.parse(documentId)));
}
