import type { ReportBlock, ReportSection } from "@/lib/reports/branded-html";
import { translateFrenchUiText } from "@/lib/i18n/french-runtime-translations";

import type { WorkbookAction } from "./action-tracker";
import { workbookModules, type WorkbookChoice, type WorkbookColumn, type WorkbookValues } from "./workbook";

const text = (label: string, value: string): ReportBlock => ({ kind: "text", label, value: value || "—" });
const choiceLabel = (value: string, choices?: WorkbookChoice[] | "__years__") => {
  if (!choices || choices === "__years__") return value;
  const found = choices.find((choice) => (typeof choice === "string" ? choice : choice.v) === value);
  return found && typeof found !== "string" ? found.l : value;
};
const money = (cents: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);

export function strategicWorkbookPrintSections(input: {
  values: WorkbookValues;
  actions: WorkbookAction[];
  moduleId?: string;
  locale?: string;
}): ReportSection[] {
  const { values, actions, moduleId, locale = "en-CA" } = input;
  const fallbackFrench: Record<string, string> = {
    Monthly: "Mensuellement", Quarterly: "Trimestriellement", Annually: "Annuellement",
    "Mid-point (Year 3)": "À mi-parcours (année 3)", "Final year": "Dernière année",
    "Staff check progress on action plans": "Le personnel vérifie l'avancement des plans d'action",
    "ED/CEO and staff": "Direction générale et personnel",
    "Owners update the action tracker; the board reviews the dashboard": "Les responsables mettent à jour le suivi des actions; le conseil examine le tableau de bord",
    "Action owners, ED/CEO and board": "Responsables des actions, direction générale et conseil",
    "Plan review; carry forward unfinished actions; plan next year's actions and budget": "Réviser le plan, reporter les actions inachevées et planifier les actions et le budget de l'année suivante",
    "Board, ED/CEO and finance lead": "Conseil, direction générale et responsable des finances",
    "Deeper review: rescan the environment, confirm or adjust priorities": "Examen approfondi : réévaluer le contexte et confirmer ou adapter les priorités",
    "Board, staff and key stakeholders": "Conseil, personnel et parties prenantes clés",
    "Evaluate the plan and begin Module 1 for the next one": "Évaluer le plan et commencer le module 1 du prochain cycle",
    "Board and ED/CEO": "Conseil et direction générale", Yes: "Oui",
    board: "conseil", staff: "personnel", volunteers: "bénévoles", clients: "clientèle",
    partners: "partenaires", funders: "bailleurs de fonds", community: "communauté",
    everyone: "tout le monde", paper: "papier",
  };
  const t = (value: string) => locale === "fr-CA" ? fallbackFrench[value] ?? translateFrenchUiText(value) : value;
  const formatMoney = (cents: number) => new Intl.NumberFormat(locale, {
    style: "currency", currency: "CAD",
  }).format(cents / 100);
  const horizon = Number(values["set.horizon"] || 3);
  const selected = (values["start.use"] || "").split("|").filter(Boolean);
  const modules = workbookModules.filter((module) => moduleId ? module.id === moduleId :
    module.id === "m0" || !selected.length || selected.includes(module.id));
  const sections: ReportSection[] = [];
  for (const module of modules) for (const section of module.template) {
    if ((section.equity && values["set.equity"] === "off") ||
      (section.sizes && !section.sizes.includes(values["set.size"] || "mid"))) continue;
    const blocks: ReportBlock[] = [];
    for (const field of section.fields ?? []) {
      const raw = values[field.id] || "";
      const value = field.kind === "checks" ? raw.split("|").filter(Boolean)
        .map((item) => t(choiceLabel(item, field.options))).join(", ") : t(choiceLabel(raw, field.options));
      blocks.push(text(field.label, value));
    }
    if (section.checklist) blocks.push({ kind: "table", headers: ["Readiness item", "Answer", "Notes"],
      rows: section.checklist.items.map((item, index) => [item,
        t(values[`${section.checklist!.id}:${index}`] || ""),
        values[`${section.checklist!.id}:${index}:note`] || ""]) });
    if (section.table) {
      const table = section.table;
      const columns: WorkbookColumn[] = table.cols.flatMap((column) => column === "{years}"
        ? Array.from({ length: horizon }, (_, index) => ({ h: `Year ${index + 1} target` }))
        : [column as WorkbookColumn]);
      const calendar = table.prefill === "__calendar__" ? [
        ["Monthly", "Staff check progress on action plans", "ED/CEO and staff"],
        ["Quarterly", "Owners update the action tracker; the board reviews the dashboard", "Action owners, ED/CEO and board"],
        ["Annually", "Plan review; carry forward unfinished actions; plan next year's actions and budget", "Board, ED/CEO and finance lead"],
        ...(horizon === 5 ? [["Mid-point (Year 3)", "Deeper review: rescan the environment, confirm or adjust priorities", "Board, staff and key stakeholders"]] : []),
        ["Final year", "Evaluate the plan and begin Module 1 for the next one", "Board and ED/CEO"],
      ] : null;
      const min = table.rows ?? (calendar?.length ?? (Array.isArray(table.prefill) ? table.prefill.length : 4));
      const count = Math.min(100, Number(values[`${table.id}:rows`] || min));
      blocks.push({ kind: "table", headers: columns.map((column) => column.h || "Year target"),
        rows: Array.from({ length: count }, (_, row) => columns.map((column, col) => {
          const fallback = calendar?.[row]?.[col] ||
            (Array.isArray(table.prefill) && col === 0 ? table.prefill[row] : "");
          if (column.type === "sum") return columns.reduce((sum, item, index) =>
            sum + (item.type === "number" ? Number(values[`${table.id}:${row}:${index}`] || 0) : 0), 0).toString();
          const saved = values[`${table.id}:${row}:${col}`];
          const value = saved || fallback || "";
          return column.type === "check" ? value === "true" ? t("Yes") : "" :
            saved ? t(choiceLabel(saved, column.options)) : t(choiceLabel(value, column.options));
        })) });
    }
    if (section.swot) for (const [id, label] of [["s", "Strengths"], ["w", "Weaknesses"],
      ["o", "Opportunities"], ["t", "Threats"]]) blocks.push(text(label, values[`${section.swot}:${id}`] || ""));
    if (section.custom === "actions" || section.custom === "costs" || section.custom === "rollover") {
      blocks.push({ kind: "table", headers: ["Year", "Goal", "Priority", "Action", "Owner", "Due quarter", "Budget", "Funding source", "Funding status", "Budget line"],
        rows: actions.map((action) => [String(action.year), action.goal, action.keyPriority,
          action.action, action.owner, action.dueQuarter, formatMoney(action.budgetCents), action.fundingSource,
          t(action.fundingStatus), action.budgetLine || ""]) });
    }
    if (section.custom === "costs") for (let year = 1; year <= horizon; year++) {
      blocks.push({ kind: "table", label: `Year ${year} quarterly spending`,
        headers: ["Action", "Budget", "Q1 spent", "Q2 spent", "Q3 spent", "Q4 spent", "Spent to date"],
        rows: actions.filter((action) => action.year === year).map((action) => [action.action,
          formatMoney(action.budgetCents), ...Array.from({ length: 4 }, (_, index) => formatMoney(action.updates
            .find((update) => update.quarter === `y${year}q${index + 1}`)?.spentCents || 0)),
          formatMoney(action.updates.reduce((sum, update) => sum + update.spentCents, 0))]) });
      blocks.push({ kind: "table", label: `Finance review: Year ${year}`,
        headers: ["Reviewed by finance committee", "Included in annual budget", "Notes and decisions"],
        rows: [[values[`m6.fin.y${year}.date`] || "", t(values[`m6.fin.y${year}.inbudget`] || ""),
          values[`m6.fin.y${year}.notes`] || ""]] });
    }
    if (section.custom === "surveyLink") blocks.push(text("Survey responses recorded",
      ["board", "staff", "volunteers", "clients", "partners", "funders", "community", "everyone", "paper"]
        .map((audience) => `${t(audience)}: ${values[`m2.sv.resp.${audience}`] || "0"}`).join(" · ")));
    sections.push({ title: `${module.num}. ${module.short} — ${section.title}`, blocks });
  }
  return sections;
}
