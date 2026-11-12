import type { MeetingDocument } from "./board-calendar-meeting-documents";
import { meetingDocumentSections, meetingDocumentTitles } from "./board-calendar-meeting-documents";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function paragraph(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br />") || "Not recorded";
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
}: {
  document: MeetingDocument;
  meeting: { title: string; date: string; time: string; location: string };
  memberNames: Map<string, string>;
  organizationName: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  readerName?: string;
}) {
  const title = meetingDocumentTitles[document.kind];
  const primary = /^#[0-9a-f]{6}$/i.test(primaryColor) ? primaryColor : "#2f6b4f";
  const secondary = /^#[0-9a-f]{6}$/i.test(secondaryColor) ? secondaryColor : "#df7a54";
  const safeLogo = logoUrl?.startsWith("data:image/") ? logoUrl : undefined;
  const name = (id: string) => memberNames.get(id) || "Not selected";
  const sections = meetingDocumentSections[document.kind].map((section) =>
    `<section><h2>${escapeHtml(section.label)}</h2><p>${paragraph(document.sections[section.id] || "")}</p></section>`,
  ).join("");
  const attendance = document.attendance.map((entry) =>
    `<tr><td>${escapeHtml(name(entry.memberId))}</td><td>${escapeHtml(entry.status.replace("_", " "))}</td></tr>`,
  ).join("");
  const motions = document.motions.map((motion, index) =>
    `<section><h3>Motion ${index + 1}</h3><p>${paragraph(motion.text)}</p><p>Moved by: ${escapeHtml(name(motion.movedBy))} · Seconded by: ${escapeHtml(name(motion.secondedBy))}</p><p>For ${motion.votesFor} · Against ${motion.votesAgainst} · Abstain ${motion.abstentions} · ${escapeHtml(motion.outcome)}</p></section>`,
  ).join("");
  const actions = document.actions.map((action) =>
    `<tr><td>${paragraph(action.description)}</td><td>${escapeHtml(name(action.ownerId))}</td><td>${escapeHtml(action.dueDate || "Not set")}</td></tr>`,
  ).join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>${escapeHtml(title)} - ${escapeHtml(meeting.title)}</title><style>
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
    ${readerName ? `<p class="reader">Prepared for ${escapeHtml(readerName)}</p>` : ""}
    <div class="cover">${safeLogo ? `<img class="logo" src="${escapeHtml(safeLogo)}" alt="" />` : ""}<p class="eyebrow">${escapeHtml(organizationName)}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(meeting.title)}</p><p>${escapeHtml([meeting.date, meeting.time, meeting.location].filter(Boolean).join(" · "))}</p><p>${document.status === "approved" ? "Approved" : "Draft"} · Updated ${escapeHtml(document.updatedAt.slice(0, 10))}</p></div>
    <div class="content"><h2>Attendance</h2><table><thead><tr><th>Member</th><th>Status</th></tr></thead><tbody>${attendance || '<tr><td colspan="2">No attendance recorded</td></tr>'}</tbody></table>${sections}
    ${document.kind.endsWith("minutes") ? `<h2>Decisions and motions</h2>${motions || "<p>No motions recorded.</p>"}<h2>Action items</h2><table><thead><tr><th>Action</th><th>Owner</th><th>Due</th></tr></thead><tbody>${actions || '<tr><td colspan="3">No actions recorded</td></tr>'}</tbody></table>` : ""}</div>
  </body></html>`;
}
