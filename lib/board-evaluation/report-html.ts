import type { aggregateAnnualResponses } from "./prototype-domain";
import { annualOpenQuestions } from "./prototype-content";
import { annualOpenQuestionsFr, annualSurveySectionsFr } from "./prototype-content-fr";
import type { SummaryPriority } from "./summary-report";

type Results = ReturnType<typeof aggregateAnnualResponses>;
type Priority = Pick<SummaryPriority, "title" | "owner" | "dueOn" | "measure"> & Partial<Omit<SummaryPriority, "title" | "owner" | "dueOn" | "measure">>;
type YearRecord = { year: string; overall: string; strength: string; priority: string; responseRate: string };

function escape(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

function safeColor(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

export function buildBoardEvaluationReportHtml({
  organizationName, year, logoUrl, primaryColor, secondaryColor, results, themes, themeDetails = [], priorities,
  preparedBy = "", openedOn = "", closedOn = "", changeVsPrior = [],
  strengths = [], concerns = [], monitor = [], discussionQuestions = [], yearRecord = [], notes, french,
}: {
  organizationName: string;
  year: number;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  results: Results;
  themes: string[];
  themeDetails?: Array<Array<{ pattern: string; frequency: string }>>;
  priorities: Priority[];
  preparedBy?: string;
  openedOn?: string;
  closedOn?: string;
  changeVsPrior?: string[];
  strengths?: string[];
  concerns?: string[];
  monitor?: string[];
  discussionQuestions?: string[];
  yearRecord?: YearRecord[];
  notes: string;
  french: boolean;
}) {
  const primary = safeColor(primaryColor, "#134E6E");
  const secondary = safeColor(secondaryColor, "#D2571C");
  const t = (en: string, fr: string) => french ? fr : en;
  const flag = (value: string | null) => {
    if (!value) return t("Insufficient responses", "Réponses insuffisantes");
    return ({ strength: t("Governance strength", "Force de gouvernance"),
      satisfactory: t("Satisfactory — monitor", "Satisfaisant — à surveiller"),
      improve: t("Area for improvement", "Point à améliorer"),
      concern: t("Significant concern", "Préoccupation importante") })[value] || value;
  };
  const trendLabels: Record<string, string> = {
    up: t("Improving", "En hausse"), down: t("Declining", "En baisse"),
    stable: t("Stable", "Stable"), new: t("First year", "Première année"),
  };
  const logo = logoUrl?.startsWith("data:image/") ? `<img class="logo" src="${escape(logoUrl)}" alt="">` : "";
  const trend = (change: string, fallback: string) => !change ? fallback : Number(change) >= 0.3 ? "up" : Number(change) <= -0.3 ? "down" : "stable";
  const sectionRows = results.sections.map((section) => `<tr><td>${section.number}. ${escape(french ? annualSurveySectionsFr[section.number - 1]?.name ?? section.name : section.name)}</td><td>${section.responseCount}</td><td>${section.average === null ? "—" : section.average.toFixed(2)}</td><td>${section.percentPositive === null ? "—" : `${section.percentPositive}%`}</td><td>${escape(changeVsPrior[section.number - 1] || "—")}</td><td>${escape(flag(section.flag))}${section.persistentConcern ? ` · ${t("Persistent concern", "Préoccupation persistante")}` : ""} · ${escape(trendLabels[trend(changeVsPrior[section.number - 1], section.trend)] ?? section.trend)}</td></tr>`).join("");
  const themeRows = (themeDetails.length ? themeDetails : themes.map((pattern) => [{ pattern, frequency: "" }]))
    .map((rows, question) => rows.map((row, index) => row.pattern || row.frequency ? `<li><strong>Q${question + 1} — ${escape(french ? annualOpenQuestionsFr[question] : annualOpenQuestions[question])} · ${t("Theme", "Thème")} ${index + 1}:</strong> ${escape(row.pattern || "—")} <span>(${t("Frequency", "Fréquence")}: ${escape(row.frequency || "—")})</span></li>` : "").join(""))
    .filter(Boolean).join("");
  const priorityRows = priorities.filter((priority) => priority.title || priority.issue || priority.suggestedActions).map((priority, index) => {
    const responsible = priority.responsible;
    const owners = responsible ? [
      responsible.boardChair && t("Board Chair", "Présidence du conseil"),
      responsible.governanceCommittee && t("Governance Committee", "Comité de gouvernance"),
      responsible.ed && t("ED", "DG"),
      responsible.other && (responsible.otherName || t("Other", "Autre")),
    ].filter(Boolean).join(", ") : priority.owner;
    return `<div class="priority"><h3>${t("Priority", "Priorité")} ${index + 1}</h3>
      <p><strong>${t("Section", "Section")}:</strong> ${escape(priority.section || "—")} &nbsp; <strong>${t("Average", "Moyenne")}:</strong> ${escape(priority.average || "—")}</p>
      <p><strong>${t("Issue identified", "Problème identifié")}:</strong> ${escape(priority.issue || "—")}</p>
      <p><strong>${t("Suggested actions", "Mesures proposées")}:</strong> ${escape(priority.suggestedActions || priority.title || "—")}</p>
      <p><strong>${t("Responsible", "Responsable")}:</strong> ${escape(owners || "—")} &nbsp; <strong>${t("Target date", "Date cible")}:</strong> ${escape(priority.dueOn || "—")} &nbsp; <strong>${t("6-month check-in", "Suivi à six mois")}:</strong> ${escape(priority.checkInOn || "—")}</p>
      <p><strong>${t("Success looks like", "La réussite ressemblera à")}:</strong> ${escape(priority.measure)}</p></div>`;
  }).join("");
  const list = (items: string[]) => items.filter(Boolean).length ? `<ol>${items.filter(Boolean).map((item) => `<li>${escape(item)}</li>`).join("")}</ol>` : `<p>—</p>`;
  const yearRows = yearRecord.filter((row) => row.year || row.overall || row.strength || row.priority || row.responseRate)
    .map((row) => `<tr><td>${escape(row.year)}</td><td>${escape(row.overall)}</td><td>${escape(row.strength)}</td><td>${escape(row.priority)}</td><td>${escape(row.responseRate)}</td></tr>`).join("");
  return `<!doctype html><html lang="${french ? "fr" : "en"}"><head><meta charset="utf-8"><title>${escape(organizationName)} — ${year} ${t("Board Evaluation", "Évaluation du conseil")}</title><style>
  @page{size:letter;margin:17mm}*{box-sizing:border-box}body{font:13px/1.55 Arial,Helvetica,sans-serif;color:#24323e;margin:0}h1,h2,h3,p{margin-top:0}h1{font-size:26px;line-height:1.15;color:${primary}}h2{font-size:18px;color:${primary};border-bottom:2px solid ${secondary};padding-bottom:6px;margin-top:25px}.header{border-bottom:4px solid ${primary};padding-bottom:16px;margin-bottom:22px;display:flex;align-items:center;gap:20px}.logo{max-width:150px;max-height:75px;object-fit:contain}.eyebrow{font-weight:bold;text-transform:uppercase;letter-spacing:.13em;color:#617080;font-size:10px}.meta{display:flex;gap:15px}.stat{flex:1;border:1px solid #d9e1e6;border-radius:8px;padding:12px}.stat strong{display:block;font-size:20px;color:${primary}}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #dce3e7;padding:8px 7px}th{background:#f2f5f7;color:${primary}}.priority{border:1px solid #dce3e7;border-left:4px solid ${secondary};padding:12px 14px;margin:10px 0;break-inside:avoid}.priority h3{font-size:14px;margin:0 0 5px}.priority p{margin:0 0 4px}li{margin-bottom:8px}.footer{margin-top:30px;border-top:1px solid #dce3e7;padding-top:8px;color:#677582;font-size:10px}
  </style></head><body><div class="header">${logo}<div><div class="eyebrow">${escape(organizationName)}</div><h1>${t("Board Self-Evaluation — Results & Action Plan", "Autoévaluation du conseil — Résultats et plan d’action")}</h1><div>${t("Board year", "Année du conseil")}: ${year} · ${t("Prepared by", "Préparé par")}: ${escape(preparedBy || "—")}</div><div>${t("Survey open", "Ouverture du sondage")}: ${escape(openedOn || "—")} · ${t("Survey closed", "Clôture du sondage")}: ${escape(closedOn || "—")}</div></div></div>
  <div class="meta"><div class="stat"><strong>${results.invited || "—"}</strong>${t("Invited", "Invités")}</div><div class="stat"><strong>${results.received}</strong>${t("Responses", "Réponses")}</div><div class="stat"><strong>${results.responseRate === null ? "—" : `${results.responseRate}%`}</strong>${t("Response rate", "Taux de réponse")}</div></div>
  <h2>${t("Quantitative results", "Résultats quantitatifs")}</h2><table><thead><tr><th>${t("Section", "Section")}</th><th>${t("# Resp", "Nb rép.")}</th><th>${t("Avg (1–5)", "Moy. (1–5)")}</th><th>% 4–5</th><th>${t("vs Prior", "vs antérieur")}</th><th>${t("Flag", "Indicateur")}</th></tr></thead><tbody>${sectionRows}<tr><th>${t("Overall", "Ensemble")}</th><td>${results.received}</td><td>${results.overallAverage === null ? "—" : results.overallAverage.toFixed(2)}</td><td>${results.overallPositivePercent === null ? "—" : `${results.overallPositivePercent}%`}</td><td>${escape(changeVsPrior[10] || "—")}</td><td>—</td></tr></tbody></table>
  <h2>${t("Top strengths", "Principales forces")}</h2>${list(strengths)}
  <h2>${t("Priority areas for improvement", "Domaines prioritaires à améliorer")}</h2>${list(concerns)}
  <h2>${t("Areas to monitor", "Domaines à surveiller")}</h2>${list(monitor)}
  <h2>${t("Open-ended response themes", "Thèmes des réponses ouvertes")}</h2>${themeRows ? `<ol>${themeRows}</ol>` : `<p>${t("No themes recorded.", "Aucun thème enregistré.")}</p>`}
  <h2>${t("Action planning", "Plan d’action")}</h2>${priorityRows || `<p>${t("No priorities recorded.", "Aucune priorité enregistrée.")}</p>`}
  <h2>${t("Recommended discussion questions", "Questions de discussion recommandées")}</h2>${list(discussionQuestions)}
  <h2>${t("Year-over-year record", "Suivi d’une année à l’autre")}</h2><table><thead><tr><th>${t("Year", "Année")}</th><th>${t("Overall average", "Moyenne générale")}</th><th>${t("Top strength", "Principale force")}</th><th>${t("Improvement priority", "Priorité d’amélioration")}</th><th>${t("Response rate", "Taux de réponse")}</th></tr></thead><tbody>${yearRows || '<tr><td colspan="5">—</td></tr>'}</tbody></table>
  <p>${escape(notes || t("No discussion notes recorded.", "Aucune note de discussion enregistrée."))}</p>
  <div class="footer">${escape(organizationName)} · ${t("Confidential board governance report", "Rapport confidentiel de gouvernance du conseil")}. ${t("Small samples are suppressed; no individual response is shown.", "Les petits échantillons sont masqués; aucune réponse individuelle n’est affichée.")}</div></body></html>`;
}
