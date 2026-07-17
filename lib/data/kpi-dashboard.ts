import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";
import { requireMemberContext } from "@/lib/data/member-context";
import {
  defaultQuarterAssignments,
  type MilestoneStatus,
  type QuarterMonthAssignment,
  type QuarterNumber,
  type RagStatus,
} from "@/lib/kpi-dashboard/domain";

export type KpiDashboard = {
  id: string;
  organizationId: string;
  title: string;
  organizationName: string;
  reportingYear: number;
  financialYearEnd: string | null;
};

export type KpiDefinition = {
  id: string;
  domain: string;
  name: string;
  owner: string;
  targetDisplay: string;
  targetNumber: number;
  baselineNumber: number | null;
  outcomeArea: string;
  sortOrder: number;
};

export type KpiQuarterResult = {
  id: string;
  kpiId: string;
  quarter: QuarterNumber;
  currentValue: number | null;
  ragStatus: RagStatus;
  contextNotes: string;
};

export type KpiQuarterAssignment = {
  kpiId: string;
  quarter: QuarterNumber;
};

export type KpiBoardAssessment = {
  id: string;
  kpiId: string;
  fullYearRag: RagStatus;
  boardNotes: string;
};

export type KpiMilestone = {
  id: string;
  title: string;
  owner: string;
  dueDate: string | null;
  status: MilestoneStatus;
  notes: string;
};

export type KpiRisk = {
  id: string;
  area: string;
  description: string;
  mitigation: string;
  owner: string;
  ragStatus: RagStatus;
};

export type KpiAnnualSummary = {
  overview: string;
  achievements: string;
  challenges: string;
  stakeholderStory: string;
  financialContext: string;
  riskResponse: string;
  nextSteps: string;
};

export type KpiDashboardData = {
  dashboard: KpiDashboard;
  quarters: QuarterMonthAssignment[];
  kpis: KpiDefinition[];
  results: KpiQuarterResult[];
  assignments: KpiQuarterAssignment[];
  assessments: KpiBoardAssessment[];
  milestones: KpiMilestone[];
  risks: KpiRisk[];
  annualSummary: KpiAnnualSummary;
};

type DashboardRow = {
  id: string;
  organization_id: string;
  title: string;
  organization_name: string;
  reporting_year: number;
  financial_year_end: string | null;
};

type QuarterRow = {
  quarter: number;
  month_number: number;
  sort_order: number;
};

type KpiDefinitionRow = {
  id: string;
  domain: string;
  name: string;
  owner: string;
  target_display: string;
  target_number: number | string;
  baseline_number: number | string | null;
  outcome_area: string;
  sort_order: number;
};

type KpiQuarterResultRow = {
  id: string;
  kpi_id: string;
  quarter: number;
  current_value: number | string | null;
  rag_status: RagStatus;
  context_notes: string;
};

type KpiQuarterAssignmentRow = {
  kpi_id: string;
  quarter: number;
};

type KpiBoardAssessmentRow = {
  id: string;
  kpi_id: string;
  full_year_rag: RagStatus;
  board_notes: string;
};

type KpiMilestoneRow = {
  id: string;
  title: string;
  owner: string;
  due_date: string | null;
  status: MilestoneStatus;
  notes: string;
};

type KpiRiskRow = {
  id: string;
  area: string;
  description: string;
  mitigation: string;
  owner: string;
  rag_status: RagStatus;
};

type KpiAnnualSummaryRow = {
  overview: string;
  achievements: string;
  challenges: string;
  stakeholder_story: string;
  financial_context: string;
  risk_response: string;
  next_steps: string;
} | null;

function asNumber(value: number | string | null) {
  if (value === null) return null;
  return typeof value === "number" ? value : Number(value);
}

function mapDashboard(row: DashboardRow): KpiDashboard {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    organizationName: row.organization_name,
    reportingYear: row.reporting_year,
    financialYearEnd: row.financial_year_end,
  };
}

function mapQuarter(row: QuarterRow): QuarterMonthAssignment {
  return {
    monthNumber: row.month_number,
    quarter: row.quarter as QuarterNumber,
    sortOrder: row.sort_order,
  };
}

function mapKpi(row: KpiDefinitionRow): KpiDefinition {
  return {
    id: row.id,
    domain: row.domain,
    name: row.name,
    owner: row.owner,
    targetDisplay: row.target_display,
    targetNumber: asNumber(row.target_number) ?? 0,
    baselineNumber: asNumber(row.baseline_number),
    outcomeArea: row.outcome_area,
    sortOrder: row.sort_order,
  };
}

function mapResult(row: KpiQuarterResultRow): KpiQuarterResult {
  return {
    id: row.id,
    kpiId: row.kpi_id,
    quarter: row.quarter as QuarterNumber,
    currentValue: asNumber(row.current_value),
    ragStatus: row.rag_status,
    contextNotes: row.context_notes,
  };
}

function mapAssessment(row: KpiBoardAssessmentRow): KpiBoardAssessment {
  return {
    id: row.id,
    kpiId: row.kpi_id,
    fullYearRag: row.full_year_rag,
    boardNotes: row.board_notes,
  };
}

function emptyAnnualSummary(): KpiAnnualSummary {
  return {
    overview: "",
    achievements: "",
    challenges: "",
    stakeholderStory: "",
    financialContext: "",
    riskResponse: "",
    nextSteps: "",
  };
}

async function ensureDashboard() {
  const session = await requireMemberContext();
  const supabase = createAdminClient();

  const { data: existingDashboard, error: readError } = await supabase
    .from("kpi_dashboards")
    .select(
      "id, organization_id, title, organization_name, reporting_year, financial_year_end",
    )
    .eq("organization_id", session.organization.id)
    .maybeSingle<DashboardRow>();

  if (readError) throw readError;
  if (existingDashboard) return { dashboard: existingDashboard, session };

  const { data: createdDashboard, error: createError } = await supabase
    .from("kpi_dashboards")
    .insert({
      organization_id: session.organization.id,
      title: "KPI Dashboard and Board Reporting",
      organization_name: session.organization.name,
      reporting_year: new Date().getFullYear(),
      created_by: session.member.id,
    })
    .select(
      "id, organization_id, title, organization_name, reporting_year, financial_year_end",
    )
    .single<DashboardRow>();

  if (createError) throw createError;

  const defaultQuarters = defaultQuarterAssignments().map((assignment) => ({
    dashboard_id: createdDashboard.id,
    quarter: assignment.quarter,
    month_number: assignment.monthNumber,
    sort_order: assignment.sortOrder,
  }));

  const { error: quarterError } = await supabase
    .from("kpi_quarter_settings")
    .insert(defaultQuarters);

  if (quarterError) throw quarterError;

  const { error: summaryError } = await supabase
    .from("kpi_annual_summaries")
    .insert({ dashboard_id: createdDashboard.id });

  if (summaryError) throw summaryError;

  return { dashboard: createdDashboard, session };
}

export async function getKpiDashboardData(): Promise<KpiDashboardData> {
  const { dashboard } = await ensureDashboard();
  const supabase = createAdminClient();

  const [
    quartersResult,
    kpisResult,
    milestonesResult,
    risksResult,
    annualSummaryResult,
  ] = await Promise.all([
    supabase
      .from("kpi_quarter_settings")
      .select("quarter, month_number, sort_order")
      .eq("dashboard_id", dashboard.id)
      .order("sort_order", { ascending: true })
      .returns<QuarterRow[]>(),
    supabase
      .from("kpi_definitions")
      .select(
        "id, domain, name, owner, target_display, target_number, baseline_number, outcome_area, sort_order",
      )
      .eq("dashboard_id", dashboard.id)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .returns<KpiDefinitionRow[]>(),
    supabase
      .from("kpi_milestones")
      .select("id, title, owner, due_date, status, notes")
      .eq("dashboard_id", dashboard.id)
      .order("due_date", { ascending: true, nullsFirst: false })
      .returns<KpiMilestoneRow[]>(),
    supabase
      .from("kpi_risks")
      .select("id, area, description, mitigation, owner, rag_status")
      .eq("dashboard_id", dashboard.id)
      .order("sort_order", { ascending: true })
      .returns<KpiRiskRow[]>(),
    supabase
      .from("kpi_annual_summaries")
      .select(
        "overview, achievements, challenges, stakeholder_story, financial_context, risk_response, next_steps",
      )
      .eq("dashboard_id", dashboard.id)
      .maybeSingle<KpiAnnualSummaryRow>(),
  ]);

  if (quartersResult.error) throw quartersResult.error;
  if (kpisResult.error) throw kpisResult.error;
  if (milestonesResult.error) throw milestonesResult.error;
  if (risksResult.error) throw risksResult.error;
  if (annualSummaryResult.error) throw annualSummaryResult.error;

  const kpis = (kpisResult.data ?? []).map(mapKpi);
  const kpiIds = kpis.map((kpi) => kpi.id);

  const [resultsResult, assignmentsResult, assessmentsResult] =
    kpiIds.length > 0
      ? await Promise.all([
          supabase
            .from("kpi_quarter_results")
            .select("id, kpi_id, quarter, current_value, rag_status, context_notes")
            .in("kpi_id", kpiIds)
            .order("quarter", { ascending: true })
            .returns<KpiQuarterResultRow[]>(),
          supabase
            .from("kpi_quarter_assignments")
            .select("kpi_id, quarter")
            .in("kpi_id", kpiIds)
            .order("quarter", { ascending: true })
            .returns<KpiQuarterAssignmentRow[]>(),
          supabase
            .from("kpi_board_assessments")
            .select("id, kpi_id, full_year_rag, board_notes")
            .in("kpi_id", kpiIds)
            .returns<KpiBoardAssessmentRow[]>(),
        ])
      : [
          { data: [] as KpiQuarterResultRow[], error: null },
          { data: [] as KpiQuarterAssignmentRow[], error: null },
          { data: [] as KpiBoardAssessmentRow[], error: null },
        ];

  if (resultsResult.error) throw resultsResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;
  if (assessmentsResult.error) throw assessmentsResult.error;

  const annualSummaryRow = annualSummaryResult.data;

  return {
    dashboard: mapDashboard(dashboard),
    quarters: (quartersResult.data ?? []).map(mapQuarter),
    kpis,
    results: (resultsResult.data ?? []).map(mapResult),
    assignments: (assignmentsResult.data ?? []).map((row) => ({
      kpiId: row.kpi_id,
      quarter: row.quarter as QuarterNumber,
    })),
    assessments: (assessmentsResult.data ?? []).map(mapAssessment),
    milestones: (milestonesResult.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      owner: row.owner,
      dueDate: row.due_date,
      status: row.status,
      notes: row.notes,
    })),
    risks: (risksResult.data ?? []).map((row) => ({
      id: row.id,
      area: row.area,
      description: row.description,
      mitigation: row.mitigation,
      owner: row.owner,
      ragStatus: row.rag_status,
    })),
    annualSummary: annualSummaryRow
      ? {
          overview: annualSummaryRow.overview,
          achievements: annualSummaryRow.achievements,
          challenges: annualSummaryRow.challenges,
          stakeholderStory: annualSummaryRow.stakeholder_story,
          financialContext: annualSummaryRow.financial_context,
          riskResponse: annualSummaryRow.risk_response,
          nextSteps: annualSummaryRow.next_steps,
        }
      : emptyAnnualSummary(),
  };
}

export async function requireKpiDashboardForOrganization() {
  const { dashboard, session } = await ensureDashboard();
  return { dashboard: mapDashboard(dashboard), session };
}
