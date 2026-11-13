import { z } from "zod";

const shortText = (max: number) => z.string().trim().max(max);
const date = z.union([z.iso.date(), z.literal("")]);
const score = z.string().trim().refine((value) => value === "" || (/^(?:[0-4](?:\.\d{1,2})?|5(?:\.0{1,2})?)$/.test(value)),
  "Enter a score from 0 to 5 with at most two decimals.");
const scoreChange = z.string().trim().refine((value) => value === "" || /^[+-]?(?:[0-4](?:\.\d{1,2})?|5(?:\.0{1,2})?)$/.test(value),
  "Enter a change from -5 to +5 with at most two decimals.");
const frequency = z.string().trim().max(50).refine((value) => {
  if (!value) return true;
  const match = value.match(/^(\d{1,5})\s+(?:of|sur)\s+(\d{1,5})$/i);
  return !!match && Number(match[2]) > 0 && Number(match[1]) <= Number(match[2]);
}, "Enter a frequency such as 2 of 6 or 2 sur 6.");

export const boardEvaluationSummarySchema = z.object({
  preparedBy: shortText(160),
  openedOn: date,
  closedOn: date,
  changeVsPrior: z.array(scoreChange).length(11),
  themeDetails: z.array(z.array(z.object({ pattern: shortText(1500), frequency })).length(2)).length(4),
  themes: z.array(shortText(1500)).length(4),
  priorities: z.array(z.object({
    title: shortText(200), owner: shortText(160),
    section: shortText(160), average: score,
    issue: shortText(1000), suggestedActions: shortText(1000),
    responsible: z.object({
      boardChair: z.boolean(), governanceCommittee: z.boolean(), ed: z.boolean(), other: z.boolean(), otherName: shortText(160),
    }),
    dueOn: date, checkInOn: date, measure: shortText(500),
  })).length(3),
  strengths: z.array(shortText(500)).length(3),
  concerns: z.array(shortText(500)).length(3),
  monitor: z.array(shortText(500)).length(3),
  discussionQuestions: z.array(shortText(500)).length(3),
  yearRecord: z.array(z.object({
    year: shortText(20), overall: shortText(20), strength: shortText(300),
    priority: shortText(300), responseRate: shortText(20),
  })).length(5),
  notes: shortText(4000),
}).superRefine((report, context) => {
  if (report.openedOn && report.closedOn && report.closedOn < report.openedOn) {
    context.addIssue({ code: "custom", path: ["closedOn"], message: "The survey close date must be on or after its open date." });
  }
});

export type BoardEvaluationSummary = z.infer<typeof boardEvaluationSummarySchema>;
export type SummaryPriority = BoardEvaluationSummary["priorities"][number];

const strings = (value: unknown, length: number) => Array.from({ length }, (_, index) =>
  Array.isArray(value) && typeof value[index] === "string" ? value[index] as string : "");
const field = (value: unknown) => typeof value === "string" ? value : "";
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value)
  ? value as Record<string, unknown> : {};

export function readBoardEvaluationSummary(value: unknown, dates: { openedOn?: string; closedOn?: string } = {}): BoardEvaluationSummary {
  const source = record(value);
  const oldThemes = strings(source.themes, 4);
  const savedDetails = Array.isArray(source.themeDetails) ? source.themeDetails : [];
  const priorities = Array.isArray(source.priorities) ? source.priorities : [];
  const years = Array.isArray(source.yearRecord) ? source.yearRecord : [];
  return {
    preparedBy: field(source.preparedBy),
    openedOn: field(source.openedOn) || dates.openedOn || "",
    closedOn: field(source.closedOn) || dates.closedOn || "",
    changeVsPrior: strings(source.changeVsPrior, 11),
    themeDetails: Array.from({ length: 4 }, (_, question) => Array.from({ length: 2 }, (_, theme) => {
      const saved = record(Array.isArray(savedDetails[question]) ? savedDetails[question][theme] : null);
      return { pattern: field(saved.pattern) || (theme === 0 ? oldThemes[question] : ""), frequency: field(saved.frequency) };
    })),
    themes: oldThemes,
    priorities: Array.from({ length: 3 }, (_, index) => {
      const saved = record(priorities[index]);
      const responsible = record(saved.responsible);
      const legacyOwner = field(saved.owner);
      const suggestedActions = field(saved.suggestedActions) || field(saved.title);
      return {
        title: field(saved.title) || suggestedActions.slice(0, 200), owner: legacyOwner,
        section: field(saved.section), average: field(saved.average), issue: field(saved.issue), suggestedActions,
        responsible: {
          boardChair: responsible.boardChair === true,
          governanceCommittee: responsible.governanceCommittee === true,
          ed: responsible.ed === true,
          other: responsible.other === true || (!!legacyOwner && !Object.keys(responsible).length),
          otherName: field(responsible.otherName) || (!Object.keys(responsible).length ? legacyOwner : ""),
        },
        dueOn: field(saved.dueOn), checkInOn: field(saved.checkInOn), measure: field(saved.measure),
      };
    }),
    strengths: strings(source.strengths, 3), concerns: strings(source.concerns, 3), monitor: strings(source.monitor, 3),
    discussionQuestions: strings(source.discussionQuestions, 3),
    yearRecord: Array.from({ length: 5 }, (_, index) => {
      const saved = record(years[index]);
      return { year: field(saved.year), overall: field(saved.overall), strength: field(saved.strength),
        priority: field(saved.priority), responseRate: field(saved.responseRate) };
    }),
    notes: field(source.notes),
  };
}
