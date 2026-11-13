import * as z from "zod";

export const annualReviewSections = ["cover", "self", "chair", "summary", "comp", "dev", "future", "signoff"] as const;
export type AnnualReviewSection = (typeof annualReviewSections)[number];
export type AnnualReviewRole = "full" | "chair" | "ed" | "admin" | "hr" | "cfo";
export type AnnualReviewMode = "edit" | "read" | "hide";

export const annualReviewRoleMatrix: Record<AnnualReviewRole, Record<AnnualReviewSection, AnnualReviewMode>> = {
  full: { cover: "edit", self: "edit", chair: "edit", summary: "edit", comp: "edit", dev: "edit", future: "edit", signoff: "edit" },
  chair: { cover: "edit", self: "read", chair: "edit", summary: "read", comp: "edit", dev: "edit", future: "edit", signoff: "edit" },
  ed: { cover: "read", self: "edit", chair: "hide", summary: "read", comp: "hide", dev: "edit", future: "hide", signoff: "edit" },
  admin: { cover: "edit", self: "hide", chair: "hide", summary: "hide", comp: "hide", dev: "hide", future: "hide", signoff: "edit" },
  hr: { cover: "edit", self: "read", chair: "read", summary: "read", comp: "hide", dev: "edit", future: "hide", signoff: "read" },
  cfo: { cover: "read", self: "hide", chair: "hide", summary: "hide", comp: "read", dev: "hide", future: "read", signoff: "hide" },
};

const text = (max = 3000) => z.string().trim().max(max);
const optionalDate = z.union([z.iso.date(), z.literal("")]);
const optionalRating = z.union([z.number().int().min(1).max(5), z.null()]);
const optionalWeight = z.union([z.number().min(0).max(100), z.null()]);
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/);

export const annualCompetencySchema = z.object({
  id, name: text(200), description: text(), kpis: text(), weight: optionalWeight,
  selfRating: optionalRating, selfEvidence: text(), chairRating: optionalRating, chairEvidence: text(),
}).strict();
export type AnnualCompetency = z.infer<typeof annualCompetencySchema>;

const namedGoalSchema = z.object({
  id, goal: text(500), detail: text(), linkedCompetencyId: z.union([id, z.literal("")]),
  dueOn: optionalDate, progress: text(1000), area: text(300).default(""),
  method: text(500).default(""), measure: text().default(""), relevant: text().default(""),
}).strict();
const costItemSchema = z.object({ id, activity: text(300), costCents: z.number().int().min(0).max(100_000_000_000),
  provider: text(300).default(""), dates: text(160).default(""), approved: z.enum(["", "yes", "pending"]).default("") }).strict();
const actionSchema = z.object({ id, action: text(500), owner: text(160), dueOn: optionalDate,
  detail: text(1000).default("") }).strict();

export const annualGeneralSchema = z.object({
  cover: z.object({ organization: text(160), edName: text(160), chairName: text(160),
    period: text(160), reviewDate: optionalDate, sources: z.array(z.enum(["self", "board", "staff", "partners", "stakeholders"])).max(5),
    themes: text(), yearsInRole: z.union([z.number().min(0).max(100), z.null()]).default(null) }).strict(),
  competencies: z.array(annualCompetencySchema).min(1).max(100),
  selfNarrative: z.object({ strengths: text(), development: text(), kpis: text(), summary: text() }).strict(),
  chairNarrative: z.object({ strengths: text(), development: text(), kpis: text(), summary: text() }).strict(),
  development: z.object({ smartGoals: z.array(namedGoalSchema).max(100),
    growthGoals: z.array(namedGoalSchema).max(100), external: z.array(costItemSchema).max(100),
    edReflection: text(), chairReflection: text(), commitments: text(), investment: text() }).strict(),
  signoff: z.object({ actions: z.array(actionSchema).max(100), judgement: text(500),
    keyMessage: text(), priorities: text(), chairName: text(160), chairDate: optionalDate,
    edName: text(160), edDate: optionalDate }).strict(),
}).strict();
export type AnnualGeneral = z.infer<typeof annualGeneralSchema>;

export const salaryBandSchema = z.object({
  id: z.enum(["b1", "b2", "b3", "b4", "b5"]),
  range: text(80), label: text(160), adjustment: text(160),
}).strict();
export const annualCompensationSchema = z.object({
  currentSalaryCents: z.number().int().min(0).max(100_000_000_000),
  packageNotes: text(), bands: z.array(salaryBandSchema).length(5),
  lastReviewDate: optionalDate.default(""), lastAdjustment: text(160).default(""),
  totalPackageCents: z.number().int().min(0).max(100_000_000_000).default(0),
  recommendedPercent: z.number().min(-100).max(1000),
  approvedPercent: z.union([z.number().min(-100).max(1000), z.null()]),
  approvalNotes: text(), cfoName: text(160), cfoEmail: z.union([z.email(), z.literal("")]),
  effectiveDate: optionalDate.default(""), rationale: text().default(""),
  boardApprovalDate: optionalDate.default(""), approvedBy: text(160).default(""),
  minuteReference: text(160).default(""),
  milestoneBonusesEnabled: z.boolean(),
  milestoneBonuses: z.array(z.object({ id, title: text(300), amountCents: z.number().int().min(0).max(100_000_000_000),
    status: z.enum(["pending", "not_started", "in_progress", "achieved", "paid"]), target: text(160).default("") }).strict()).max(100),
  futureRemunerationEnabled: z.boolean(),
  future: z.object({ purpose: text(), why: text(), structure: text(), threshold: text(),
    share: text(), vesting: text(), conditions: text(), cap: text(), currentStatus: text(),
    targetDate: text(160).default(""), boardNotes: text().default("") }).strict(),
}).strict();
export type AnnualCompensation = z.infer<typeof annualCompensationSchema>;

export function annualReviewDefaults(): { general: AnnualGeneral; compensation: AnnualCompensation } {
  return {
    general: {
      cover: { organization: "", edName: "", chairName: "", period: "", reviewDate: "", sources: [], themes: "", yearsInRole: null },
      competencies: Array.from({ length: 5 }, (_, index) => ({ id: `c${index}`, name: "", description: "", kpis: "",
        weight: null, selfRating: null, selfEvidence: "", chairRating: null, chairEvidence: "" })),
      selfNarrative: { strengths: "", development: "", kpis: "", summary: "" },
      chairNarrative: { strengths: "", development: "", kpis: "", summary: "" },
      development: {
        smartGoals: Array.from({ length: 3 }, (_, index) => ({ id: `sm${index}`, goal: "", detail: "",
          linkedCompetencyId: "", dueOn: "", progress: "", area: "", method: "", measure: "", relevant: "" })),
        growthGoals: Array.from({ length: 4 }, (_, index) => ({ id: `g${index}`, goal: "", detail: "",
          linkedCompetencyId: "", dueOn: "", progress: "", area: "", method: "", measure: "", relevant: "" })),
        external: Array.from({ length: 3 }, (_, index) => ({ id: `x${index}`, activity: "", costCents: 0,
          provider: "", dates: "", approved: "" as const })),
        edReflection: "", chairReflection: "", commitments: "", investment: "",
      },
      signoff: { actions: Array.from({ length: 4 }, (_, index) => ({ id: `a${index}`, action: "", owner: "", dueOn: "", detail: "" })),
        judgement: "", keyMessage: "", priorities: "", chairName: "", chairDate: "", edName: "", edDate: "" },
    },
    compensation: { currentSalaryCents: 0, packageNotes: "", lastReviewDate: "", lastAdjustment: "",
      totalPackageCents: 0, effectiveDate: "", rationale: "", boardApprovalDate: "",
      approvedBy: "", minuteReference: "",
      bands: [
        { id: "b1", range: "4.5 – 5.0", label: "Exceptional", adjustment: "Board discretion — above range" },
        { id: "b2", range: "3.5 – 4.4", label: "Strong", adjustment: "4% – 6%" },
        { id: "b3", range: "2.5 – 3.4", label: "Satisfactory", adjustment: "2% – 4% (CPI-aligned)" },
        { id: "b4", range: "1.5 – 2.4", label: "Developing", adjustment: "0% – 2% + 6-month check-in" },
        { id: "b5", range: "1.0 – 1.4", label: "Unsatisfactory", adjustment: "0% — Formal performance plan" },
      ], recommendedPercent: 0, approvedPercent: null, approvalNotes: "", cfoName: "", cfoEmail: "",
      milestoneBonusesEnabled: true,
      milestoneBonuses: Array.from({ length: 4 }, (_, index) => ({ id: `m${index}`, title: "",
        amountCents: 0, status: "not_started" as const, target: "" })),
      futureRemunerationEnabled: true,
      future: {
        purpose: "To document the Board's intent to develop a long-term incentive arrangement for the Executive Director as the organisation scales. This is a placeholder — not a legally binding commitment. A formal agreement will be developed with legal advice when the organisation reaches agreed thresholds.",
        why: "The ED carries significant leadership and, in entrepreneurial organisations, financial risk, and is instrumental in the organisation's growth. A future revenue share or profit-participation arrangement aligns the ED's long-term interests with the organisation's success and is common practice in scaling organisations.",
        structure: "Cash-based revenue share or profit participation arrangement. No equity or ownership stake at this stage. Structure to be confirmed with legal and financial advice.",
        threshold: "Board to define the revenue / sustainability threshold at which the arrangement activates. Example: when annual revenue exceeds $X for two consecutive years.",
        share: "Board to set. Example frameworks: 1–3% of net revenue above threshold, or 5–10% of net surplus above a defined level. To be confirmed.",
        vesting: "Board discretion. Options: annual payment, deferred 2-year payment, or milestone-linked. Deferred arrangements typically better align long-term interests.",
        conditions: "Continued employment, satisfactory performance review, and Board approval required. Arrangement lapses if employment ends (except in agreed circumstances).",
        cap: "Board may wish to define a maximum annual payment to manage financial exposure.",
        currentStatus: "No formal long-term incentive in place. This section documents intent only.",
        targetDate: "", boardNotes: "",
      },
    },
  };
}

export function calculateAnnualReview(general: AnnualGeneral, compensation: AnnualCompensation | null) {
  const competencies = general.competencies;
  const rawWeights = competencies.map((item) => item.weight);
  const anyWeightSet = rawWeights.some((weight) => weight !== null && weight > 0);
  const weightTotal = rawWeights.reduce<number>((sum, weight) => sum + (weight ?? 0), 0);
  const effectiveWeights = competencies.map((item) => anyWeightSet ? item.weight ?? 0 : 100 / competencies.length);
  function weightedRating(key: "selfRating" | "chairRating") {
    let weighted = 0;
    let ratedWeight = 0;
    competencies.forEach((item, index) => {
      const rating = item[key];
      if (rating !== null) { weighted += rating * effectiveWeights[index]; ratedWeight += effectiveWeights[index]; }
    });
    return ratedWeight ? Math.round(weighted / ratedWeight * 100) / 100 : null;
  }
  const selfScore = weightedRating("selfRating");
  const chairScore = weightedRating("chairRating");
  const gap = selfScore === null || chairScore === null ? null : Math.round((chairScore - selfScore) * 100) / 100;
  const bands = [
    { id: "b1", min: 4.5, max: 5.01 }, { id: "b2", min: 3.5, max: 4.5 },
    { id: "b3", min: 2.5, max: 3.5 }, { id: "b4", min: 1.5, max: 2.5 },
    { id: "b5", min: 0, max: 1.5 },
  ];
  const activeBand = chairScore === null ? null : bands.find((band) => chairScore >= band.min && chairScore < band.max)?.id ?? null;
  return { weightTotal, anyWeightSet, weightWarning: anyWeightSet && Math.round(weightTotal) !== 100,
    effectiveWeights, selfScore, chairScore, gap, activeBand,
    gaps: competencies.map((item) => ({ id: item.id,
      gap: item.selfRating === null || item.chairRating === null ? null : item.chairRating - item.selfRating,
      highlight: item.selfRating !== null && item.chairRating !== null && Math.abs(item.chairRating - item.selfRating) > 1 })),
    recommendedSalaryCents: compensation ? Math.round(compensation.currentSalaryCents *
      (1 + compensation.recommendedPercent / 100)) : null,
    milestoneTotalCents: compensation ? compensation.milestoneBonuses
      .filter((item) => item.status === "achieved" || item.status === "paid")
      .reduce((sum, item) => sum + item.amountCents, 0) : null,
    developmentCostCents: general.development.external.reduce((sum, item) => sum + item.costCents, 0),
  };
}
