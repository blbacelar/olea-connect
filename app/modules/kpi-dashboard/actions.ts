"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireKpiDashboardForOrganization } from "@/lib/data/kpi-dashboard";
import { parseStrictInteger } from "@/lib/input-validation";
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
export type KpiDialogActionState = {
  message: string;
  status: "error" | "idle" | "success";
};

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

function toDialogError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "We could not save this item. Please try again.";
}

function dialogSuccess(message: string): KpiDialogActionState {
  return { message, status: "success" };
}

function parseYear(formData: FormData) {
  const year = parseStrictInteger(
    getFormString(formData, "reportingYear"),
    "Reporting year",
    2000,
  );
  if (year > 2100) throw new Error("Reporting year must be between 2000 and 2100.");
  return year;
}

function parseQuarter(formData: FormData) {
  const quarter = parseStrictInteger(
    getFormString(formData, "quarter"),
    "Quarter",
    1,
  );
  if (quarter > 4) throw new Error("Quarter is invalid.");
  return quarter as QuarterNumber;
}

function parseOptionalDate(formData: FormData, key: string, label: string) {
  const value = getFormString(formData, key);
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD format.`);
  }
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} must be a valid date.`);
  }
  return value;
}

function parseRequiredDate(formData: FormData, key: string, label: string) {
  const value = parseOptionalDate(formData, key, label);
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

function parseRequiredTargetNumber(formData: FormData) {
  const targetNumber = parseRequiredNumber(formData, "targetNumber", "Target number");
  if (targetNumber <= 0) {
    throw new Error("Target number must be greater than zero.");
  }
  return targetNumber;
}

function parseKpiDefinitionFields(formData: FormData) {
  return {
    domain: parseRequiredText(formData, "domain", "Domain", 80),
    name: parseRequiredText(formData, "name", "KPI name", 140),
    owner: parseOptionalText(formData, "owner", "Owner", 100),
    targetDisplay: parseRequiredText(
      formData,
      "targetDisplay",
      "Target display",
      60,
    ),
    targetNumber: parseRequiredTargetNumber(formData),
    baselineNumber: parseOptionalNumber(
      formData,
      "baselineNumber",
      "Baseline number",
    ),
    outcomeArea: parseOptionalText(
      formData,
      "outcomeArea",
      "Outcome/funder tag",
      120,
    ),
  };
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
  const reportingYear = parseYear(formData);
  const financialYearEnd = parseRequiredDate(
    formData,
    "financialYearEnd",
    "Financial year end",
  );

  const { error } = await createAdminClient()
    .from("kpi_dashboards")
    .update({
      title,
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
    const rawQuarter = parseStrictInteger(
      getFormString(formData, `month_${month.value}`),
      `Quarter for ${month.label}`,
      1,
    );
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

async function saveKpiTrackerEntry(formData: FormData) {
  const dashboard = await requireDashboardFromForm(formData);
  const quarter = parseQuarter(formData);

  const {
    baselineNumber,
    domain,
    name,
    outcomeArea,
    owner,
    targetDisplay,
    targetNumber,
  } = parseKpiDefinitionFields(formData);
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

  const { data, error } = await createAdminClient().rpc(
    "create_kpi_tracker_entry",
    {
      target_dashboard_id: dashboard.id,
      target_quarter: quarter,
      target_domain: domain,
      target_name: name,
      target_owner: owner,
      target_display: targetDisplay,
      target_number: targetNumber,
      target_baseline_number: baselineNumber,
      target_outcome_area: outcomeArea,
      target_current_value: currentValue,
      target_rag_status: ragStatus,
      target_context_notes: contextNotes,
    },
  );

  if (error) throw error;
  return data;
}

export async function createKpiTrackerEntry(formData: FormData) {
  const quarter = await saveKpiTrackerEntry(formData);
  finish(`q${quarter}`);
}

export async function createKpiTrackerEntryDialog(
  _previousState: KpiDialogActionState,
  formData: FormData,
) {
  try {
    const quarter = await saveKpiTrackerEntry(formData);
    return dialogSuccess(`KPI added to Q${quarter}.`);
  } catch (error) {
    console.error("[kpi-dashboard] create tracker entry failed", error);
    return { message: toDialogError(error), status: "error" as const };
  }
}

export async function archiveKpiDefinition(formData: FormData) {
  const { dashboard, kpiId } = await requireKpiFromForm(formData);
  const quarter = parseQuarter(formData);

  const { error } = await createAdminClient()
    .from("kpi_definitions")
    .update({ active: false })
    .eq("id", kpiId)
    .eq("dashboard_id", dashboard.id);

  if (error) throw error;
  finish(`q${quarter}`);
}

export async function saveKpiQuarterResult(formData: FormData) {
  const { dashboard, kpiId } = await requireKpiFromForm(formData);
  const quarter = parseQuarter(formData);

  const {
    baselineNumber,
    domain,
    name,
    outcomeArea,
    owner,
    targetDisplay,
    targetNumber,
  } = parseKpiDefinitionFields(formData);
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
  const { data: assignment, error: assignmentError } = await supabase
    .from("kpi_quarter_assignments")
    .select("kpi_id")
    .eq("kpi_id", kpiId)
    .eq("quarter", quarter)
    .maybeSingle<{ kpi_id: string }>();

  if (assignmentError) throw assignmentError;
  if (!assignment) {
    throw new Error(`This KPI is not tracked in Q${quarter}. Add it first.`);
  }

  const { error: definitionError } = await supabase
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

  if (definitionError) throw definitionError;

  const { error } = await supabase.from("kpi_quarter_results").upsert(
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
  const quarter = parseQuarter(formData);

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
  const shouldUpdateBoardNotes = formData.has("boardNotes");
  const boardNotes = shouldUpdateBoardNotes
    ? parseOptionalText(formData, "boardNotes", "Board notes", 1200)
    : undefined;

  const payload = {
    kpi_id: kpiId,
    full_year_rag: fullYearRag,
    ...(shouldUpdateBoardNotes ? { board_notes: boardNotes } : {}),
  };

  const { error } = await createAdminClient()
    .from("kpi_board_assessments")
    .upsert(payload, { onConflict: "kpi_id" });

  if (error) throw error;
  finish("board");
}

async function insertKpiMilestone(formData: FormData) {
  const dashboard = await requireDashboardFromForm(formData);
  const title = parseRequiredText(formData, "title", "Milestone title", 160, 3);
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
}

async function changeKpiMilestone(formData: FormData) {
  const dashboard = await requireDashboardFromForm(formData);
  const milestoneId = assertUuid(
    getFormString(formData, "milestoneId"),
    "Milestone",
  );
  const title = parseRequiredText(formData, "title", "Milestone title", 160, 3);
  const owner = parseOptionalText(formData, "owner", "Owner", 100);
  const dueDate = parseOptionalDate(formData, "dueDate", "Due date");
  const status = parseMilestoneStatus(formData.get("status"));
  const notes = parseOptionalText(formData, "notes", "Notes", 1200);

  const { data, error } = await createAdminClient()
    .from("kpi_milestones")
    .update({
      title,
      owner,
      due_date: dueDate,
      status,
      notes,
    })
    .eq("id", milestoneId)
    .eq("dashboard_id", dashboard.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  if (!data) throw new Error("Milestone not found.");
}

async function removeKpiMilestone(formData: FormData) {
  const dashboard = await requireDashboardFromForm(formData);
  const milestoneId = assertUuid(
    getFormString(formData, "milestoneId"),
    "Milestone",
  );
  const { data, error } = await createAdminClient()
    .from("kpi_milestones")
    .delete()
    .eq("id", milestoneId)
    .eq("dashboard_id", dashboard.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  if (!data) throw new Error("Milestone not found.");
}

export async function createKpiMilestone(formData: FormData) {
  await insertKpiMilestone(formData);
  finish("milestones");
}

export async function updateKpiMilestone(formData: FormData) {
  await changeKpiMilestone(formData);
  finish("milestones");
}

export async function deleteKpiMilestone(formData: FormData) {
  await removeKpiMilestone(formData);
  finish("milestones");
}

async function insertKpiRisk(formData: FormData) {
  const dashboard = await requireDashboardFromForm(formData);
  const area = parseRequiredText(formData, "area", "Risk area", 100, 2);
  const description = parseRequiredText(formData, "description", "Risk", 600, 3);
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
}

async function changeKpiRisk(formData: FormData) {
  const dashboard = await requireDashboardFromForm(formData);
  const riskId = assertUuid(getFormString(formData, "riskId"), "Risk");
  const area = parseRequiredText(formData, "area", "Risk area", 100, 2);
  const description = parseRequiredText(formData, "description", "Risk", 600, 3);
  const mitigation = parseOptionalText(
    formData,
    "mitigation",
    "Mitigation",
    1200,
  );
  const owner = parseOptionalText(formData, "owner", "Owner", 100);
  const ragStatus = parseRagStatus(formData.get("ragStatus"));

  const { data, error } = await createAdminClient()
    .from("kpi_risks")
    .update({
      area,
      description,
      mitigation,
      owner,
      rag_status: ragStatus,
    })
    .eq("id", riskId)
    .eq("dashboard_id", dashboard.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  if (!data) throw new Error("Risk not found.");
}

async function removeKpiRisk(formData: FormData) {
  const dashboard = await requireDashboardFromForm(formData);
  const riskId = assertUuid(getFormString(formData, "riskId"), "Risk");
  const { data, error } = await createAdminClient()
    .from("kpi_risks")
    .delete()
    .eq("id", riskId)
    .eq("dashboard_id", dashboard.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  if (!data) throw new Error("Risk not found.");
}

export async function createKpiRisk(formData: FormData) {
  await insertKpiRisk(formData);
  finish("milestones");
}

export async function updateKpiRisk(formData: FormData) {
  await changeKpiRisk(formData);
  finish("milestones");
}

export async function deleteKpiRisk(formData: FormData) {
  await removeKpiRisk(formData);
  finish("milestones");
}

export async function createKpiMilestoneDialog(
  _previousState: KpiDialogActionState,
  formData: FormData,
): Promise<KpiDialogActionState> {
  try {
    await insertKpiMilestone(formData);
    return dialogSuccess("Milestone added.");
  } catch (error) {
    return { message: toDialogError(error), status: "error" };
  }
}

export async function updateKpiMilestoneDialog(
  _previousState: KpiDialogActionState,
  formData: FormData,
): Promise<KpiDialogActionState> {
  try {
    await changeKpiMilestone(formData);
    return dialogSuccess("Milestone updated.");
  } catch (error) {
    return { message: toDialogError(error), status: "error" };
  }
}

export async function deleteKpiMilestoneDialog(
  _previousState: KpiDialogActionState,
  formData: FormData,
): Promise<KpiDialogActionState> {
  try {
    await removeKpiMilestone(formData);
    return dialogSuccess("Milestone deleted.");
  } catch (error) {
    return { message: toDialogError(error), status: "error" };
  }
}

export async function createKpiRiskDialog(
  _previousState: KpiDialogActionState,
  formData: FormData,
): Promise<KpiDialogActionState> {
  try {
    await insertKpiRisk(formData);
    return dialogSuccess("Risk added.");
  } catch (error) {
    return { message: toDialogError(error), status: "error" };
  }
}

export async function updateKpiRiskDialog(
  _previousState: KpiDialogActionState,
  formData: FormData,
): Promise<KpiDialogActionState> {
  try {
    await changeKpiRisk(formData);
    return dialogSuccess("Risk updated.");
  } catch (error) {
    return { message: toDialogError(error), status: "error" };
  }
}

export async function deleteKpiRiskDialog(
  _previousState: KpiDialogActionState,
  formData: FormData,
): Promise<KpiDialogActionState> {
  try {
    await removeKpiRisk(formData);
    return dialogSuccess("Risk deleted.");
  } catch (error) {
    return { message: toDialogError(error), status: "error" };
  }
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
