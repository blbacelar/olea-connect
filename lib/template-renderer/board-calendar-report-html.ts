import type { BrandProfile } from "@/lib/types";
import type { Locale } from "@/lib/i18n/locales";
import { translateFrenchUiText } from "@/lib/i18n/french-runtime-translations";

import { buildBoardCalendarSetup, syncBoardCalendarGeneratedTasks } from "./board-calendar-editor";
import {
  buildBoardPackageMeetings,
  getGeneralBoardPackageDocuments,
} from "./board-calendar-packages";
import type {
  TemplateFieldSchema,
  TemplateFormData,
  TemplateValue,
} from "./types";

type TemplateRecord = Record<string, unknown>;

export interface BoardCalendarReportSection {
  description: string;
  emptyMessage: string;
  rows: string[][];
  title: string;
  columns: string[];
}

export interface BoardCalendarReport {
  generatedAt: Date;
  organizationName: string;
  sections: BoardCalendarReportSection[];
  title: string;
}

const fallbackPrimaryColor = "#2f6b4f";
const fallbackSecondaryColor = "#df7a54";

const reportFrenchLabels: Record<string, string> = {
  "Board portal report": "Rapport du portail du conseil",
  "Board calendar report": "Rapport du calendrier du conseil",
  Generated: "Généré le",
  "Entries created as Meeting or Event.": "Éléments créés comme réunion ou événement.",
  "Generated and manual workflow tasks.": "Tâches générées et tâches ajoutées manuellement.",
  "Board contacts and committee directory.": "Répertoire des contacts du conseil et des comités.",
  "Milestones calculated from the confirmed AGM date.": "Jalons calculés à partir de la date confirmée de l'AGA.",
  "Meeting package document index.": "Index des documents des dossiers de réunion.",
  "No meetings have been added yet.": "Aucune réunion n'a encore été ajoutée.",
  "No workflow tasks are available yet.": "Aucune tâche n'est disponible pour le moment.",
  "No directory entries have been added yet.": "Aucune entrée n'a encore été ajoutée au répertoire.",
  "No AGM milestones have been added yet.": "Aucun jalon de l'AGA n'a encore été ajouté.",
  "No board package documents have been added yet.": "Aucun document de dossier du conseil n'a encore été ajouté.",
  "Meeting / Document": "Réunion / Document",
  "Board packages": "Dossiers du conseil",
  "AGM planning timeline": "Calendrier de préparation de l'AGA",
  "Board Calendar": "Calendrier du conseil",
  Details: "Détails",
  Done: "Terminé",
  Documents: "Documents",
  "Lead contact": "Personne responsable",
  "Virtual link": "Lien virtuel",
  "Role / Committee": "Rôle / Comité",
  "Days before AGM": "Jours avant l'AGA",
  "Target date": "Date cible",
  "Calendar administrator": "Administration du calendrier",
  "Executive Director / CEO": "Direction générale",
  "Board Chair": "Présidence du conseil",
  "General": "Général",
  "Untitled task": "Tâche sans titre",
  "Untitled": "Sans titre",
  "No meetings": "Aucune réunion",
};

function reportText(value: string, locale: Locale) {
  return locale === "fr-CA" ? reportFrenchLabels[value] ?? translateFrenchUiText(value) : value;
}

function localizeReportSection(section: BoardCalendarReportSection, locale: Locale): BoardCalendarReportSection {
  if (locale !== "fr-CA") return section;
  return {
    ...section,
    title: reportText(section.title, locale),
    description: reportText(section.description, locale),
    emptyMessage: reportText(section.emptyMessage, locale),
    columns: section.columns.map((column) => reportText(column, locale)),
    rows: section.rows.map((row) => row.map((cell, index) =>
      ["Status", "Done", "Confirmed"].includes(section.columns[index])
        || ["Role / Committee", "Details"].includes(section.columns[index])
        ? reportText(cell, locale) : cell)),
  };
}

export function isBoardCalendarSchema(schema: TemplateFieldSchema) {
  return schema.presentation?.calendar?.enabled === true;
}

export function buildBoardCalendarReport({
  formData,
  generatedAt = new Date(),
  organizationName,
  title,
  locale = "en-CA",
}: {
  formData: TemplateFormData;
  generatedAt?: Date;
  organizationName: string;
  title: string;
  locale?: Locale;
}): BoardCalendarReport {
  const syncedData = syncBoardCalendarGeneratedTasks(formData);

  return {
    generatedAt,
    organizationName,
    title: reportText(title, locale),
    sections: [
      buildMeetingsSection(syncedData),
      buildWorkflowSection(syncedData),
      buildDirectorySection(syncedData),
      buildAgmTimelineSection(syncedData),
      buildBoardPackagesSection(syncedData),
    ].map((section) => localizeReportSection(section, locale)),
  };
}

export function buildBoardCalendarReportHtml({
  brand,
  formData,
  generatedAt = new Date(),
  organizationName,
  title,
  locale = "en-CA",
}: {
  brand: BrandProfile;
  formData: TemplateFormData;
  generatedAt?: Date;
  organizationName: string;
  title: string;
  locale?: Locale;
}) {
  const report = buildBoardCalendarReport({
    formData,
    generatedAt,
    organizationName,
    title,
    locale,
  });
  const primaryColor = sanitizeCssColor(brand.primaryColor, fallbackPrimaryColor);
  const secondaryColor = sanitizeCssColor(
    brand.secondaryColor,
    fallbackSecondaryColor,
  );
  const logoMarkup = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(organizationName)} logo" />`
    : `<span>${escapeHtml(brand.logoInitials || getInitials(organizationName))}</span>`;

  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title)} ${locale === "fr-CA" ? "rapport" : "report"}</title>
  <style>
    :root {
      --brand-primary: ${primaryColor};
      --brand-secondary: ${secondaryColor};
      --ink: #162033;
      --muted: #52637a;
      --line: #d8dee8;
      --soft: #f5f8f6;
      --surface: #ffffff;
    }
    @page {
      margin: 0.75in 0.45in 0.78in;
      size: Letter;
    }
    * { box-sizing: border-box; }
    body {
      background: #ffffff;
      color: var(--ink);
      font-family: Arial, sans-serif;
      font-size: 11px;
      line-height: 1.45;
      margin: 0;
    }
    .accent { background: var(--brand-secondary); height: 10px; margin: 0 -0.45in 24px; }
    .cover-page {
      display: flex;
      flex-direction: column;
      min-height: 9.25in;
      page-break-after: always;
    }
    .cover-logo {
      align-items: center;
      background: var(--brand-primary);
      border-radius: 14px;
      color: #fff;
      display: flex;
      flex: 0 0 176px;
      font-size: 18px;
      font-weight: 800;
      height: 72px;
      justify-content: center;
      letter-spacing: 0.08em;
      overflow: hidden;
      width: 176px;
    }
    .cover-logo img {
      height: 100%;
      object-fit: contain;
      padding: 8px;
      width: 100%;
    }
    .cover-content {
      margin-top: auto;
      padding-bottom: 42px;
    }
    .cover-eyebrow {
      color: #94a3b8;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.16em;
      margin: 0 0 12px;
      text-transform: uppercase;
    }
    .cover-title {
      color: var(--brand-primary);
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.1;
      margin: 0;
      max-width: 520px;
    }
    .cover-rule {
      background: var(--brand-secondary);
      border-radius: 999px;
      height: 4px;
      margin: 28px 0 28px;
      width: 92px;
    }
    .cover-org {
      color: var(--ink);
      font-size: 17px;
      font-weight: 800;
      margin: 0 0 8px;
    }
    .cover-meta {
      color: #64748b;
      font-size: 13px;
      margin: 0;
    }
    .brand-header {
      align-items: center;
      border-bottom: 1px solid var(--line);
      display: flex;
      gap: 14px;
      margin-bottom: 26px;
      padding-bottom: 18px;
    }
    .logo {
      align-items: center;
      background: var(--brand-primary);
      border-radius: 9px;
      color: #fff;
      display: flex;
      flex: 0 0 92px;
      font-size: 12px;
      font-weight: 800;
      height: 42px;
      justify-content: center;
      letter-spacing: 0.08em;
      overflow: hidden;
      width: 92px;
    }
    .logo img {
      height: 100%;
      object-fit: contain;
      padding: 4px;
      width: 100%;
    }
    .eyebrow {
      color: var(--brand-primary);
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.14em;
      margin: 0 0 2px;
      text-transform: uppercase;
    }
    h1 {
      color: #10233f;
      font-size: 22px;
      line-height: 1.15;
      margin: 0;
    }
    .meta {
      color: var(--muted);
      margin-top: 4px;
    }
    section {
      break-inside: avoid;
      margin: 0 0 24px;
    }
    h2 {
      color: #10233f;
      font-size: 16px;
      margin: 0 0 4px;
    }
    .section-description {
      color: var(--muted);
      margin: 0 0 10px;
    }
    table {
      border-collapse: collapse;
      table-layout: fixed;
      width: 100%;
    }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    th {
      background: var(--brand-primary);
      color: #ffffff;
      font-size: 8.5px;
      letter-spacing: 0.12em;
      padding: 8px 7px;
      text-align: left;
      text-transform: uppercase;
      vertical-align: top;
    }
    td {
      border: 1px solid var(--line);
      color: #26344a;
      padding: 7px;
      vertical-align: top;
      word-break: break-word;
    }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    .empty {
      border: 1px dashed var(--line);
      border-radius: 12px;
      color: var(--muted);
      padding: 14px;
    }
    .pill {
      border: 1px solid #d8dee8;
      border-radius: 999px;
      display: inline-block;
      padding: 2px 8px;
      white-space: nowrap;
    }
    .notes {
      color: #475569;
      max-width: 18ch;
    }
    a { color: var(--brand-primary); overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <section class="cover-page">
    <div class="cover-logo">${logoMarkup}</div>
    <div class="cover-content">
      <p class="cover-eyebrow">${reportText("Board portal report", locale)}</p>
      <h1 class="cover-title">${escapeHtml(report.title)}</h1>
      <div class="cover-rule"></div>
      <p class="cover-org">${escapeHtml(report.organizationName)}</p>
      <p class="cover-meta">${reportText("Generated", locale)} ${escapeHtml(formatDateTime(report.generatedAt, locale))}</p>
    </div>
  </section>
  <main>
    <div class="accent"></div>
    <header class="brand-header">
      <div class="logo">${logoMarkup}</div>
      <div>
        <p class="eyebrow">${reportText("Board calendar report", locale)}</p>
        <h1>${escapeHtml(report.title)}</h1>
        <div class="meta">
          ${escapeHtml(report.organizationName)} · ${reportText("Generated", locale)} ${escapeHtml(formatDateTime(report.generatedAt, locale))}
        </div>
      </div>
    </header>
    ${report.sections.map(renderSection).join("")}
  </main>
</body>
</html>`;
}

export function buildBoardCalendarReportFooterText(
  brand: BrandProfile,
  organizationName: string,
) {
  const contactItems = [
    brand.address,
    brand.phone,
    brand.contactEmail,
    brand.website,
  ].filter(Boolean);

  return contactItems.length
    ? contactItems.map((item) => item ?? "").join(" | ")
    : organizationName;
}

export function buildBoardCalendarReportHeaderHtml(
  organizationName: string,
  title: string,
  locale: Locale = "en-CA",
) {
  return `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #d8dee8;padding-bottom:5px;width:100%"><strong>${escapeHtml(organizationName)}</strong><span>${escapeHtml(reportText(title, locale))}</span></div>`;
}

function buildMeetingsSection(data: TemplateFormData): BoardCalendarReportSection {
  return {
    title: "Meetings",
    description: "Entries created as Meeting or Event.",
    columns: [
      "Meeting",
      "Date",
      "Time",
      "Location",
      "Virtual link",
      "Lead contact",
      "Confirmed",
      "Notes",
    ],
    rows: getRows(data, "meetings").map((meeting) => [
      getString(meeting, "committee") || getString(meeting, "type") || "Untitled",
      getString(meeting, "date"),
      getString(meeting, "time"),
      getString(meeting, "location"),
      getString(meeting, "virtual_link"),
      getString(meeting, "lead_contact"),
      getString(meeting, "confirmed"),
      getString(meeting, "notes"),
    ]),
    emptyMessage: "No meetings have been added yet.",
  };
}

function buildWorkflowSection(data: TemplateFormData): BoardCalendarReportSection {
  return {
    title: "Staff task list",
    description: "Generated and manual workflow tasks.",
    columns: [
      "Task",
      "Due date",
      "Related meeting",
      "Responsible",
      "Status",
      "Done",
      "Notes",
    ],
    rows: getRows(data, "tasks").map((task) => [
      getString(task, "task") || "Untitled task",
      getString(task, "due_date"),
      getString(task, "related_meeting"),
      getString(task, "responsible"),
      getString(task, "status") || "Not Started",
      getBoolean(task, "done") ? "Yes" : "No",
      getString(task, "notes"),
    ]),
    emptyMessage: "No workflow tasks are available yet.",
  };
}

function buildDirectorySection(data: TemplateFormData): BoardCalendarReportSection {
  const setup = buildBoardCalendarSetup(data);
  const rows = getRows(data, "committees").map((committee) => [
    getString(committee, "name") || getString(committee, "committee"),
    getString(committee, "chair"),
    getString(committee, "notes"),
  ]);

  if (
    setup.administrator ||
    setup.administratorEmail ||
    setup.executiveDirector ||
    setup.boardChair
  ) {
    rows.unshift(
      ["Calendar administrator", setup.administrator, setup.administratorEmail],
      ["Executive Director / CEO", setup.executiveDirector, ""],
      ["Board Chair", setup.boardChair, ""],
    );
  }

  return {
    title: "Directory",
    description: "Board contacts and committee directory.",
    columns: ["Role / Committee", "Contact", "Notes"],
    rows: rows.filter((row) => row.some(Boolean)),
    emptyMessage: "No directory entries have been added yet.",
  };
}

function buildAgmTimelineSection(
  data: TemplateFormData,
): BoardCalendarReportSection {
  return {
    title: "AGM planning timeline",
    description: "Milestones calculated from the confirmed AGM date.",
    columns: [
      "Track",
      "Task",
      "Days before AGM",
      "Target date",
      "Responsible",
      "Status",
      "Done",
      "Notes",
    ],
    rows: getRows(data, "agm_milestones").map((milestone) => [
      getString(milestone, "track"),
      getString(milestone, "task"),
      getDisplayValue(milestone.days_before),
      getString(milestone, "calculated_date"),
      getString(milestone, "responsible"),
      getString(milestone, "status") || "Not Started",
      getBoolean(milestone, "done") ? "Yes" : "No",
      getString(milestone, "notes"),
    ]),
    emptyMessage: "No AGM milestones have been added yet.",
  };
}

function buildBoardPackagesSection(
  data: TemplateFormData,
): BoardCalendarReportSection {
  const packageMeetings = buildBoardPackageMeetings(data);
  const meetingRows = packageMeetings.map((meeting) => [
    meeting.title,
    meeting.date,
    meeting.time,
    String(meeting.documentCount),
    meeting.documents.map((document) => document.name).join(", "),
  ]);
  const generalDocuments = getGeneralBoardPackageDocuments(data).map(
    (document) => [
      document.name,
      "",
      "",
      "General",
      document.confidential ? "Confidential" : document.category,
    ],
  );

  return {
    title: "Board packages",
    description: "Meeting package document index.",
    columns: ["Meeting / Document", "Date", "Time", "Documents", "Details"],
    rows: [...meetingRows, ...generalDocuments],
    emptyMessage: "No board package documents have been added yet.",
  };
}

function renderSection(section: BoardCalendarReportSection) {
  return `<section>
    <h2>${escapeHtml(section.title)}</h2>
    <p class="section-description">${escapeHtml(section.description)}</p>
    ${
      section.rows.length
        ? `<table>
            <thead>
              <tr>${section.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${section.rows
                .map(
                  (row) =>
                    `<tr>${row
                      .map((cell, index) => renderCell(cell, section.columns[index]))
                      .join("")}</tr>`,
                )
                .join("")}
            </tbody>
          </table>`
        : `<div class="empty">${escapeHtml(section.emptyMessage)}</div>`
    }
  </section>`;
}

function renderCell(cell: string, column: string | undefined) {
  const safeCell = cell ? escapeHtml(cell) : "—";
  const className = column === "Notes" || column === "Details" || column === "Détails" ? " class=\"notes\"" : "";

  if (isLikelyUrl(cell)) {
    return `<td${className}><a href="${escapeHtml(cell)}">${safeCell}</a></td>`;
  }

  if (["Status", "Done", "Confirmed", "Statut", "Terminé", "Confirmé"].includes(column ?? "")) {
    return `<td${className}><span class="pill">${safeCell}</span></td>`;
  }

  return `<td${className}>${safeCell}</td>`;
}

function getRows(data: TemplateFormData, key: string): TemplateRecord[] {
  const value = data[key];
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).filter(
    (row): row is TemplateRecord =>
      Boolean(row) && typeof row === "object" && !Array.isArray(row),
  );
}

function getString(record: TemplateRecord, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(record: TemplateRecord, key: string) {
  return record[key] === true;
}

function getDisplayValue(value: TemplateValue | unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value.trim();
  return "";
}

function isLikelyUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function formatDateTime(value: Date, locale: Locale = "en-CA") {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function sanitizeCssColor(value: string | undefined, fallback: string) {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value)
    ? value
    : fallback;
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
