import type { aggregateAnnualResponses } from "./prototype-domain";
import { annualSurveySectionsFr } from "./prototype-content-fr";

type Results = ReturnType<typeof aggregateAnnualResponses>;
type Priority = { title: string; owner: string; dueOn: string; checkInOn?: string; measure: string };
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
  organizationName, year, logoUrl, primaryColor, secondaryColor, results, themes, priorities,
  strengths = [], concerns = [], monitor = [], discussionQuestions = [], yearRecord = [], notes, french,
}: {
  organizationName: string;
  year: number;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  results: Results;
  themes: string[];
  priorities: Priority[];
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
  const sectionRows = results.sections.map((section) => `<tr><td>${section.number}. ${escape(french ? annualSurveySectionsFr[section.number - 1]?.name ?? section.name : section.name)}</td><td>${section.average === null ? "—" : section.average.toFixed(2)}</td><td>${escape(flag(section.flag))}${section.persistentConcern ? ` · ${t("Persistent concern", "Préoccupation persistante")}` : ""}</td><td>${escape(trendLabels[section.trend] ?? section.trend)}</td></tr>`).join("");
  const themeRows = themes.filter(Boolean).map((theme, index) => `<li><strong>${t("Theme", "Thème")} ${index + 1}.</strong> ${escape(theme)}</li>`).join("");
  const priorityRows = priorities.filter((priority) => priority.title).map((priority, index) => `<div class="priority"><h3>${t("Priority", "Priorité")} ${index + 1}: ${escape(priority.title)}</h3><p><strong>${t("Owner", "Responsable")}:</strong> ${escape(priority.owner || "—")} &nbsp; <strong>${t("Target date", "Date cible")}:</strong> ${escape(priority.dueOn || "—")} &nbsp; <strong>${t("6-month check-in", "Suivi à six mois")}:</strong> ${escape(priority.checkInOn || "—")}</p><p>${escape(priority.measure)}</p></div>`).join("");
  const list = (items: string[]) => items.filter(Boolean).length ? `<ol>${items.filter(Boolean).map((item) => `<li>${escape(item)}</li>`).join("")}</ol>` : `<p>—</p>`;
  const yearRows = yearRecord.filter((row) => row.year || row.overall || row.strength || row.priority || row.responseRate)
    .map((row) => `<tr><td>${escape(row.year)}</td><td>${escape(row.overall)}</td><td>${escape(row.strength)}</td><td>${escape(row.priority)}</td><td>${escape(row.responseRate)}</td></tr>`).join("");
  return `<!doctype html><html lang="${french ? "fr" : "en"}"><head><meta charset="utf-8"><title>${escape(organizationName)} — ${year} ${t("Board Evaluation", "Évaluation du conseil")}</title><style>
  @page{size:letter;margin:17mm}*{box-sizing:border-box}body{font:13px/1.55 Arial,Helvetica,sans-serif;color:#24323e;margin:0}h1,h2,h3,p{margin-top:0}h1{font-size:26px;line-height:1.15;color:${primary}}h2{font-size:18px;color:${primary};border-bottom:2px solid ${secondary};padding-bottom:6px;margin-top:25px}.header{border-bottom:4px solid ${primary};padding-bottom:16px;margin-bottom:22px;display:flex;align-items:center;gap:20px}.logo{max-width:150px;max-height:75px;object-fit:contain}.eyebrow{font-weight:bold;text-transform:uppercase;letter-spacing:.13em;color:#617080;font-size:10px}.meta{display:flex;gap:15px}.stat{flex:1;border:1px solid #d9e1e6;border-radius:8px;padding:12px}.stat strong{display:block;font-size:20px;color:${primary}}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #dce3e7;padding:8px 7px}th{background:#f2f5f7;color:${primary}}.priority{border:1px solid #dce3e7;border-left:4px solid ${secondary};padding:12px 14px;margin:10px 0;break-inside:avoid}.priority h3{font-size:14px;margin:0 0 5px}.priority p{margin:0 0 4px}li{margin-bottom:8px}.footer{margin-top:30px;border-top:1px solid #dce3e7;padding-top:8px;color:#677582;font-size:10px}
  </style></head><body><div class="header">${logo}<div><div class="eyebrow">${escape(organizationName)}</div><h1>${t("Board Self-Evaluation — Results & Action Plan", "Autoévaluation du conseil — Résultats et plan d’action")}</h1><div>${year} · ${t("Administrator prepared", "Préparé par l’administration")}</div></div></div>
  <div class="meta"><div class="stat"><strong>${results.invited || "—"}</strong>${t("Invited", "Invités")}</div><div class="stat"><strong>${results.received}</strong>${t("Responses", "Réponses")}</div><div class="stat"><strong>${results.responseRate === null ? "—" : `${results.responseRate}%`}</strong>${t("Response rate", "Taux de réponse")}</div></div>
  <h2>${t("Quantitative results", "Résultats quantitatifs")}</h2><table><thead><tr><th>${t("Governance area", "Domaine de gouvernance")}</th><th>${t("Average", "Moyenne")}</th><th>${t("Assessment", "Évaluation")}</th><th>${t("Trend", "Tendance")}</th></tr></thead><tbody>${sectionRows}</tbody></table>
  <p><strong>${t("Overall average", "Moyenne générale")}:</strong> ${results.overallAverage === null ? "—" : results.overallAverage.toFixed(2)} / 5</p>
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
