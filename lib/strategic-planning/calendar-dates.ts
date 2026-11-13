import type { WorkbookValues } from "./workbook";
import { quarterKeys } from "./action-tracker";
import { workbookCalendarRows } from "./workbook";
import { parseDateKey, type CalendarViewEvent } from "@/lib/template-renderer/calendar-view";

export type StrategicCalendarDate = { id: string; dateKey: string; title: string; category: string; notes: string };

function addMonths(iso: string, months: number, dayShift = 0) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 + months,
    Number(match[3]) + dayShift));
  return date.toISOString().slice(0, 10);
}

export function buildStrategicCalendarDates(values: WorkbookValues): StrategicCalendarDate[] {
  const dates: StrategicCalendarDate[] = [];
  const get = (key: string) => values[key]?.trim() ?? "";
  const add = (id: string, dateKey: string, title: string, category: string, notes = "") => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) dates.push({ id: `strategic-${id}`,
      dateKey, title, category, notes });
  };
  add("board-approval", get("start.approve"), "Strategic plan: board approval (target date)", "Strategic Planning");
  add("approved", get("m8.date"), "Strategic plan approved by the board", "Strategic Planning");
  const milestones = ["Charter approved", "Information gathering complete", "Planning session or retreat",
    "Draft plan circulated", "Board approval", "Plan launched"];
  milestones.forEach((title, index) => add(`milestone-${index}`, get(`m1.dates:${index}:1`),
    `Strategic planning: ${title.toLowerCase()}`, "Strategic Planning"));
  const horizon = Number(get("set.horizon") || 3);
  workbookCalendarRows(horizon).forEach((row, index) => add(`review-${index}`,
    get(`m9.cal:${index}:3`), `Strategic plan review: ${get(`m9.cal:${index}:0`) || row[0]}`,
    "Strategic Planning", get(`m9.cal:${index}:1`) || row[1]));
  const start = get("start.plan");
  if (start) {
    quarterKeys(horizon).forEach((quarter, index) => add(`quarter-end-${quarter}`,
      addMonths(start, 3 * (index + 1), -1),
      `Strategic plan: Year ${quarter[1]} Q${quarter[3]} ends. Action tracker updates and board dashboard due`,
      "Strategic Planning", get("m7.deadline")));
    for (let year = 1; year < horizon; year++) add(`budget-planning-y${year + 1}`,
      addMonths(start, 3 * (year * 4 - 1)),
      `Strategic plan: plan Year ${year + 1} actions and budget with finance`, "Strategic Planning",
      `Carry forward unfinished Year ${year} actions and confirm Year ${year + 1} budgets.`);
  }
  return dates.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function frenchStrategicTitle(title: string) {
  const exact: Record<string, string> = {
    "Strategic plan: board approval (target date)": "Plan stratégique : approbation du conseil (date cible)",
    "Strategic plan approved by the board": "Plan stratégique approuvé par le conseil",
  };
  if (exact[title]) return exact[title];
  const quarter = /^Strategic plan: Year (\d+) Q(\d+) ends\./.exec(title);
  if (quarter) return `Plan stratégique : fin de l'année ${quarter[1]}, T${quarter[2]}. Mise à jour du suivi des actions et du tableau de bord du conseil à remettre`;
  const budget = /^Strategic plan: plan Year (\d+) actions and budget with finance$/.exec(title);
  if (budget) return `Plan stratégique : planifier les actions et le budget de l'année ${budget[1]} avec les finances`;
  if (title.startsWith("Strategic plan review: ")) {
    const cadence = title.replace("Strategic plan review: ", "");
    const names: Record<string, string> = {
      Monthly: "mensuelle", Quarterly: "trimestrielle", Annually: "annuelle",
      "Mid-point (Year 3)": "à mi-parcours (année 3)", "Final year": "de la dernière année",
    };
    return `Révision du plan stratégique : ${names[cadence] ?? cadence}`;
  }
  const milestones: Record<string, string> = {
    "charter approved": "charte approuvée", "information gathering complete": "collecte des renseignements terminée",
    "planning session or retreat": "séance de planification ou retraite", "draft plan circulated": "ébauche du plan diffusée",
    "board approval": "approbation du conseil", "plan launched": "plan lancé",
  };
  const milestone = title.replace("Strategic planning: ", "");
  return milestones[milestone] ? `Planification stratégique : ${milestones[milestone]}` : title;
}

function frenchStrategicNotes(notes: string) {
  const defaults: Record<string, string> = {
    "Staff check progress on action plans": "Le personnel vérifie l'avancement des plans d'action",
    "Owners update the action tracker; the board reviews the dashboard": "Les responsables mettent à jour le suivi des actions; le conseil examine le tableau de bord",
    "Plan review; carry forward unfinished actions; plan next year's actions and budget": "Réviser le plan, reporter les actions inachevées et planifier les actions et le budget de l'année suivante",
    "Deeper review: rescan the environment, confirm or adjust priorities": "Examen approfondi du contexte et ajustement des priorités",
    "Evaluate the plan and begin Module 1 for the next one": "Évaluer le plan et commencer le module 1 du prochain cycle",
  };
  const carry = /^Carry forward unfinished Year (\d+) actions and confirm Year (\d+) budgets\.$/.exec(notes);
  if (carry) return `Reporter les actions inachevées de l'année ${carry[1]} et confirmer les budgets de l'année ${carry[2]}.`;
  return defaults[notes] ?? notes;
}

export function strategicDatesToCalendarEvents(dates: StrategicCalendarDate[], french = false): CalendarViewEvent[] {
  return dates.flatMap((item) => {
    const date = parseDateKey(item.dateKey);
    if (!date) return [];
    return [{
      id: item.id, date, dateKey: item.dateKey, monthIndex: date.getMonth(),
      title: french ? frenchStrategicTitle(item.title) : item.title,
      category: french ? "Planification stratégique" : item.category, color: "#0F766E",
      source: "strategic" as const, notes: french ? frenchStrategicNotes(item.notes) : item.notes,
    }];
  });
}
