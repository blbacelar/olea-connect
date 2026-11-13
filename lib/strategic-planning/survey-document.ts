import type { BrandProfile } from "@/lib/types";
import { translateFrenchUiText } from "@/lib/i18n/french-runtime-translations";
import type { Locale } from "@/lib/i18n/locales";
import { escapeReportHtml } from "@/lib/reports/branded-html";

import { stakeholderAudiences, stakeholderThemes, type StakeholderQuestion } from "./stakeholder-survey";

const agree = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];
const rating = ["Poor", "Fair", "Good", "Very good", "Excellent"];

function questionAnswer(question: StakeholderQuestion, locale: Locale) {
  if (question.type === "open") return '<div class="answer-box"></div>';
  const options = question.type === "agree" ? agree : question.type === "rating" ? rating : question.options;
  return `<div class="choices">${options.map((option) => `<div>☐ ${escapeReportHtml(locale === "fr-CA" ? translateFrenchUiText(option) : option)}</div>`).join("")}</div>`;
}

export function buildStakeholderSurveyDocument(input: {
  brand: BrandProfile;
  title: string;
  audience: string;
  questions: StakeholderQuestion[];
  onlineUrl: string;
  horizon: number;
  details?: { intro?: string; deadline?: string; returnInstructions?: string;
    contact?: string; anonymous?: boolean };
  locale?: Locale;
  word?: boolean;
}) {
  const { brand, title, audience, questions, onlineUrl, horizon, details, word } = input;
  const locale = input.locale ?? "en-CA";
  const tr = (value: string) => locale === "fr-CA" ? translateFrenchUiText(value) : value;
  const primary = /^#[0-9a-fA-F]{6}$/.test(brand.primaryColor) ? brand.primaryColor : "#446B52";
  const secondary = /^#[0-9a-fA-F]{6}$/.test(brand.secondaryColor) ? brand.secondaryColor : "#F4EFE4";
  const logo = brand.logoUrl && /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[a-zA-Z0-9+/=]+$/.test(brand.logoUrl)
    ? `<img class="logo" src="${escapeReportHtml(brand.logoUrl)}" alt="">` : "";
  const audienceName = stakeholderAudiences.find((item) => item.v === audience)?.l ?? "Everyone";
  const minutes = Math.max(3, Math.ceil(questions.reduce((total, question) =>
    total + (question.type === "open" ? 1.5 : 0.5), 0)));
  let previousTheme = "";
  const body = questions.map((question, index) => {
    const heading = question.theme !== previousTheme
      ? `<h2>${escapeReportHtml(tr(stakeholderThemes.find(([key]) => key === question.theme)?.[1] ?? question.theme))}</h2>` : "";
    previousTheme = question.theme;
    return `${heading}<div class="question"><p><strong>${index + 1}.</strong> ${escapeReportHtml(tr(question.text))}`
      + `${question.type === "multi" && !/choose up to/i.test(question.text) ? ` (${locale === "fr-CA" ? "Choisissez jusqu'à trois options." : "Choose up to three."})` : ""}</p>`
      + `${questionAnswer(question, locale)}</div>`;
  }).join("");
  return `${word ? "\uFEFF" : "<!doctype html>"}<html lang="${locale}"><head><meta charset="utf-8">`
    + `<title>${escapeReportHtml(title)}</title><style>@page{size:Letter;margin:18mm}`
    + `body{font:11pt/1.4 Arial,sans-serif;color:#222;margin:0 auto;padding:24px;max-width:720px}`
    + `.org{color:${primary};font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:9pt}`
    + `.logo{max-width:160px;max-height:55px;object-fit:contain}.meta{background:${secondary};border-left:4px solid ${primary};padding:10px;margin:14px 0}`
    + `h1{font-size:20pt;margin:5px 0}h2{font-size:13pt;color:${primary};border-bottom:1px solid #ccc;margin-top:22px}`
    + `.question{margin:12px 0;break-inside:avoid;page-break-inside:avoid}.question p{margin-bottom:5px}`
    + `.choices{line-height:1.8}.answer-box{height:64pt;border:1px solid #999}`
    + `.online{border:1px solid #ccc;padding:9px;overflow-wrap:anywhere}.thanks{border-top:1px solid #ccc;margin-top:24px}`
    + `</style></head><body>${logo}<p class="org">${escapeReportHtml(brand.organizationName)}</p>`
    + `<h1>${escapeReportHtml(title)}</h1><p>${locale === "fr-CA" ? "Sondage destiné à" : "Survey for"} ${escapeReportHtml(tr(audienceName).toLowerCase())}</p>`
    + `<p>${escapeReportHtml(details?.intro || (locale === "fr-CA" ?
      `${brand.organizationName} prépare un nouveau plan stratégique pour les ${horizon} prochaines années. Nous aimerions savoir ce que nous faisons bien, ce que nous pourrions améliorer et où concentrer nos efforts. Le sondage prend environ ${minutes} minutes.` :
      `${brand.organizationName} is preparing a new strategic plan for the next ${horizon} years. We would like to hear what we do well, what we could do better, and where we should focus. The survey takes about ${minutes} minutes.`))}</p>`
    + `<p class="online"><strong>${locale === "fr-CA" ? "Vous préférez répondre en ligne?" : "Prefer to answer online?"}</strong> ${locale === "fr-CA" ? "Consultez" : "Visit"} ${escapeReportHtml(onlineUrl)}</p>`
    + `<p class="meta"><strong>${locale === "fr-CA" ? "Durée" : "Time"}:</strong> ${locale === "fr-CA" ? "environ" : "about"} ${minutes} minutes`
    + `${details?.deadline ? `<br><strong>${locale === "fr-CA" ? "Répondre avant le" : "Reply by"}:</strong> ${escapeReportHtml(details.deadline)}` : ""}`
    + `${details?.anonymous === false ? "" : `<br>${locale === "fr-CA" ? "Vos réponses sont anonymes. Nous partageons un résumé, pas les réponses individuelles." : "Your answers are anonymous. We share a summary, not individual responses."}`}</p>`
    + `${details?.returnInstructions ? `<p>${escapeReportHtml(details.returnInstructions)}</p>` : ""}`
    + `${body || `<p>${locale === "fr-CA" ? "Aucune question sélectionnée pour l'instant." : "No questions selected yet."}</p>`}`
    + `<div class="thanks"><p><strong>${locale === "fr-CA" ? "Merci de contribuer à façonner notre avenir." : "Thank you for helping shape our future."}</strong></p>`
    + `${details?.contact || brand.contactEmail ? `<p>${locale === "fr-CA" ? "Des questions? Communiquez avec" : "Questions? Contact"} ${escapeReportHtml(details?.contact || brand.contactEmail || "")}.</p>` : ""}</div>`
    + `</body></html>`;
}
