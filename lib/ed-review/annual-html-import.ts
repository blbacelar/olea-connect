import { annualCompensationSchema, annualGeneralSchema, annualReviewDefaults } from "./annual-document";

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
}

function string(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value);
}

function number(value: unknown): number {
  const parsed = Number(string(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(value: unknown): number | null {
  return string(value) === "" ? null : number(value);
}

function cents(value: unknown): number {
  return Math.round(number(value) * 100);
}

function date(value: unknown): string {
  const raw = string(value);
  const canadian = /^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/.exec(raw);
  return canadian ? `${canadian[3]}-${canadian[2].padStart(2, "0")}-${canadian[1].padStart(2, "0")}` : raw;
}

function list(value: unknown): RecordValue[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function listId(row: RecordValue, index: number, prefix: string): string {
  const candidate = string(row.id);
  return /^[a-zA-Z0-9_-]{1,40}$/.test(candidate) ? candidate : `${prefix}${index}`;
}

/** Convert an export produced by the standalone ED / CEO HTML into the server-backed archive model. */
export function parseStandaloneEdReviewArchive(value: unknown) {
  const payload = record(value);
  if (payload._type !== "ed-review" || !payload.store || typeof payload.store !== "object" ||
    Array.isArray(payload.store)) throw new Error("This is not a valid standalone ED review export.");
  const source = record(payload.store);
  const s = (key: string) => string(source[key]);
  const n = (key: string) => number(source[key]);
  const d = (key: string) => date(source[key]);
  const c = (key: string) => cents(source[key]);
  const { general, compensation } = annualReviewDefaults();

  general.cover = {
    organization: s("cover.org"), period: s("cover.period"), edName: s("cover.ed"),
    chairName: s("cover.chair"), reviewDate: d("cover.reviewDate"), yearsInRole: optionalNumber(source["cover.years"]),
    sources: (["self", "board", "staff", "partners", "stakeholders"] as const)
      .filter((key) => source[`cover.src_${key}`] === true || source[`cover.src_${key}`] === "true"),
    themes: s("cover.src_summary"),
  };
  general.competencies = list(payload.competencies).map((row, index) => {
    const id = listId(row, index, "c");
    return { id, name: s(`comp.${id}.name`), description: s(`comp.${id}.desc`),
      kpis: s(`comp.${id}.kpis`), weight: optionalNumber(source[`comp.${id}.weight`]),
      selfRating: optionalNumber(source[`self.${id}.rating`]), selfEvidence: s(`self.${id}.evidence`),
      chairRating: optionalNumber(source[`chair.${id}.rating`]), chairEvidence: s(`chair.${id}.evidence`) };
  });
  if (!general.competencies.length) general.competencies = annualReviewDefaults().general.competencies;
  general.selfNarrative = { strengths: s("self.strengths"), development: s("self.development"),
    kpis: s("self.kpiCommentary"), summary: s("self.summary") };
  general.chairNarrative = { strengths: s("chair.strengths"), development: s("chair.development"),
    kpis: s("chair.kpiCommentary"), summary: s("chair.summary") };

  general.development.smartGoals = list(payload.smartGoals).map((row, index) => {
    const id = listId(row, index, "sm");
    return { id, goal: s(`smart.${id}.goal`), detail: "", measure: s(`smart.${id}.measure`),
      relevant: s(`smart.${id}.relevant`), linkedCompetencyId: s(`smart.${id}.link`),
      dueOn: d(`smart.${id}.due`), progress: s(`smart.${id}.progress`), area: "", method: "" };
  });
  general.development.growthGoals = list(payload.goals).map((row, index) => {
    const id = listId(row, index, "g");
    return { id, goal: s(`goal.${id}.goal`), detail: "", area: s(`goal.${id}.area`),
      method: s(`goal.${id}.method`), linkedCompetencyId: "", dueOn: d(`goal.${id}.when`),
      progress: "", measure: "", relevant: "" };
  });
  general.development.external = list(payload.externals).map((row, index) => {
    const id = listId(row, index, "x");
    const approval = s(`ext.${id}.approved`).toLowerCase();
    return { id, activity: s(`ext.${id}.activity`), provider: s(`ext.${id}.provider`),
      dates: s(`ext.${id}.dates`), costCents: c(`ext.${id}.cost`),
      approved: approval === "yes" ? "yes" as const : approval === "pending" ? "pending" as const : "" as const };
  });
  general.development.edReflection = s("dev.edReflection");
  general.development.chairReflection = s("dev.chairObs");
  general.development.commitments = s("dev.commitments");
  general.development.investment = s("dev.orgInvestment");

  general.signoff.actions = list(payload.actions).map((row, index) => {
    const id = listId(row, index, "a");
    return { id, action: s(`act.${id}.action`), detail: s(`act.${id}.detail`),
      owner: s(`act.${id}.owner`), dueOn: d(`act.${id}.due`) };
  });
  general.signoff.judgement = s("sign.judgement");
  general.signoff.keyMessage = s("sign.keyMessage");
  general.signoff.priorities = s("sign.priority");
  general.signoff.chairName = s("sign.chairName");
  general.signoff.chairDate = d("sign.chairDate");
  general.signoff.edName = s("sign.edName");
  general.signoff.edDate = d("sign.edDate");

  compensation.currentSalaryCents = c("comp.currentSalary");
  compensation.lastReviewDate = d("comp.lastReviewDate");
  compensation.lastAdjustment = s("comp.lastAdjustment");
  compensation.totalPackageCents = c("comp.totalPackage");
  compensation.recommendedPercent = n("comp.recPct");
  compensation.effectiveDate = d("comp.effectiveDate");
  compensation.rationale = s("comp.rationale");
  compensation.boardApprovalDate = d("comp.boardApprovalDate");
  compensation.approvedBy = s("comp.approvedBy");
  compensation.minuteReference = s("comp.minuteRef");
  compensation.cfoName = s("comp.cfoName");
  compensation.cfoEmail = s("comp.cfoEmail");
  compensation.bands = compensation.bands.map((band) => ({ ...band,
    adjustment: s(`matrix.${band.id}.adj`) || band.adjustment }));
  compensation.milestoneBonuses = list(payload.milestones).map((row, index) => {
    const id = listId(row, index, "m");
    const status = s(`mile.${id}.status`).toLowerCase();
    return { id, title: s(`mile.${id}.desc`), target: s(`mile.${id}.target`),
      amountCents: c(`mile.${id}.amount`),
      status: status === "paid" ? "paid" as const : status === "achieved" ? "achieved" as const :
        status === "in progress" ? "in_progress" as const : "not_started" as const };
  });
  compensation.future = {
    purpose: s("future.purpose"), why: s("future.why"), structure: s("future.structure"),
    threshold: s("future.threshold"), share: s("future.share"), vesting: s("future.vesting"),
    conditions: s("future.conditions"), cap: s("future.cap"), currentStatus: s("future.currentStatus"),
    targetDate: s("future.targetDate"), boardNotes: s("future.boardNotes"),
  };

  return { general: annualGeneralSchema.parse(general), compensation: annualCompensationSchema.parse(compensation) };
}
