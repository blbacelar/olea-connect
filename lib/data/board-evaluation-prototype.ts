import "server-only";

import { aggregateAnnualResponses, aggregateMeetingResponses } from "@/lib/board-evaluation/prototype-domain";
import { parseQuestionSelection } from "@/lib/board-evaluation/question-bank";
import { getGovernanceGrowthContext } from "@/lib/governance-growth/access";
import { boardCalendarModule } from "@/lib/modules";
import { buildBoardPackageMeetings } from "@/lib/template-renderer/board-calendar-packages";
import type { TemplateFormData } from "@/lib/template-renderer/types";

export async function getBoardEvaluationPrototypeData(selectedCycleId?: string) {
  const context = await getGovernanceGrowthContext("board_evaluation");
  const base = {
    hasAccess: context.hasAccess,
    canManage: context.canManage,
    organizationName: context.session.organization.brand.organizationName,
    brand: context.session.organization.brand,
  };
  if (!context.hasAccess) {
    return { ...base, cycle: null, cycles: [], annual: null, meetingSurveys: [], calendarMeetings: [], actions: [], openAnswers: [], legacyResponseCount: 0 };
  }
  const orgId = context.session.organization.id;
  const [{ data: cycleRows, error: cycleError }, { data: meetingRows, error: meetingError }, { data: calendarResource, error: resourceError }] = await Promise.all([
    context.admin.from("board_evaluation_cycles")
      .select("id,year,status,closes_on,public_token,question_selection,invited_count,summary_report,thank_you_copy")
      .eq("organization_id", orgId).order("year", { ascending: false }),
    context.admin.from("board_evaluation_meeting_surveys")
      .select("id,template_instance_id,meeting_id,meeting_title,meeting_date,public_token,status,question_selection")
      .eq("organization_id", orgId).order("meeting_date", { ascending: false }).limit(100),
    context.admin.from("resources").select("id").eq("slug", boardCalendarModule.resourceSlug).maybeSingle(),
  ]);
  if (cycleError) throw cycleError;
  if (meetingError) throw meetingError;
  if (resourceError) throw resourceError;
  const { data: calendarRows, error: calendarError } = calendarResource
    ? await context.admin.from("template_instances")
        .select("id,title,form_data")
        .eq("organization_id", orgId).eq("resource_id", calendarResource.id)
        .order("updated_at", { ascending: false }).limit(20)
    : { data: [], error: null };
  if (calendarError) throw calendarError;
  const calendarMeetings = (calendarRows ?? []).flatMap((instance) =>
    buildBoardPackageMeetings(instance.form_data as TemplateFormData)
      .filter((meeting) => /^\d{4}-\d{2}-\d{2}$/.test(meeting.date))
      .map((meeting) => ({
        templateInstanceId: instance.id,
        calendarTitle: instance.title,
        meetingId: meeting.id,
        title: meeting.title,
        date: meeting.date,
      })),
  );
  const cycles = (cycleRows ?? []).map((row) => ({ id: row.id, year: row.year, status: row.status }));
  const selected = cycleRows?.find((row) => row.id === selectedCycleId) ?? cycleRows?.[0] ?? null;
  const meetingIds = (meetingRows ?? []).map((row) => row.id);
  const { data: meetingResponses, error: meetingResponseError } = meetingIds.length
    ? await context.admin.from("board_evaluation_meeting_ratings")
        .select("survey_id,ratings")
        .eq("organization_id", orgId).in("survey_id", meetingIds)
    : { data: [], error: null };
  if (meetingResponseError) throw meetingResponseError;
  const reviewableMeetingIds = context.canManage ? (meetingRows ?? [])
    .filter((row) => row.status === "closed" && (meetingResponses ?? []).filter((response) => response.survey_id === row.id).length >= 5)
    .map((row) => row.id) : [];
  const { data: meetingComments, error: meetingCommentError } = reviewableMeetingIds.length
    ? await context.admin.from("board_evaluation_meeting_comments")
        .select("id,survey_id,body,redacted_body,approved_for_report")
        .eq("organization_id", orgId).in("survey_id", reviewableMeetingIds)
        .limit(400)
    : { data: [], error: null };
  if (meetingCommentError) throw meetingCommentError;
  const meetingSurveys = (meetingRows ?? []).map((row) => {
    const responses = (meetingResponses ?? []).filter((response) => response.survey_id === row.id);
    return {
      id: row.id,
      templateInstanceId: row.template_instance_id,
      meetingId: row.meeting_id,
      title: row.meeting_title,
      date: row.meeting_date,
      token: row.public_token,
      status: row.status as "open" | "closed",
      responseCount: responses.length,
      results: aggregateMeetingResponses(
        row.status === "closed"
          ? responses.map((response) => response.ratings as Record<string, unknown>) : [],
        parseQuestionSelection(row.question_selection)?.meeting.length
          ? parseQuestionSelection(row.question_selection)?.meeting : undefined,
      ),
      questionSelection: parseQuestionSelection(row.question_selection),
      comments: (meetingComments ?? []).filter((comment) => comment.survey_id === row.id)
        .map((comment) => ({ id: comment.id, body: comment.body,
          redactedBody: comment.redacted_body, approved: comment.approved_for_report })),
    };
  });
  if (!selected) {
    return { ...base, cycle: null, cycles, annual: null, meetingSurveys, calendarMeetings, actions: [], openAnswers: [], legacyResponseCount: 0 };
  }
  const [{ data: anonymousRows, error: anonymousError }, { count: legacyResponseCount, error: legacyError }, { data: actionRows, error: actionError }] = await Promise.all([
    context.admin.from("board_evaluation_anonymous_ratings")
      .select("ratings").eq("organization_id", orgId).eq("cycle_id", selected.id),
    context.admin.from("board_evaluation_responses")
      .select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("cycle_id", selected.id),
    context.admin.from("board_evaluation_actions")
      .select("id,title,owner_name,due_on,status")
      .eq("organization_id", orgId).eq("cycle_id", selected.id).order("created_at"),
  ]);
  if (anonymousError) throw anonymousError;
  if (legacyError) throw legacyError;
  if (actionError) throw actionError;
  const { data: openAnswerRows, error: openAnswerError } = context.canManage && selected.status === "closed" && (anonymousRows?.length ?? 0) >= 5
    ? await context.admin.from("board_evaluation_open_text")
        .select("id,question_id,body,redacted_body,approved_for_report")
        .eq("organization_id", orgId).eq("cycle_id", selected.id)
        .order("question_id").limit(400)
    : { data: [], error: null };
  if (openAnswerError) throw openAnswerError;
  const previousCycle = cycleRows?.find((row) => row.year === selected.year - 1);
  const { data: previousRows, error: previousError } = previousCycle
    ? await context.admin.from("board_evaluation_anonymous_ratings")
        .select("ratings").eq("organization_id", orgId).eq("cycle_id", previousCycle.id)
    : { data: [], error: null };
  if (previousError) throw previousError;
  const previous = aggregateAnnualResponses({
    responses: (previousRows ?? []).map((row) => row.ratings as Record<string, unknown>),
    invited: previousCycle?.invited_count ?? 0,
    selectedQuestionIds: previousCycle && parseQuestionSelection(previousCycle.question_selection)?.rated.length
      ? parseQuestionSelection(previousCycle.question_selection)?.rated : undefined,
  });
  const previousSectionScores = Object.fromEntries(previous.sections
    .filter((section) => section.average !== null)
    .map((section) => [String(section.number), section.average!]));
  const annual = aggregateAnnualResponses({
    responses: selected.status === "closed"
      ? (anonymousRows ?? []).map((row) => row.ratings as Record<string, unknown>) : [],
    invited: selected.invited_count,
    previousSectionScores,
    selectedQuestionIds: parseQuestionSelection(selected.question_selection)?.rated.length
      ? parseQuestionSelection(selected.question_selection)?.rated : undefined,
  });
  const received = anonymousRows?.length ?? 0;
  return {
    ...base,
    cycles,
    cycle: {
      id: selected.id,
      year: selected.year,
      status: selected.status as "open" | "closed",
      closesOn: selected.closes_on,
      publicToken: selected.public_token,
      invitedCount: selected.invited_count,
      questionSelection: parseQuestionSelection(selected.question_selection),
      summaryReport: selected.summary_report as Record<string, unknown>,
      thankYouCopy: selected.thank_you_copy as Record<string, unknown>,
    },
    annual: {
      ...annual,
      received,
      responseRate: selected.invited_count > 0 ? Math.round(received / selected.invited_count * 100) : null,
    },
    openAnswers: (openAnswerRows ?? []).map((row) => ({
      id: row.id,
      questionId: row.question_id,
      body: row.body,
      redactedBody: row.redacted_body,
      approved: row.approved_for_report,
    })),
    meetingSurveys,
    calendarMeetings,
    legacyResponseCount: legacyResponseCount ?? 0,
    actions: (actionRows ?? []).map((row) => ({
      id: row.id, title: row.title, ownerName: row.owner_name,
      dueOn: row.due_on, status: row.status as "planned" | "in_progress" | "completed",
    })),
  };
}
