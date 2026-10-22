import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { notFound } from "next/navigation";

import { getPublicQuestions, getTrainingCourse, getTrainingQuiz, type TrainingCourseId, type TrainingLanguage } from "@/lib/board-training/content";
import { aggregateTrainingReport, gradeTrainingAssessment, trainingCertificateExpiry } from "@/lib/board-training/domain";
import { renderTrainingCertificatePdf } from "@/lib/board-training/certificate-pdf";
import { requireMemberContext } from "@/lib/data/member-context";
import { getAppUrl, getEmailRecipient, getEmailSender, getReplyTo, getResend } from "@/lib/email/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { hasGovernanceFeature } from "@/lib/governance-growth/entitlements";

const bucket = "board-training-documents";
const courseIds = ["essentials", "refresher"] as const;

type EnrollmentRow = {
  id: string; organization_id: string; user_id: string; course_id: TrainingCourseId;
  locale: TrainingLanguage; completed_lessons: string[];
  confidence_before: Record<string, number>; confidence_after: Record<string, number>;
  action_plan: string[]; follow_up: Record<string, string>;
  before_completed_at: string | null; test_out_used: boolean; passed_at: string | null;
  score: number | null; total_questions: number | null;
  organization_signed_at: string | null; acknowledged_at: string | null;
};

async function hasActiveCanopySubscription(admin: ReturnType<typeof createAdminClient>, organizationId: string) {
  const { data: subscription, error } = await admin
    .from("subscriptions")
    .select("plan_id, status, current_period_end, subscription_items(item_type, active)")
    .eq("organization_id", organizationId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return hasGovernanceFeature("board_training", subscription);
}

export async function hasTrainingAccess() {
  const session = await requireMemberContext();
  return hasActiveCanopySubscription(createAdminClient(), session.organization.id);
}

export async function requireTrainingContext() {
  const session = await requireMemberContext();
  const admin = createAdminClient();
  if (!(await hasActiveCanopySubscription(admin, session.organization.id))) {
    notFound();
  }
  return { ...session, admin, isManager: ["owner", "admin"].includes(session.member.membershipRole) };
}

function requireManager(context: Awaited<ReturnType<typeof requireTrainingContext>>) {
  if (!context.isManager) throw new Error("Only organization owners and administrators can manage training.");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getTrainingSettings(context: Awaited<ReturnType<typeof requireTrainingContext>>) {
  const { data, error } = await context.admin.from("board_training_settings")
    .select("jurisdiction, default_locale, chair_user_id, notify_chair")
    .eq("organization_id", context.organization.id).maybeSingle();
  if (error) throw error;
  return (data ?? { jurisdiction: "other", default_locale: "en", chair_user_id: null, notify_chair: false }) as {
    jurisdiction: string; default_locale: TrainingLanguage; chair_user_id: string | null; notify_chair: boolean;
  };
}

export async function saveTrainingSettings(input: {
  jurisdiction: string; defaultLocale: TrainingLanguage; chairUserId: string | null; notifyChair: boolean;
}) {
  const context = await requireTrainingContext();
  requireManager(context);
  if (input.chairUserId) {
    const { data: chair, error: chairError } = await context.admin.from("organization_members")
      .select("user_id").eq("organization_id", context.organization.id)
      .eq("user_id", input.chairUserId).eq("status", "active").maybeSingle();
    if (chairError) throw chairError;
    if (!chair) throw new Error("Choose an active member as Board Chair.");
  }
  const { error } = await context.admin.from("board_training_settings").upsert({
    organization_id: context.organization.id,
    jurisdiction: input.jurisdiction,
    default_locale: input.defaultLocale,
    chair_user_id: input.chairUserId,
    notify_chair: input.notifyChair,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getTrainingHome() {
  const context = await requireTrainingContext();
  const orgId = context.organization.id;
  const [settings, enrollmentsResult, certificatesResult, documentsResult, invitationsResult, membersResult, declarationsResult] = await Promise.all([
    getTrainingSettings(context),
    context.admin.from("board_training_enrollments").select("id, user_id, course_id, locale, completed_lessons, score, total_questions, passed_at, organization_signed_at").eq("organization_id", orgId),
    context.admin.from("board_training_certificates").select("id, user_id, course_id, certificate_number, display_name, locale, score, total_questions, issued_at, expires_at, emailed_at").eq("organization_id", orgId),
    context.admin.from("board_training_documents").select("id, kind, title, object_path, created_at").eq("organization_id", orgId).order("created_at", { ascending: false }),
    context.isManager ? context.admin.from("board_training_invitations").select("id, email, course_id, locale, due_date, status, created_at, expires_at").eq("organization_id", orgId).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    context.isManager ? context.admin.from("organization_members").select("user_id, role").eq("organization_id", orgId).eq("status", "active") : Promise.resolve({ data: [], error: null }),
    context.isManager ? context.admin.from("board_training_declarations").select("id, user_id, no_interests, interests, signed_name, signed_at, enrollment_id").eq("organization_id", orgId).order("signed_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
  ]);
  for (const result of [enrollmentsResult, certificatesResult, documentsResult, invitationsResult, membersResult, declarationsResult]) {
    if (result.error) throw result.error;
  }
  const ownEnrollments = (enrollmentsResult.data ?? []).filter((row) => row.user_id === context.member.id);
  const ownCertificates = (certificatesResult.data ?? []).filter((row) => row.user_id === context.member.id);
  const members = await Promise.all((membersResult.data ?? []).map(async (row) => {
    const [{ data: profile }, { data: userResult }] = await Promise.all([
      context.admin.from("profiles").select("full_name").eq("id", row.user_id).maybeSingle(),
      context.admin.auth.admin.getUserById(row.user_id),
    ]);
    return { id: row.user_id, role: row.role, name: profile?.full_name || userResult.user?.email || "Member", email: userResult.user?.email ?? "" };
  }));
  return {
    organization: { id: orgId, name: context.organization.name },
    member: { id: context.member.id, name: context.member.name },
    isManager: context.isManager,
    isChair: settings.chair_user_id === context.member.id,
    settings,
    ownEnrollments,
    ownCertificates,
    roster: context.isManager ? enrollmentsResult.data ?? [] : [],
    certificates: context.isManager ? certificatesResult.data ?? [] : [],
    documents: documentsResult.data ?? [],
    invitations: invitationsResult.data ?? [],
    declarations: declarationsResult.data ?? [],
    members,
  };
}

export async function startTraining(courseId: TrainingCourseId, locale: TrainingLanguage) {
  const context = await requireTrainingContext();
  if (!courseIds.includes(courseId)) throw new Error("Choose an available course.");
  if (courseId === "refresher") {
    const { data: prerequisite, error } = await context.admin.from("board_training_certificates")
      .select("id").eq("organization_id", context.organization.id)
      .eq("user_id", context.member.id).eq("course_id", "essentials").maybeSingle();
    if (error) throw error;
    if (!prerequisite) throw new Error("Complete Governance Essentials before the annual refresher.");
  }
  const { data, error } = await context.admin.from("board_training_enrollments").upsert({
    organization_id: context.organization.id, user_id: context.member.id, course_id: courseId, locale,
  }, { onConflict: "organization_id,user_id,course_id", ignoreDuplicates: true }).select("id").maybeSingle();
  if (error) throw error;
  return data?.id;
}

export async function getTrainingEnrollment(courseId: TrainingCourseId) {
  const context = await requireTrainingContext();
  const { data, error } = await context.admin.from("board_training_enrollments").select("*")
    .eq("organization_id", context.organization.id).eq("user_id", context.member.id)
    .eq("course_id", courseId).maybeSingle();
  if (error) throw error;
  return { context, enrollment: data as EnrollmentRow | null };
}

export async function getTrainingCoursePageData(courseId: TrainingCourseId) {
  const { context, enrollment } = await getTrainingEnrollment(courseId);
  if (!enrollment) return null;
  const [settings, documents, certificateResult, attemptResult, previousResult] = await Promise.all([
    getTrainingSettings(context),
    getTrainingDocumentsForMember(context),
    context.admin.from("board_training_certificates").select("id, certificate_number, display_name, emailed_at")
      .eq("enrollment_id", enrollment.id).maybeSingle(),
    context.admin.from("board_training_attempts").select("score, total_questions, passed, test_out")
      .eq("enrollment_id", enrollment.id).order("submitted_at", { ascending: false }).limit(1).maybeSingle(),
    context.admin.from("board_training_enrollments").select("action_plan")
      .eq("organization_id", context.organization.id).eq("user_id", context.member.id)
      .eq("course_id", "essentials").maybeSingle(),
  ]);
  if (certificateResult.error) throw certificateResult.error;
  if (attemptResult.error) throw attemptResult.error;
  if (previousResult.error) throw previousResult.error;
  return {
    organizationName: context.organization.name,
    memberName: context.member.name,
    enrollment,
    course: getTrainingCourse(courseId, enrollment.locale),
    alternateSuggestions: getTrainingCourse(courseId, enrollment.locale === "en" ? "fr" : "en").actionPlan?.suggestions ?? [],
    questions: getPublicQuestions(courseId, enrollment.locale),
    settings, documents,
    certificate: certificateResult.data,
    lastAttempt: attemptResult.data,
    previousPlan: (previousResult.data?.action_plan ?? []) as string[],
  };
}

async function requireOwnEnrollment(enrollmentId: string) {
  const context = await requireTrainingContext();
  const { data, error } = await context.admin.from("board_training_enrollments").select("*")
    .eq("id", enrollmentId).eq("organization_id", context.organization.id)
    .eq("user_id", context.member.id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Training enrollment was not found.");
  return { context, enrollment: data as EnrollmentRow };
}

async function requireUncertified(context: Awaited<ReturnType<typeof requireTrainingContext>>, enrollment: EnrollmentRow) {
  const { data, error } = await context.admin.from("board_training_certificates")
    .select("id").eq("enrollment_id", enrollment.id).maybeSingle();
  if (error) throw error;
  if (data) throw new Error("This course is complete and can no longer be changed.");
}

export async function saveTrainingLanguage(enrollmentId: string, language: TrainingLanguage) {
  const { context, enrollment } = await requireOwnEnrollment(enrollmentId);
  const { error } = await context.admin.from("board_training_enrollments").update({ locale: language, updated_at: new Date().toISOString() }).eq("id", enrollment.id);
  if (error) throw error;
}

export async function saveTrainingConfidence(enrollmentId: string, phase: "before" | "after", values: Record<string, number>) {
  const { context, enrollment } = await requireOwnEnrollment(enrollmentId);
  await requireUncertified(context, enrollment);
  const course = getTrainingCourse(enrollment.course_id, enrollment.locale);
  const topics = course.reflection?.topics ?? [];
  if (!topics.length || topics.length !== Object.keys(values).length || topics.some((topic) => !Number.isInteger(values[topic.id]) || values[topic.id] < 1 || values[topic.id] > 5)) {
    throw new Error("Choose a rating from 1 to 5 for every area.");
  }
  if (phase === "after" && !enrollment.passed_at) throw new Error("Pass the assessment before rating your progress.");
  const update = phase === "before"
    ? { confidence_before: values, before_completed_at: new Date().toISOString() }
    : { confidence_after: values };
  const { error } = await context.admin.from("board_training_enrollments").update(update).eq("id", enrollment.id);
  if (error) throw error;
}

export async function completeTrainingLesson(enrollmentId: string, lessonId: string) {
  const { context, enrollment } = await requireOwnEnrollment(enrollmentId);
  await requireUncertified(context, enrollment);
  const course = getTrainingCourse(enrollment.course_id, enrollment.locale);
  const lessonIndex = course.lessons.findIndex((lesson) => lesson.id === lessonId);
  if (lessonIndex < 0) throw new Error("Choose a valid lesson.");
  if (course.reflection && !enrollment.before_completed_at) throw new Error("Complete your starting reflection first.");
  if (lessonIndex > 0 && !enrollment.completed_lessons.includes(course.lessons[lessonIndex - 1].id)) {
    throw new Error("Complete the previous lesson first.");
  }
  const completed = [...new Set([...enrollment.completed_lessons, lessonId])];
  const { error } = await context.admin.from("board_training_enrollments").update({ completed_lessons: completed, updated_at: new Date().toISOString() }).eq("id", enrollment.id);
  if (error) throw error;
}

export async function submitTrainingAssessment(enrollmentId: string, answers: Record<string, string>, testOut: boolean) {
  const { context, enrollment } = await requireOwnEnrollment(enrollmentId);
  const course = getTrainingCourse(enrollment.course_id, enrollment.locale);
  const quiz = getTrainingQuiz(enrollment.course_id, enrollment.locale);
  if (enrollment.passed_at) throw new Error("You have already passed this assessment.");
  if (course.reflection && !enrollment.before_completed_at) throw new Error("Complete your starting reflection first.");
  if (testOut) {
    if (!course.testOut.enabled || enrollment.test_out_used) throw new Error("The test-out attempt is no longer available.");
    if (enrollment.completed_lessons.length) throw new Error("Test-out is only available before lessons begin.");
  } else if (!course.lessons.every((lesson) => enrollment.completed_lessons.includes(lesson.id))) {
    throw new Error("Complete every lesson before the assessment.");
  }
  if (!testOut && !enrollment.organization_signed_at) {
    throw new Error("Sign the organization declaration before the assessment.");
  }
  const result = gradeTrainingAssessment(quiz.questions, answers, quiz.passMarkPercent);
  const { error } = await context.admin.rpc("board_training_record_assessment", {
    p_enrollment_id: enrollment.id, p_organization_id: context.organization.id,
    p_user_id: context.member.id, p_score: result.score, p_total: result.total,
    p_passed: result.passed, p_test_out: testOut, p_topic_scores: result.topicScores,
  });
  if (error) throw error;
  return {
    ...result,
    feedback: quiz.questions
      .filter((question) => result.passed || answers[question.id] === question.answer)
      .map((question) => ({ id: question.id, explanation: question.explanation, correctAnswer: result.passed ? question.answer : undefined })),
  };
}

export async function signTrainingOrganization(input: {
  enrollmentId: string; noInterests: boolean; interests: string; reviewed: boolean;
  conduct: boolean; signature: string;
}) {
  const { context, enrollment } = await requireOwnEnrollment(input.enrollmentId);
  if (enrollment.organization_signed_at) throw new Error("This declaration has already been signed.");
  const course = getTrainingCourse(enrollment.course_id, enrollment.locale);
  if (!enrollment.passed_at && !course.lessons.every((lesson) => enrollment.completed_lessons.includes(lesson.id))) {
    throw new Error("Complete the lessons or pass the assessment first.");
  }
  const { data: documents, error: docsError } = await context.admin.from("board_training_documents")
    .select("kind").eq("organization_id", context.organization.id);
  if (docsError) throw docsError;
  const hasConduct = (documents ?? []).some((document) => document.kind === "code_of_conduct");
  if ((documents ?? []).length && !input.reviewed) throw new Error("Review the provided documents before signing.");
  if (hasConduct && !input.conduct) throw new Error("Confirm the code of conduct before signing.");
  if (!input.noInterests && input.interests.trim().length < 4) throw new Error("Describe your interests, or select no interests.");
  if (input.signature.trim().length < 2 || input.signature.trim().length > 160) throw new Error("Enter your full name, 2 to 160 characters.");
  const { error } = await context.admin.rpc("board_training_sign_organization", {
    p_enrollment_id: enrollment.id, p_organization_id: context.organization.id,
    p_user_id: context.member.id, p_no_interests: input.noInterests,
    p_interests: input.noInterests ? null : input.interests.trim(),
    p_reviewed: input.reviewed, p_conduct: input.conduct,
    p_signature: input.signature.trim(),
  });
  if (error) throw error;
}

export async function saveTrainingActionPlan(enrollmentId: string, plan: string[], followUp: Record<string, string>) {
  const { context, enrollment } = await requireOwnEnrollment(enrollmentId);
  await requireUncertified(context, enrollment);
  if (!enrollment.passed_at || !enrollment.organization_signed_at) throw new Error("Complete the assessment and declaration first.");
  const course = getTrainingCourse(enrollment.course_id, enrollment.locale);
  if (!course.actionPlan) throw new Error("This course has no action plan.");
  if (plan.length < 1 || plan.length > course.actionPlan.max || new Set(plan.map((item) => item.trim())).size !== plan.length || plan.some((item) => !item.trim() || item.length > 300)) {
    throw new Error(`Choose 1 to ${course.actionPlan.max} commitments, up to 300 characters each.`);
  }
  if (course.reflection && course.reflection.topics.some((topic) => !enrollment.confidence_after[topic.id])) {
    throw new Error("Rate every area after the course before saving your plan.");
  }
  if (Object.values(followUp).some((value) => !["done", "partly", "not_yet"].includes(value))) {
    throw new Error("Choose Done, Partly, or Not yet for each follow-up.");
  }
  if (enrollment.course_id === "refresher") {
    const { data: prior, error: priorError } = await context.admin.from("board_training_enrollments")
      .select("action_plan").eq("organization_id", context.organization.id)
      .eq("user_id", context.member.id).eq("course_id", "essentials").maybeSingle();
    if (priorError) throw priorError;
    const expected = (prior?.action_plan ?? []) as string[];
    if (Object.keys(followUp).length !== expected.length ||
        expected.some((_, index) => !["done", "partly", "not_yet"].includes(followUp[String(index)]))) {
      throw new Error("Choose a follow-up status for each action from the previous course.");
    }
  } else if (Object.keys(followUp).length) {
    throw new Error("Follow-up belongs to the annual refresher.");
  }
  const { error } = await context.admin.from("board_training_enrollments").update({ action_plan: plan.map((item) => item.trim()), follow_up: followUp }).eq("id", enrollment.id);
  if (error) throw error;
}

export async function issueTrainingCertificate(enrollmentId: string, name: string, acknowledgedStatements: number[]) {
  const { context, enrollment } = await requireOwnEnrollment(enrollmentId);
  if (!enrollment.passed_at || !enrollment.organization_signed_at || !enrollment.action_plan.length) {
    throw new Error("Complete the assessment, organization declaration, and action plan first.");
  }
  const course = getTrainingCourse(enrollment.course_id, enrollment.locale);
  if (acknowledgedStatements.length !== course.attestation.statements.length ||
      course.attestation.statements.some((_, index) => !acknowledgedStatements.includes(index)) ||
      new Set(acknowledgedStatements).size !== acknowledgedStatements.length) {
    throw new Error("Confirm each director acknowledgement before continuing.");
  }
  if (name.trim().length < 2 || name.trim().length > 160) throw new Error("Enter the full name for your certificate, 2 to 160 characters.");
  const issued = new Date();
  const certificateNumber = `OLEA-${issued.getUTCFullYear()}-${randomBytes(6).toString("hex").toUpperCase()}`;
  const { data, error } = await context.admin.rpc("board_training_issue_certificate", {
    p_enrollment_id: enrollment.id, p_organization_id: context.organization.id,
    p_user_id: context.member.id, p_certificate_number: certificateNumber,
    p_display_name: name.trim(), p_issued_at: issued.toISOString(),
    p_expires_at: trainingCertificateExpiry(issued, course.certificateValidMonths).toISOString(),
  });
  if (error) throw error;
  return data as string;
}

export async function getTrainingDocumentsForMember(context: Awaited<ReturnType<typeof requireTrainingContext>>) {
  const { data, error } = await context.admin.from("board_training_documents")
    .select("id, kind, title, object_path")
    .eq("organization_id", context.organization.id).order("created_at", { ascending: false });
  if (error) throw error;
  return await Promise.all((data ?? []).map(async (document) => {
    const signed = await context.admin.storage.from(bucket).createSignedUrl(document.object_path, 60 * 10);
    return { id: document.id, kind: document.kind, title: document.title, url: signed.data?.signedUrl ?? null };
  }));
}

export async function uploadTrainingDocument(input: { kind: string; title: string; file: File }) {
  const context = await requireTrainingContext();
  requireManager(context);
  const file = input.file;
  if (!file || file.size < 1 || file.size > 5 * 1024 * 1024 || file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Upload a PDF document up to 5 MB.");
  }
  if (input.title.trim().length < 2 || input.title.trim().length > 160) throw new Error("Enter a title from 2 to 160 characters.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("Choose a valid PDF document.");
  const objectPath = `${context.organization.id}/${randomUUID()}.pdf`;
  const { error: uploadError } = await context.admin.storage.from(bucket).upload(objectPath, bytes, {
    contentType: "application/pdf", upsert: false,
  });
  if (uploadError) throw uploadError;
  const { error } = await context.admin.from("board_training_documents").insert({
    organization_id: context.organization.id, kind: input.kind, title: input.title.trim(),
    object_path: objectPath, uploaded_by: context.member.id,
  });
  if (error) {
    await context.admin.storage.from(bucket).remove([objectPath]);
    throw error;
  }
}

export async function removeTrainingDocument(documentId: string) {
  const context = await requireTrainingContext();
  requireManager(context);
  const { data, error } = await context.admin.from("board_training_documents").select("id, object_path")
    .eq("organization_id", context.organization.id).eq("id", documentId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Document was not found.");
  const { error: deleteError } = await context.admin.from("board_training_documents").delete().eq("id", data.id);
  if (deleteError) throw deleteError;
  await context.admin.storage.from(bucket).remove([data.object_path]);
}

export async function inviteTrainingMember(input: {
  email: string; courseId: TrainingCourseId; language: TrainingLanguage; dueDate: string | null;
}) {
  const context = await requireTrainingContext();
  requireManager(context);
  const email = input.email.trim().toLowerCase();
  const { data: members, error: membersError } = await context.admin.from("organization_members")
    .select("user_id").eq("organization_id", context.organization.id).eq("status", "active");
  if (membersError) throw membersError;
  let targetMemberId: string | null = null;
  for (const member of members ?? []) {
    const { data: userData, error } = await context.admin.auth.admin.getUserById(member.user_id);
    if (error) throw error;
    if (userData.user?.email?.toLowerCase() === email) targetMemberId = member.user_id;
  }
  if (!targetMemberId) throw new Error("Add this director to Team first, then send the training invitation.");
  if (input.courseId === "refresher") {
    const { data: prerequisite, error } = await context.admin.from("board_training_certificates")
      .select("id").eq("organization_id", context.organization.id)
      .eq("user_id", targetMemberId).eq("course_id", "essentials").maybeSingle();
    if (error) throw error;
    if (!prerequisite) throw new Error("This director must complete Governance Essentials first.");
  }
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  // Fail before storing an unusable invitation when email is not configured.
  const resend = getResend();
  const { data, error } = await context.admin.from("board_training_invitations").insert({
    organization_id: context.organization.id, email, course_id: input.courseId,
    locale: input.language, due_date: input.dueDate, token_hash: hashToken(token),
    expires_at: expiresAt, invited_by: context.member.id,
  }).select("id").single();
  if (error) throw error;
  const url = `${getAppUrl()}/modules/board-training/invite/${token}?lang=${input.language}`;
  const subject = input.language === "fr" ? "Invitation à la formation du conseil" : "Your board training invitation";
  const text = input.language === "fr"
    ? `${context.organization.name} vous invite à suivre la formation du conseil Olea Connects. Ouvrez ${url}${input.dueDate ? ` avant le ${input.dueDate}` : ""}.`
    : `${context.organization.name} invites you to Olea Connects board training. Open ${url}${input.dueDate ? ` by ${input.dueDate}` : ""}.`;
  const sent = await resend.emails.send({ from: getEmailSender(), to: getEmailRecipient(email), replyTo: getReplyTo(), subject, text });
  if (sent.error) {
    await context.admin.from("board_training_invitations").update({ status: "revoked" }).eq("id", data.id);
    throw new Error("The invitation email could not be sent. Try again.");
  }
}

export async function revokeTrainingInvitation(invitationId: string) {
  const context = await requireTrainingContext();
  requireManager(context);
  const { error } = await context.admin.from("board_training_invitations").update({ status: "revoked" })
    .eq("id", invitationId).eq("organization_id", context.organization.id).eq("status", "pending");
  if (error) throw error;
}

export async function resendTrainingInvitation(invitationId: string) {
  const context = await requireTrainingContext();
  requireManager(context);
  const { data, error } = await context.admin.from("board_training_invitations")
    .select("id, email, course_id, locale, due_date, status, expires_at")
    .eq("id", invitationId).eq("organization_id", context.organization.id).maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "pending") throw new Error("Only a pending invitation can be resent.");
  await inviteTrainingMember({
    email: data.email, courseId: data.course_id as TrainingCourseId,
    language: data.locale as TrainingLanguage, dueDate: data.due_date,
  });
  await revokeTrainingInvitation(data.id);
}

export async function acceptTrainingInvitation(token: string) {
  const context = await requireTrainingContext();
  const { data, error } = await context.admin.from("board_training_invitations")
    .select("id, organization_id, email, course_id, locale, status, expires_at")
    .eq("token_hash", hashToken(token)).maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "pending" || new Date(data.expires_at) < new Date() ||
      data.organization_id !== context.organization.id || data.email.toLowerCase() !== context.member.email.toLowerCase()) {
    throw new Error("This invitation is unavailable for your account.");
  }
  await startTraining(data.course_id as TrainingCourseId, data.locale as TrainingLanguage);
  const { error: updateError } = await context.admin.from("board_training_invitations").update({
    status: "accepted", accepted_by: context.member.id, accepted_at: new Date().toISOString(),
  }).eq("id", data.id).eq("status", "pending");
  if (updateError) throw updateError;
  return data.course_id as TrainingCourseId;
}

export async function getTrainingInvitationPreview(token: string) {
  const context = await requireTrainingContext();
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return { valid: false, language: "en" as const, courseId: undefined, organizationName: context.organization.name };
  }
  const { data, error } = await context.admin.from("board_training_invitations")
    .select("organization_id, email, course_id, locale, status, expires_at")
    .eq("token_hash", hashToken(token)).maybeSingle();
  if (error) throw error;
  return {
    valid: Boolean(data && data.status === "pending" && new Date(data.expires_at) > new Date() &&
      data.organization_id === context.organization.id && data.email.toLowerCase() === context.member.email.toLowerCase()),
    language: data?.locale === "fr" ? "fr" as const : "en" as const,
    courseId: data?.course_id as TrainingCourseId | undefined,
    organizationName: context.organization.name,
  };
}

export async function getTrainingCertificate(certificateId: string) {
  const context = await requireTrainingContext();
  const { data, error } = await context.admin.from("board_training_certificates").select("*")
    .eq("id", certificateId).eq("organization_id", context.organization.id).maybeSingle();
  if (error) throw error;
  if (!data || (data.user_id !== context.member.id && !context.isManager)) throw new Error("Certificate was not found.");
  return { context, certificate: data as {
    id: string; enrollment_id: string; organization_id: string; user_id: string;
    certificate_number: string; display_name: string; course_id: TrainingCourseId;
    locale: TrainingLanguage; score: number; total_questions: number;
    issued_at: string; expires_at: string; emailed_at: string | null;
  } };
}

export async function getMyTrainingCertificates() {
  const session = await requireMemberContext();
  const admin = createAdminClient();
  const { data, error } = await admin.from("board_training_certificates")
    .select("id, organization_id, certificate_number, display_name, course_id, locale, score, total_questions, issued_at, expires_at")
    .eq("user_id", session.member.id).order("issued_at", { ascending: false });
  if (error) throw error;
  const orgIds = [...new Set((data ?? []).map((certificate) => certificate.organization_id))];
  const { data: organizations, error: orgError } = orgIds.length
    ? await admin.from("organizations").select("id, name").in("id", orgIds)
    : { data: [], error: null };
  if (orgError) throw orgError;
  return (data ?? []).map((certificate) => ({
    ...certificate,
    organizationName: (organizations ?? []).find((organization) => organization.id === certificate.organization_id)?.name ?? "Olea Connects",
  }));
}

export async function getTrainingCertificateForDownload(certificateId: string) {
  const session = await requireMemberContext();
  const admin = createAdminClient();
  const { data, error } = await admin.from("board_training_certificates").select("*").eq("id", certificateId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Certificate was not found.");
  if (data.user_id !== session.member.id) {
    const { data: membership } = await admin.from("organization_members")
      .select("role").eq("organization_id", data.organization_id)
      .eq("user_id", session.member.id).eq("status", "active").maybeSingle();
    if (!membership || !["owner", "admin"].includes(membership.role)) throw new Error("Certificate was not found.");
  }
  const { data: organization } = await admin.from("organizations").select("name").eq("id", data.organization_id).maybeSingle();
  return { certificate: data, organizationName: organization?.name ?? "Olea Connects" };
}

export async function verifyTrainingCertificate(number: string) {
  if (!/^OLEA-\d{4}-[A-F0-9]{12}$/.test(number)) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.from("board_training_certificates")
    .select("certificate_number, display_name, course_id, issued_at, expires_at, organization_id")
    .eq("certificate_number", number).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: organization } = await admin.from("organizations").select("name").eq("id", data.organization_id).maybeSingle();
  return { ...data, organizationName: organization?.name ?? "Olea Connects", valid: new Date(data.expires_at) >= new Date() };
}

export async function getTrainingReport(language: TrainingLanguage) {
  const context = await requireTrainingContext();
  const settings = await getTrainingSettings(context);
  if (!context.isManager && settings.chair_user_id !== context.member.id) {
    notFound();
  }
  const { data: certificates, error: certificateError } = await context.admin.from("board_training_certificates")
    .select("enrollment_id, user_id, course_id").eq("organization_id", context.organization.id);
  if (certificateError) throw certificateError;
  const essentialsIds = (certificates ?? []).filter((item) => item.course_id === "essentials").map((item) => item.enrollment_id);
  if (!essentialsIds.length) return { report: null, completedCount: 0, topics: [] };
  const { data: enrollments, error } = await context.admin.from("board_training_enrollments")
    .select("id, user_id, confidence_before, confidence_after, action_plan")
    .eq("organization_id", context.organization.id).in("id", essentialsIds);
  if (error) throw error;
  const refresherIds = (certificates ?? []).filter((item) => item.course_id === "refresher").map((item) => item.enrollment_id);
  const { data: refreshers, error: refresherError } = refresherIds.length
    ? await context.admin.from("board_training_enrollments").select("user_id, follow_up")
      .eq("organization_id", context.organization.id).in("id", refresherIds)
    : { data: [], error: null };
  if (refresherError) throw refresherError;
  const followUpByUser = new Map((refreshers ?? []).map((item) => [item.user_id, item.follow_up as Record<string, string>]));
  const rows = await Promise.all((enrollments ?? []).map(async (enrollment) => {
    const { data: attempt, error: attemptError } = await context.admin.from("board_training_attempts")
      .select("topic_scores").eq("enrollment_id", enrollment.id)
      .order("submitted_at", { ascending: true }).limit(1).maybeSingle();
    if (attemptError) throw attemptError;
    return {
      confidenceBefore: enrollment.confidence_before as Record<string, number>,
      confidenceAfter: enrollment.confidence_after as Record<string, number>,
      topicScores: (attempt?.topic_scores ?? {}) as Record<string, { correct: number; total: number }>,
      actionPlan: enrollment.action_plan as string[],
      followUp: followUpByUser.get(enrollment.user_id) ?? {},
    };
  }));
  const course = getTrainingCourse("essentials", language);
  const topics = course.reflection?.topics ?? [];
  const englishSuggestions = getTrainingCourse("essentials", "en").actionPlan?.suggestions ?? [];
  const frenchSuggestions = getTrainingCourse("essentials", "fr").actionPlan?.suggestions ?? [];
  const displaySuggestions = course.actionPlan?.suggestions ?? [];
  const normalizedRows = rows.map((row) => ({
    ...row,
    actionPlan: row.actionPlan.map((item) => {
      const index = Math.max(englishSuggestions.indexOf(item), frenchSuggestions.indexOf(item));
      return index >= 0 ? displaySuggestions[index] : item;
    }),
  }));
  return { report: aggregateTrainingReport(normalizedRows, topics.map((topic) => topic.id), displaySuggestions), completedCount: rows.length, topics };
}

export async function emailTrainingCertificate(certificateId: string) {
  if (!process.env.RESEND_API_KEY) return false;
  const { context, certificate } = await getTrainingCertificate(certificateId);
  if (certificate.user_id !== context.member.id) throw new Error("Only the certificate holder can request delivery.");
  const claimedAt = new Date().toISOString();
  const { data: claim, error: claimError } = await context.admin.from("board_training_certificates")
    .update({ email_claimed_at: claimedAt }).eq("id", certificate.id)
    .is("emailed_at", null).is("email_claimed_at", null).select("id").maybeSingle();
  if (claimError) throw claimError;
  if (!claim) return false;
  const verificationUrl = `${getAppUrl()}/verify/training/${certificate.certificate_number}`;
  try {
    const buffer = await renderTrainingCertificatePdf({
      displayName: certificate.display_name, organizationName: context.organization.name,
      courseId: certificate.course_id, language: certificate.locale,
      certificateNumber: certificate.certificate_number, score: certificate.score,
      totalQuestions: certificate.total_questions, issuedAt: certificate.issued_at,
      expiresAt: certificate.expires_at, verificationUrl,
    });
    const french = certificate.locale === "fr";
    const { data: trainingPlan, error: planError } = await context.admin.from("board_training_enrollments")
      .select("action_plan").eq("id", certificate.enrollment_id).single();
    if (planError) throw planError;
    const commitments = ((trainingPlan?.action_plan ?? []) as string[]).map((item) => `- ${item}`).join("\n");
    const { error } = await getResend().emails.send({
      from: getEmailSender(), to: getEmailRecipient(context.member.email), replyTo: getReplyTo(),
      subject: french ? "Votre certificat de formation du conseil" : "Your board training certificate",
      text: french
        ? `Félicitations! Votre certificat est joint. Vérifiez-le à ${verificationUrl}.\n\nVos actions pour les 90 prochains jours :\n${commitments}`
        : `Congratulations! Your certificate is attached. Verify it at ${verificationUrl}.\n\nYour actions for the next 90 days:\n${commitments}`,
      attachments: [{ filename: `${certificate.certificate_number}.pdf`, content: buffer }],
    });
    if (error) throw new Error("Certificate email delivery failed.");
    const { error: markError } = await context.admin.from("board_training_certificates")
      .update({ emailed_at: new Date().toISOString() }).eq("id", certificate.id);
    if (markError) throw markError;

    const settings = await getTrainingSettings(context);
    const { data: admins } = await context.admin.from("organization_members").select("user_id")
      .eq("organization_id", context.organization.id).in("role", ["owner", "admin"]).eq("status", "active");
    const recipients = new Set((admins ?? []).map((member) => member.user_id));
    if (settings.notify_chair && settings.chair_user_id) recipients.add(settings.chair_user_id);
    recipients.delete(context.member.id);
    for (const userId of recipients) {
      const { data: userData } = await context.admin.auth.admin.getUserById(userId);
      if (!userData.user?.email) continue;
      await getResend().emails.send({
        from: getEmailSender(), to: getEmailRecipient(userData.user.email), replyTo: getReplyTo(),
        subject: french ? "Formation du conseil terminée" : "Board training completed",
        text: french
          ? `${certificate.display_name} a terminé sa formation du conseil. Certificat : ${certificate.certificate_number}.`
          : `${certificate.display_name} completed board training. Certificate: ${certificate.certificate_number}.`,
      });
    }
    return true;
  } catch (error) {
    await context.admin.from("board_training_certificates").update({ email_claimed_at: null })
      .eq("id", certificate.id).is("emailed_at", null);
    throw error;
  }
}
