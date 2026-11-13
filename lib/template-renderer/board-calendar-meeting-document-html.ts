import type { MeetingDocument } from "./board-calendar-meeting-documents";
import { meetingDocumentSections, meetingDocumentTitles } from "./board-calendar-meeting-documents";
import { translateFrenchUiText } from "@/lib/i18n/french-runtime-translations";
import type { Locale } from "@/lib/i18n/locales";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function paragraph(value: string, locale: Locale) {
  return escapeHtml(value).replace(/\n/g, "<br />") || (locale === "fr-CA" ? "Non consigné" : "Not recorded");
}

export function buildMeetingDocumentHtml({
  document,
  meeting,
  memberNames,
  organizationName,
  primaryColor = "#2f6b4f",
  secondaryColor = "#df7a54",
  logoUrl,
  readerName,
  locale = "en-CA",
}: {
  document: MeetingDocument;
  meeting: { title: string; date: string; time: string; location: string };
  memberNames: Map<string, string>;
  organizationName: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  readerName?: string;
  locale?: Locale;
}) {
  const tr = (value: string) => locale === "fr-CA" ? translateFrenchUiText(value) : value;
  const trStatus = (value: string) => {
    const normalized = value.replace("_", " ");
    return locale === "fr-CA"
      ? tr(normalized.charAt(0).toUpperCase() + normalized.slice(1))
      : normalized;
  };
  const title = tr(meetingDocumentTitles[document.kind]);
  const primary = /^#[0-9a-f]{6}$/i.test(primaryColor) ? primaryColor : "#2f6b4f";
  const secondary = /^#[0-9a-f]{6}$/i.test(secondaryColor) ? secondaryColor : "#df7a54";
  const safeLogo = logoUrl?.startsWith("data:image/") ? logoUrl : undefined;
  const name = (id: string) => memberNames.get(id) || tr("Not selected");
  const attendance = document.attendance.map((entry) =>
    `<tr><td>${escapeHtml(name(entry.memberId))}</td><td>${escapeHtml(trStatus(entry.status))}</td></tr>`,
  ).join("");
  const motions = document.motions.map((motion, index) =>
    `<section><h3>${tr("Motion")} ${index + 1}</h3><p>${paragraph(motion.text, locale)}</p><p>${tr("Moved by")}: ${escapeHtml(motion.movedByName || name(motion.movedBy))} · ${tr("Seconded by")}: ${escapeHtml(motion.secondedByName || name(motion.secondedBy))}</p><p>${tr("For")} ${motion.votesFor} · ${tr("Against")} ${motion.votesAgainst} · ${tr("Abstain")} ${motion.abstentions} · ${escapeHtml(trStatus(motion.outcome))}</p></section>`,
  ).join("");
  const actions = document.actions.map((action) =>
    `<tr><td>${paragraph(action.description, locale)}</td><td>${escapeHtml(action.ownerName || name(action.ownerId))}</td><td>${escapeHtml(action.dueDate || (locale === "fr-CA" ? "Non fixée" : "Not set"))}</td><td>${escapeHtml(trStatus(action.status ?? (action.done ? "done" : "open")))}</td></tr>`,
  ).join("");
  const actionsTable = `<table><thead><tr><th>${tr("Action")}</th><th>${tr("Owner")}</th><th>${locale === "fr-CA" ? "Échéance" : "Due"}</th><th>${tr("Status")}</th></tr></thead><tbody>${actions || `<tr><td colspan="4">${locale === "fr-CA" ? "Aucune mesure consignée" : "No actions recorded"}</td></tr>`}</tbody></table>`;
  const sections = meetingDocumentSections[document.kind].map((section) => {
    if (document.kind === "committee_agenda" && section.id === "review") {
      const legacyNotes = document.sections.review?.trim()
        ? `<p>${paragraph(document.sections.review, locale)}</p>` : "";
      return `<section><h2>${escapeHtml(tr(section.label))}</h2>${legacyNotes}${actionsTable}</section>`;
    }
    return `<section><h2>${escapeHtml(tr(section.label))}</h2><p>${paragraph(document.sections[section.id] || "", locale)}</p></section>`;
  }).join("");

  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8" /><title>${escapeHtml(title)} - ${escapeHtml(meeting.title)}</title><style>
    @page { size: Letter; margin: .75in .5in; }
    body { font: 11px/1.5 Arial,sans-serif; color:#162033; }
    .cover { min-height:9in; display:flex; flex-direction:column; justify-content:center; border-top:10px solid ${secondary}; }
    .eyebrow { color:${primary}; text-transform:uppercase; letter-spacing:.15em; font-weight:700; }
    .logo { max-width:180px;max-height:90px;object-fit:contain;margin-bottom:24px; }
    .reader { position:fixed;bottom:0;right:0;color:#666;font-size:9px; }
    h1 { font-size:31px; margin:.2in 0; } h2 { font-size:15px; color:${primary}; margin:20px 0 6px; }
    h3 { font-size:12px; margin:14px 0 5px; } section { break-inside:avoid; }
    .content { break-before:page; } table { border-collapse:collapse; width:100%; }
    th,td { border:1px solid #d8dee8; padding:7px; text-align:left; vertical-align:top; }
    th { background:#f5f8f6; } p { white-space:normal; }
  </style></head><body>
    ${readerName ? `<p class="reader">${locale === "fr-CA" ? "Préparé pour" : "Prepared for"} ${escapeHtml(readerName)}</p>` : ""}
    <div class="cover">${safeLogo ? `<img class="logo" src="${escapeHtml(safeLogo)}" alt="" />` : ""}<p class="eyebrow">${escapeHtml(organizationName)}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(meeting.title)}</p><p>${escapeHtml([meeting.date, meeting.time, meeting.location].filter(Boolean).join(" · "))}</p><p>${tr(document.status === "approved" ? "Approved" : "Draft")} · ${locale === "fr-CA" ? "Mis à jour le" : "Updated"} ${escapeHtml(document.updatedAt.slice(0, 10))}</p></div>
    <div class="content"><h2>${tr("Attendance")}</h2><table><thead><tr><th>${locale === "fr-CA" ? "Membre" : "Member"}</th><th>${tr("Status")}</th></tr></thead><tbody>${attendance || `<tr><td colspan="2">${locale === "fr-CA" ? "Aucune présence consignée" : "No attendance recorded"}</td></tr>`}</tbody></table>${sections}
    ${document.kind.endsWith("minutes") ? `<h2>${tr("Decisions and motions")}</h2>${motions || `<p>${locale === "fr-CA" ? "Aucune motion consignée." : "No motions recorded."}</p>`}<h2>${tr("Action items")}</h2>${actionsTable}` : ""}</div>
  </body></html>`;
}
