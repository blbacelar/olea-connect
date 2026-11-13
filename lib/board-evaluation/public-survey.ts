import "server-only";

import { createLogoSignedUrl } from "@/lib/data/brand-assets";
import { createAdminClient } from "@/utils/supabase/admin";

import { annualQuestions, meetingQuestions } from "./prototype-domain";
import { parseQuestionSelection } from "./question-bank";

type SurveyKind = "annual" | "meeting";

export async function getPublicBoardEvaluationSurvey(kind: SurveyKind, token: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return null;
  const admin = createAdminClient();
  if (kind === "annual") {
    const { data: cycle, error } = await admin.from("board_evaluation_cycles")
      .select("organization_id,year,status,closes_on,question_selection,thank_you_copy")
      .eq("public_token", token).maybeSingle();
    if (error) throw error;
    if (!cycle) return null;
    const brand = await getPublicBrand(admin, cycle.organization_id);
    const selection = parseQuestionSelection(cycle.question_selection);
    return {
      kind,
      token,
      title: `${cycle.year} annual board self-evaluation`,
      year: cycle.year,
      meetingDate: null,
      open: cycle.status === "open" && (!cycle.closes_on || cycle.closes_on >= new Date().toISOString().slice(0, 10)),
      closesOn: cycle.closes_on,
      selectionMode: selection?.rated.length ? "bank" as const : "default" as const,
      selectedRated: selection?.rated.length ? selection.rated : annualQuestions.map((question) => question.id),
      selectedOpen: selection?.rated.length ? selection.open : ["0", "1", "2", "3"],
      thankYouCopy: cycle.thank_you_copy as Record<string, unknown>,
      ...brand,
    };
  }
  const { data: survey, error } = await admin.from("board_evaluation_meeting_surveys")
    .select("organization_id,meeting_title,meeting_date,status,question_selection")
    .eq("public_token", token).maybeSingle();
  if (error) throw error;
  if (!survey) return null;
  const brand = await getPublicBrand(admin, survey.organization_id);
  const selection = parseQuestionSelection(survey.question_selection);
  return {
    kind,
    token,
    title: survey.meeting_title,
    year: null,
    meetingDate: survey.meeting_date,
    open: survey.status === "open",
    closesOn: null,
    selectionMode: selection?.meeting.length ? "bank" as const : "default" as const,
    selectedRated: selection?.meeting.length ? selection.meeting : meetingQuestions.map((question) => question.id),
    selectedOpen: selection?.meeting.length ? selection.meetingOpen : [],
    thankYouCopy: {} as Record<string, unknown>,
    ...brand,
  };
}

async function getPublicBrand(admin: ReturnType<typeof createAdminClient>, organizationId: string) {
  const [{ data: organization, error: organizationError }, { data: brand, error: brandError }] = await Promise.all([
    admin.from("organizations").select("name").eq("id", organizationId).single(),
    admin.from("organization_brand_profiles")
      .select("display_name,logo_path,primary_color,secondary_color")
      .eq("organization_id", organizationId).maybeSingle(),
  ]);
  if (organizationError) throw organizationError;
  if (brandError) throw brandError;
  return {
    organizationName: brand?.display_name || organization.name,
    primaryColor: brand?.primary_color || "#134E6E",
    secondaryColor: brand?.secondary_color || "#D2571C",
    logoUrl: await createLogoSignedUrl(admin, brand?.logo_path),
  };
}
