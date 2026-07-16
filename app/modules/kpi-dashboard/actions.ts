"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireKpiDashboardForOrganization } from "@/lib/data/kpi-dashboard";
import {
  defaultQuarterAssignments,
  monthOptions,
  nextSortOrderAfter,
  parseMilestoneStatus,
  parseOptionalNumber,
  parseOptionalText,
  parseRagStatus,
  parseRequiredNumber,
  parseRequiredText,
  validateQuarterAssignments,
  type QuarterMonthAssignment,
  type QuarterNumber,
} from "@/lib/kpi-dashboard/domain";
import { createAdminClient } from "@/utils/supabase/admin";

const KPI_PATH = "/modules/kpi-dashboard";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type SortableKpiTable = "kpi_definitions" | "kpi_milestones" | "kpi_risks";

function getFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function assertUuid(value: string, label: string) {
  if (!uuidPattern.test(value)) throw new Error(`${label} is invalid.`);
  return value;
}

async function requireDashboardFromForm(formData: FormData) {
  const dashboardId = assertUuid(getFormString(formData, "dashboardId"), "Dashboard");
  const { dashboard } = await requireKpiDashboardForOrganization();
  if (dashboard.id !== dashboardId) {
    throw new Error("This dashboard does not belong to the current workspace.");
  }
  return dashboard;
}

async function requireKpiFromForm(formData: FormData) {
  const dashboard = await requireDashboardFromForm(formData);
  const kpiId = assertUuid(getFormString(formData, "kpiId"), "KPI");
  const { data, error } = await createAdminClient()
    .from("kpi_definitions")
    .select("id")
    .eq("id", kpiId)
    .eq("dashboard_id", dashboard.id)
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  if (!data) throw new Error("This KPI does not belong to the current workspace.");
  return { dashboard, kpiId };
}

function finish(tab: string) {
  revalidatePath(KPI_PATH);
  redirect(`${KPI_PATH}?tab=${tab}`);
}

function parseYear(formData: FormData) {
  const year = Number(getFormString(formData, "reportingYear"));
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Reporting year must be between 2000 and 2100.");
  }
  return year;
}

function parseOptionalDate(formData: FormData, key: string, label: string) {
  const value = getFormString(formData, key);
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD format.`);
  }
  return value;
}

function parseRequiredTargetNumber(formData: FormData) {
  const targetNumber = parseRequiredNumber(formData, "targetNumber", "Target number");
  if (targetNumber <= 0) {
    throw new Error("Target number must be greater than zero.");
  }
  return targetNumber;
}

async function getNextSortOrder(
  supabase: ReturnType<typeof createAdminClient>,
  table: SortableKpiTable,
  dashboardId: string,
) {
  const { data, error } = await supabase
    .from(table)
    .select("sort_order")
    .eq("dashboard_id", dashboardId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  if (error) throw error;
  return nextSortOrderAfter(data?.sort_order);
}

export async function updateKpiDashboardSettings(formData: FormData) {
  const dashboard = await requireDashboardFromForm(formData);
  const title = parseRequiredText(formData, "title", "Dashboard title", 140);
  const organizationName = parseRequiredText(
    formData,
    "organizationName",
    "Organization name",
    140,
  );
  const reportingYear = parseYear(formData);
  const financialYearEnd = parseOptionalDate(
    formData,
    "financialYearEnd",
    "Financial year end",
  );

  const { error } = await createAdminClient()
    .from("kpi_dashboards")
    .update({
      title,
      organization_name: organizationName,
      reporting_year: reportingYear,
      financial_year_end: financialYearEnd,
    })
    .eq("id", dashboard.id);

  if (error) throw error;
  finish("setup");
}

export async function updateKpiQuarterSettings(formData: FormData) {
  const dashboard = await requireDashboardFromForm(formData);
  const assignments: QuarterMonthAssignment[] = monthOptions.map((month, index) => {
    const rawQuarter = Number(getFormString(formData, `month_${month.value}`));
    return {
      monthNumber: month.value,
      quarter: rawQuarter as QuarterNumber,
      sortOrder: index + 1,
    };
  });
  const validationErrors = validateQuarterAssignments(assignments);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join(" "));
  }

  const supabase = createAdminClient();
  const { error: deleteError } = await supabase
    .from("kpi_quarter_settings")
    .delete()
    .eq("dashboard_id", dashboard.id);

  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from("kpi_quarter_settings")
    .insert(
      assignments.map((assignment) => ({
        dashboard_id: dashboard.id,
        quarter: assignment.quarter,
        month_number: assignment.monthNumber,
        sort_order: assignment.sortOrder,
      })),
    );

  if (insertError) throw insertError;
  finish("settings");
}

export async function resetKpiQuarterSettings(formData: FormData) {
  const dashboard = await requireDashboardFromForm(formData);
  const supabase = createAdminClient();
  const { error: deleteError } = await supabase
    .from("kpi_quarter_settings")
    .delete()
    .eq("dashboard_id", dashboard.id);

  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from("kpi_quarter_settings")
    .insert(
      defaultQuarterAssignments().map((assignment) => ({
        dashboard_id: dashboard.id,
        quarter: assignment.quarter,
        month_number: assignment.monthNumber,
        sort_order: assignment.sortOrder,
      })),
    );

  if (insertError) throw insertError;
  finish("settings");
}

export async function createKpiTrackerEntry(formData: FormData) {
  const dashboard = await requireDashboardFromForm(formData);
  const quarter = Number(getFormString(formData, "quarter"));
  if (![1, 2, 3, 4].includes(quarter)) {
    throw new Error("Quarter is invalid.");
  }

  const domain = parseRequiredText(formData, "domain", "Domain", 80);
  const name = parseRequiredText(formData, "name", "KPI name", 140);
  const owner = parseOptionalText(formData, "owner", "Owner", 100);
  const targetDisplay = parseRequiredText(
    formData,
    "targetDisplay",
    "Target display",
    60,
  );
  const targetNumber = parseRequiredTargetNumber(formData);
  const baselineNumber = parseOptionalNumber(
    formData,
    "baselineNumber",
    "Baseline number",
  );
  const outcomeArea = parseOptionalText(
    formData,
    "outcomeArea",
    "Outcome/funder tag",
    120,
  );
  const currentValue = parseOptionalNumber(
    formData,
    "currentValue",
    "Current value",
  );
  const ragStatus = parseRagStatus(formData.get("ragStatus"));
  const contextNotes = parseOptionalText(
    formData,
    "contextNotes",
    "Context notes",
    1200,
  );

  const supabase = createAdminClient();
  const sortOrder = await getNextSortOrder(
    supabase,
    "kpi_definitions",
    dashboard.id,
  );

  const { data, error } = await supabase
    .from("kpi_definitions")
    .insert({
      dashboard_id: dashboard.id,
      domain,
      name,
      owner,
      target_display: targetDisplay,
      target_number: targetNumber,
      baseline_number: baselineNumber,
      outcome_area: outcomeArea,
      sort_order: sortOrder,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;

  const hasQuarterResult =
    currentValue !== null || ragStatus !== "na" || contextNotes.length > 0;

  if (hasQuarterResult) {
    const { error: resultError } = await supabase
      .from("kpi_quarter_results")
      .insert({
        kpi_id: data.id,
        quarter,
        current_value: currentValue,
        rag_status: ragStatus,
        context_notes: contextNotes,
      });

    if (resultError) {
      const { error: cleanupError } = await supabase
        .from("kpi_definitions")
        .delete()
        .eq("id", data.id);
      if (cleanupError) {
        throw new Error(
          `KPI result could not be saved, and cleanup failed: ${cleanupError.message}`,
        );
      }
      throw resultError;
    }
  }
  finish(`q${quarter}`);
}

export async function updateKpiDefinition(formData: FormData) {
  const { dashboard, kpiId } = await requireKpiFromForm(formData);
  const domain = parseRequiredText(formData, "domain", "Domain", 80);
  const name = parseRequiredText(formData, "name", "KPI name", 140);
  const owner = parseOptionalText(formData, "owner", "Owner", 100);
  const targetDisplay = parseRequiredText(
    formData,
    "targetDisplay",
    "Target display",
    60,
  );
  const targetNumber = parseRequiredTargetNumber(formData);
  const baselineNumber = parseOptionalNumber(
    formData,
    "baselineNumber",
    "Baseline number",
  );
  const outcomeArea = parseOptionalText(
    formData,
    "outcomeArea",
    "Outcome/funder tag",
    120,
  );

  const { error } = await createAdminClient()
    .from("kpi_definitions")
    .update({
      domain,
      name,
      owner,
      target_display: targetDisplay,
      target_number: targetNumber,
      baseline_number: baselineNumber,
      outcome_area: outcomeArea,
    })
    .eq("id", kpiId)
    .eq("dashboard_id", dashboard.id);

  if (error) throw error;
  finish("setup");
}

export async function archiveKpiDefinition(formData: FormData) {
  const { dashboard, kpiId } = await requireKpiFromForm(formData);
  const { error } = await createAdminClient()
    .from("kpi_definitions")
    .update({ active: false })
    .eq("id", kpiId)
    .eq("dashboard_id", dashboard.id);

  if (error) throw error;
  finish("setup");
}

export async function saveKpiQuarterResult(formData: FormData) {
  const { kpiId } = await requireKpiFromForm(formData);
  const quarter = Number(getFormString(formData, "quarter"));
  if (![1, 2, 3, 4].includes(quarter)) {
    throw new Error("Quarter is invalid.");
  }

  const currentValue = parseOptionalNumber(
    formData,
    "currentValue",
    "Current value",
  );
  const ragStatus = parseRagStatus(formData.get("ragStatus"));
  const contextNotes = parseOptionalText(
    formData,
    "contextNotes",
    "Context notes",
    1200,
  );

  const { error } = await createAdminClient().from("kpi_quarter_results").upsert(
    {
      kpi_id: kpiId,
      quarter,
      current_value: currentValue,
      rag_status: ragStatus,
      context_notes: contextNotes,
    },
    { onConflict: "kpi_id,quarter" },
  );

  if (error) throw error;
  finish(`q${quarter}`);
}

export async function deleteKpiQuarterResult(formData: FormData) {
  const { kpiId } = await requireKpiFromForm(formData);
  const quarter = Number(getFormString(formData, "quarter"));
  if (![1, 2, 3, 4].includes(quarter)) {
    throw new Error("Quarter is invalid.");
  }

  const { error } = await createAdminClient()
    .from("kpi_quarter_results")
    .delete()
    .eq("kpi_id", kpiId)
    .eq("quarter", quarter);

  if (error) throw error;
  finish(`q${quarter}`);
}

export async function saveKpiBoardAssessment(formData: FormData) {
  const { kpiId } = await requireKpiFromForm(formData);
  const fullYearRag = parseRagStatus(formData.get("fullYearRag"));
  const boardNotes = parseOptionalText(formData, "boardNotes", "Board notes", 1200);

  const { error } = await createAdminClient().from("kpi_board_assessments").upsert(
    {
      kpi_id: kpiId,
      full_year_rag: fullYearRag,
      board_notes: boardNotes,
    },
    { onConflict: "kpi_id" },
  );

  if (error) throw error;
  finish("board");
}

export async function createKpiMilestone(formData: FormData) {
  const dashboard = await requireDashboardFromForm(formData);
  const title = parseRequiredText(formData, "title", "Milestone title", 160);
  const owner = parseOptionalText(formData, "owner", "Owner", 100);
  const dueDate = parseOptionalDate(formData, "dueDate", "Due date");
  const status = parseMilestoneStatus(formData.get("status"));
  const notes = parseOptionalText(formData, "notes", "Notes", 1200);

  const supabase = createAdminClient();
  const sortOrder = await getNextSortOrder(
    supabase,
    "kpi_milestones",
    dashboard.id,
  );

  const { error } = await supabase.from("kpi_milestones").insert({
    dashboard_id: dashboard.id,
    title,
    owner,
    due_date: dueDate,
    status,
    notes,
    sort_order: sortOrder,
  });

  if (error) throw error;
  finish("milestones");
}

export async function deleteKpiMilestone(formData: FormData) {
  await requireDashboardFromForm(formData);
  const milestoneId = assertUuid(getFormString(formData, "milestoneId"), "Milestone");
  const { error } = await createAdminClient()
    .from("kpi_milestones")
    .delete()
    .eq("id", milestoneId);

  if (error) throw error;
  finish("milestones");
}

export async function createKpiRisk(formData: FormData) {
  const dashboard = await requireDashboardFromForm(formData);
  const area = parseRequiredText(formData, "area", "Risk area", 100);
  const description = parseRequiredText(formData, "description", "Risk", 600);
  const mitigation = parseOptionalText(formData, "mitigation", "Mitigation", 1200);
  const owner = parseOptionalText(formData, "owner", "Owner", 100);
  const ragStatus = parseRagStatus(formData.get("ragStatus"));

  const supabase = createAdminClient();
  const sortOrder = await getNextSortOrder(supabase, "kpi_risks", dashboard.id);

  const { error } = await supabase.from("kpi_risks").insert({
    dashboard_id: dashboard.id,
    area,
    description,
    mitigation,
    owner,
    rag_status: ragStatus,
    sort_order: sortOrder,
  });

  if (error) throw error;
  finish("milestones");
}

export async function deleteKpiRisk(formData: FormData) {
  await requireDashboardFromForm(formData);
  const riskId = assertUuid(getFormString(formData, "riskId"), "Risk");
  const { error } = await createAdminClient()
    .from("kpi_risks")
    .delete()
    .eq("id", riskId);

  if (error) throw error;
  finish("milestones");
}

export async function saveKpiAnnualSummary(formData: FormData) {
  const dashboard = await requireDashboardFromForm(formData);
  const payload = {
    dashboard_id: dashboard.id,
    overview: parseOptionalText(formData, "overview", "Overview", 2000),
    achievements: parseOptionalText(formData, "achievements", "Achievements", 2000),
    challenges: parseOptionalText(formData, "challenges", "Challenges", 2000),
    stakeholder_story: parseOptionalText(
      formData,
      "stakeholderStory",
      "Stakeholder story",
      2000,
    ),
    financial_context: parseOptionalText(
      formData,
      "financialContext",
      "Financial context",
      2000,
    ),
    risk_response: parseOptionalText(formData, "riskResponse", "Risk response", 2000),
    next_steps: parseOptionalText(formData, "nextSteps", "Next steps", 2000),
  };

  const { error } = await createAdminClient()
    .from("kpi_annual_summaries")
    .upsert(payload, { onConflict: "dashboard_id" });

  if (error) throw error;
  finish("annual");
}
