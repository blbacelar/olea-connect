import { getBoardEvaluationFlag, getBoardEvaluationResponseRate, getBoardEvaluationTrend,
  getMeetingEvaluationAssessment, annualBoardSections, meetingEvaluationGroups } from "@/lib/board-evaluation/toolkit";
import type { getAnnualDocumentData } from "@/lib/data/ed-annual-document";
import { annualText } from "@/lib/ed-review/annual-copy";
import type { buildBoardSnapshot } from "@/lib/strategic-planning/board-snapshot";
import type { PlanSection } from "@/lib/strategic-planning/workbook-plan";

import type { ReportBlock, ReportSection } from "./branded-html";

const shown = (value: string | number | null | undefined) => value === null || value === undefined || value === "" ? "—" : String(value);
const text = (label: string, value: string | number | null | undefined): ReportBlock[] =>
  value === null || value === undefined || value === "" ? [] : [{ kind: "text", label, value: String(value) }];
const table = (headers: string[], rows: string[][], label?: string): ReportBlock[] => rows.length
  ? [{ kind: "table", headers, rows, label }] : [];

export function strategicPlanSections(sections: PlanSection[]): ReportSection[] {
  return sections.filter((section) => section.ready).map((section) => ({
    title: section.title,
    blocks: section.blocks,
  }));
}

export function strategicBoardSections(snapshot: ReturnType<typeof buildBoardSnapshot>, locale = "en-CA"): ReportSection[] {
  const fr: Record<string, string> = {
    "Progress at a glance": "Progrès en bref", "On track or complete": "En bonne voie ou terminé",
    Actions: "Actions", Green: "Vert", Yellow: "Jaune", Red: "Rouge", Complete: "Terminé",
    "Not updated": "Non mis à jour", "Executive summary": "Résumé", Goals: "Objectifs",
    Goal: "Objectif", Status: "État", "Needs attention": "À surveiller", Action: "Action",
    Owner: "Responsable", Note: "Note", Budget: "Budget", Spent: "Dépensé",
    Secured: "Confirmé", "To raise": "À trouver", "Completed this quarter": "Terminé ce trimestre",
    "Coming next quarter": "À venir au prochain trimestre", "Board decisions and support": "Décisions et soutien du conseil",
    Decisions: "Décisions", green: "vert", yellow: "jaune", red: "rouge", done: "terminé",
  };
  const t = (value: string) => locale === "fr-CA" ? fr[value] ?? value : value;
  const formatMoney = (cents: number) => new Intl.NumberFormat(locale, {
    style: "currency", currency: "CAD",
  }).format(cents / 100);
  return [
    { title: t("Progress at a glance"), blocks: [
      ...text(t("On track or complete"), `${snapshot.onTrackPercent}%`),
      ...table(["Actions", "Green", "Yellow", "Red", "Complete", "Not updated"].map(t), [[
        snapshot.actionCount, snapshot.counts.green, snapshot.counts.yellow, snapshot.counts.red,
        snapshot.counts.done, snapshot.counts.notUpdated,
      ].map(String)]),
      ...text(t("Executive summary"), snapshot.executiveSummary),
    ] },
    { title: t("Goals"), blocks: table(["Goal", "Status", "Actions"].map(t), snapshot.goals.map((goal) =>
      [goal.name, t(goal.status), String(goal.actionCount)])) },
    { title: t("Needs attention"), blocks: table(["Goal", "Action", "Owner", "Status", "Note"].map(t),
      snapshot.attention.map((item) => [item.goal, item.action, item.owner, t(item.status), item.note])) },
    { title: t("Budget"), blocks: table(["Budget", "Spent", "Secured", "To raise"].map(t), [[
      formatMoney(snapshot.budget.budgetCents), formatMoney(snapshot.budget.spentCents),
      formatMoney(snapshot.budget.securedCents), formatMoney(snapshot.budget.toRaiseCents),
    ]]) },
    { title: t("Completed this quarter"), blocks: table(["Action", "Owner"].map(t),
      snapshot.wins.map((item) => [item.action, item.owner])) },
    { title: t("Coming next quarter"), blocks: table(["Action", "Owner"].map(t),
      snapshot.upcoming.map((item) => [item.action, item.owner])) },
    { title: t("Board decisions and support"), blocks: text(t("Decisions"), snapshot.decisions) },
  ];
}

type AnnualData = Awaited<ReturnType<typeof getAnnualDocumentData>>;
export function annualEdSections(data: AnnualData, locale = "en-CA"): ReportSection[] {
  const { view, modes, summary } = data;
  const formatMoney = (cents: number) => new Intl.NumberFormat(locale, {
    style: "currency", currency: "CAD",
  }).format(cents / 100);
  const sections: ReportSection[] = [];
  const add = (key: keyof typeof modes, title: string, blocks: ReportBlock[]) => {
    if (modes[key] !== "hide") sections.push({ title, blocks });
  };
  if (view.cover) add("cover", "Cover and setup", [
    ...table(["Organization", "ED / CEO", "Board Chair", "Review period", "Review date", "Years in role"], [[
      view.cover.organization, view.cover.edName, view.cover.chairName, view.cover.period,
      view.cover.reviewDate, shown(view.cover.yearsInRole),
    ]]),
    ...text("360° feedback sources", view.cover.sources.join(", ")),
    ...text("360° themes", view.cover.themes),
  ]);
  if (modes.self !== "hide") add("self", "ED self-assessment", [
    ...table(["Competency", "Weight", "ED rating", "Evidence"], view.competencies.map((item) =>
      [item.name, item.weight === null ? "Equal" : `${item.weight}%`, shown(item.selfRating), item.selfEvidence])),
    ...narrative(view.selfNarrative),
  ]);
  if (modes.chair !== "hide") add("chair", "Board Chair assessment", [
    ...table(["Competency", "Chair rating", "Evidence"], view.competencies.map((item) =>
      [item.name, shown(item.chairRating), item.chairEvidence])),
    ...narrative(view.chairNarrative),
  ]);
  if (modes.summary !== "hide") add("summary", "Scoring summary", [
    ...table(["ED weighted score", "Chair weighted score", "Overall gap"], [[
      shown(summary.selfScore), shown(summary.chairScore), shown(summary.gap),
    ]]),
    ...(summary.weightWarning ? text("Weight warning", locale === "fr-CA"
      ? `La pondération totalise ${summary.weightTotal} %, et non 100 %.`
      : `Weights total ${summary.weightTotal}%, not 100%.`) : []),
    ...table(["Competency", "ED", "Chair", "Gap"], view.competencies.map((item) => [
      item.name, shown(item.selfRating), shown(item.chairRating),
      shown(summary.gaps.find((gap) => gap.id === item.id)?.gap),
    ])),
  ]);
  if (view.compensation && modes.comp !== "hide") add("comp", "Compensation and bonuses", [
    ...text("Current salary", formatMoney(view.compensation.currentSalaryCents)),
    ...text("Last salary review date", view.compensation.lastReviewDate),
    ...text("Last adjustment amount", view.compensation.lastAdjustment),
    ...text("Current total package", formatMoney(view.compensation.totalPackageCents)),
    ...text("Recommended adjustment", `${view.compensation.recommendedPercent}%`),
    ...text("Recommended salary", summary.recommendedSalaryCents === null ? "" : formatMoney(summary.recommendedSalaryCents)),
    ...text("Effective date", view.compensation.effectiveDate),
    ...text("Rationale", view.compensation.rationale),
    ...text("Board approval date", view.compensation.boardApprovalDate),
    ...text("Approved by (Chair)", view.compensation.approvedBy),
    ...text("Board minute reference #", view.compensation.minuteReference),
    ...text("CFO / Finance name", view.compensation.cfoName),
    ...text("CFO / Finance email", view.compensation.cfoEmail),
    ...table(["Band", "Range", "Assessment", "Adjustment"], view.compensation.bands.map((band) =>
      [band.id, band.range, band.label, band.adjustment])),
    ...table(["Milestone", "Target", "Amount", "Status"], view.compensation.milestoneBonuses
      .filter((bonus) => bonus.title).map((bonus) => [bonus.title, bonus.target,
        formatMoney(bonus.amountCents), bonus.status])),
    ...text("Total achieved / paid this year", formatMoney(summary.milestoneTotalCents ?? 0)),
  ]);
  if (view.development) add("dev", "Professional development", [
    ...table(["SMART goal", "Detail", "Specific & Measurable", "Achievable & Relevant", "Linked competency", "Due", "Progress"],
      view.development.smartGoals.filter((goal) => goal.goal).map((goal) => [goal.goal, goal.detail,
        goal.measure, goal.relevant, goal.linkedCompetencyId, goal.dueOn, goal.progress])),
    ...table(["Growth area", "Goal", "How", "Due"], view.development.growthGoals
      .filter((goal) => goal.goal || goal.area).map((goal) => [goal.area, goal.goal, goal.method, goal.dueOn])),
    ...table(["External activity", "Provider", "Dates", "Cost", "Approved"], view.development.external
      .filter((item) => item.activity).map((item) => [item.activity, item.provider, item.dates,
        formatMoney(item.costCents), item.approved])),
    ...text("ED reflection", view.development.edReflection),
    ...text("Chair reflection", view.development.chairReflection),
    ...text("Commitments", view.development.commitments),
    ...text("Investment", view.development.investment),
  ]);
  if (view.future && modes.future !== "hide") add("future", "Future remuneration", [
    ...Object.entries(view.future).flatMap(([key, value]) => text(key.replaceAll(/([A-Z])/g, " $1"), value)),
  ]);
  if (view.signoff) add("signoff", "Agreed actions and sign-off", [
    ...text("Judgement", view.signoff.judgement),
    ...text("Key message", view.signoff.keyMessage),
    ...text("Priorities", view.signoff.priorities),
    ...table(["Action", "Detail / expected outcome", "Owner", "Due"], view.signoff.actions
      .filter((item) => item.action).map((item) => [item.action, item.detail, item.owner, item.dueOn])),
    ...table(["Board Chair", "Date", "ED / CEO", "Date"], [[view.signoff.chairName,
      view.signoff.chairDate, view.signoff.edName, view.signoff.edDate]]),
  ]);
  return sections.map((section) => ({
    title: annualText(locale, section.title),
    blocks: section.blocks.map((block) => block.kind === "text"
      ? { ...block, label: block.label ? annualText(locale, block.label) : undefined,
        value: annualText(locale, block.value) }
      : { ...block, label: block.label ? annualText(locale, block.label) : undefined,
        headers: block.headers.map((header) => annualText(locale, header)),
        rows: block.rows.map((row) => row.map((value) => annualText(locale, value))) }),
  }));
}

function narrative(value: AnnualData["view"]["selfNarrative"]) {
  return value ? Object.entries(value).flatMap(([key, content]) => text(key, content)) : [];
}

export function boardEvaluationSections(input: {
  kind: "annual" | "meeting";
  responseCount: number;
  invitedCount: number;
  results: Array<{ questionId: string; average: number | null; responseCount: number }>;
  previousResults?: Array<{ questionId: string; average: number | null }>;
  priorities: unknown[];
}): ReportSection[] {
  if (input.responseCount < 5) throw new Error("At least five responses are required.");
  const labels = new Map((input.kind === "annual" ? annualBoardSections.flatMap((section) => section.questions)
    : meetingEvaluationGroups.flatMap((group) => group.questions)).map((question) => [question.id, question.label]));
  const previous = new Map(input.previousResults?.map((item) => [item.questionId, item.average]));
  const responseRate = getBoardEvaluationResponseRate(input.responseCount, input.invitedCount);
  const safePriorities = input.priorities.filter((item): item is { title: string; owner?: string; dueOn?: string; successMeasure?: string } =>
    Boolean(item && typeof item === "object" && "title" in item && typeof item.title === "string" && item.title.trim()));
  return [
    { title: "Participation", blocks: [
      ...text("Responses", input.responseCount),
      ...text("Response rate", responseRate === null ? "Unknown" : `${responseRate}%`),
      { kind: "text", value: "Results for individual questions are suppressed when fewer than five people answered that question." },
    ] },
    { title: "Question results", blocks: table(["Question", "Average / 5", "Responses", "Assessment", "Trend"],
      input.results.map((item) => [
        labels.get(item.questionId) ?? item.questionId,
        item.average === null ? "Suppressed" : String(item.average),
        item.average === null ? "Suppressed" : String(item.responseCount),
        item.average === null ? "Suppressed" : (input.kind === "annual"
          ? getBoardEvaluationFlag(item.average) : getMeetingEvaluationAssessment(item.average)).replaceAll("_", " "),
        getBoardEvaluationTrend(item.average, previous.get(item.questionId) ?? null).replaceAll("_", " "),
      ])),
    },
    { title: "Board priorities", blocks: table(["Priority", "Owner", "Due", "Success measure"],
      safePriorities.map((item) => [item.title, item.owner ?? "", item.dueOn ?? "", item.successMeasure ?? ""])) },
  ];
}
