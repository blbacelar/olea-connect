import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const referenceDirectory = process.argv[2];
const outputPath = process.argv[3];
if (!referenceDirectory || !outputPath) {
  throw new Error("Usage: node scripts/qa-html-source-inventory.mjs <reference-directory> <output.csv>");
}

const references = [
  { module: "ED Review annual", file: "index_ED-CEO Annual Review (1).html", selector: "[data-k]", attribute: "data-k" },
  { module: "Board Calendar", file: "Board Calendar System.dc.html", selector: "[data-field]", attribute: "data-field" },
];
const browser = await chromium.launch({ headless: true });
const rows = [["module", "source_file", "source_key", "control", "source_label", "rendered_instances",
  "app_mapping", "save_path", "export_path", "verification"]];
const paths = (module) => {
  if (module.startsWith("ED Review annual")) return ["app/modules/ed-review/annual/actions.ts",
    "app/api/ed-review/annual/export/route.ts"];
  if (module.startsWith("ED Review")) return ["app/modules/ed-review/actions.ts",
    "app/modules/ed-review/survey/[token]/source-survey-form.tsx"];
  if (module.startsWith("Board Calendar")) return ["components/templates/board-calendar/use-board-calendar-workbench.ts",
    "app/modules/board-calendar/board-meeting-document-actions.ts"];
  if (module.startsWith("Strategic Planning")) return ["app/modules/strategic-planning/workbook/actions.ts",
    "app/api/strategic-planning/workbook/print/route.ts"];
  if (module.startsWith("Board Recruitment")) return ["app/modules/board-recruitment/actions.ts",
    "app/api/board-recruitment/export/route.ts"];
  if (module.startsWith("Board Evaluation")) return ["app/modules/board-evaluation/prototype-actions.ts",
    "app/modules/board-evaluation/prototype-actions.ts"];
  if (module.startsWith("Board Training")) return ["app/modules/board-training/actions.ts",
    "app/api/board-training/certificates/[id]/pdf/route.ts"];
  return ["", ""];
};
const add = (module, file, key, control, label, count, mapping, verification) => {
  rows.push([module, file, key, control, label, String(count), mapping, ...paths(module), verification]);
};
try {
  for (const reference of references) {
    const page = await browser.newPage();
    try {
      await page.goto(pathToFileURL(resolve(referenceDirectory, reference.file)).href);
      await page.locator(reference.selector).first().waitFor({ state: "attached", timeout: 20_000 });
      const controls = await page.locator(reference.selector).evaluateAll((elements, attribute) => elements.map((element) => {
        const own = element.getAttribute("aria-label") || element.closest("label")?.textContent || "";
        const parent = element.parentElement?.textContent || "";
        const label = (own.trim() || parent.trim()).replace(/\s+/g, " ").slice(0, 120);
        return { key: element.getAttribute(attribute) || "", control: element.tagName.toLowerCase(), label };
      }), reference.attribute);
      const unique = new Map();
      for (const control of controls) {
        const current = unique.get(control.key);
        unique.set(control.key, current ? { ...current, count: current.count + 1 } : { ...control, count: 1 });
      }
      for (const control of unique.values()) {
        add(reference.module, reference.file, control.key, control.control, control.label, control.count,
          reference.module === "ED Review annual" ? "lib/ed-review/annual-html-import.ts" : "Board Calendar template schema and editor",
          "source key inventoried; selected app interactions verified separately");
      }
      process.stdout.write(`${reference.module}: ${unique.size} distinct keys across ${controls.length} rendered controls\n`);
    } finally {
      await page.close();
    }
  }

  const finalCalendarFile = "Board Calendar System FINAL.html";
  const finalCalendar = await browser.newPage();
  await finalCalendar.goto(pathToFileURL(resolve(referenceDirectory, finalCalendarFile)).href);
  await finalCalendar.locator('a[data-view="settings"]').first().click();
  const settingsFields = await finalCalendar.locator("main input, #main input").evaluateAll((inputs) => inputs.map((input) => ({
    key: input.getAttribute("data-form") === "org"
      ? `org.${input.getAttribute("data-field")}`
      : input.hasAttribute("data-lti")
        ? `leadTime.${input.getAttribute("data-lti")}.${input.getAttribute("data-ltk")}`
        : `security.${input.getAttribute("data-sec")}`,
    type: input.getAttribute("type") || "text",
  })));
  const calendarLabels = {
    "org.name": "Organization name", "org.fiscalYear": "Fiscal year", "org.admin": "Administrator name",
    "security.requireAck": "Require acknowledgment before download",
    "security.logAccess": "Log every download",
    "security.watermark": "Watermark exported PDFs",
    "branding.logo": "Organization logo", "branding.primary": "Primary color", "branding.accent": "Accent color",
  };
  for (const field of settingsFields) {
    const label = calendarLabels[field.key] || (field.key.endsWith(".name") ? "Task template name" : "Days before meeting");
    add("Board Calendar FINAL", finalCalendarFile, field.key, field.type, label, 1,
      "components/templates/board-calendar/BoardCalendarSetupPanel.tsx",
      field.key.startsWith("security.")
        ? "source control mapped to persisted security policy; authenticated behavior test"
        : "source control and app field mapped; behavioral tests separate");
  }
  await finalCalendar.locator('a[data-view="branding"]').first().click();
  const brandingFields = await finalCalendar.locator("main input, #main input").evaluateAll((inputs) => inputs.map((input) => ({
    key: input.getAttribute("type") === "file" ? "branding.logo" : `branding.${input.getAttribute("data-brand")}`,
    type: input.getAttribute("type") || "text",
  })));
  for (const field of brandingFields) {
    add("Board Calendar FINAL", finalCalendarFile, field.key, field.type, calendarLabels[field.key], 1,
      "app/settings/brand/brand-settings-form.tsx",
      "source control mapped to persisted organization branding and PDF tests");
  }
  for (const modal of [
    { view: "meetings", action: "Add meeting", form: "meeting", mapping: "components/templates/board-calendar/EntryFormFields.tsx" },
    { view: "contacts", action: "Add member", form: "contact", mapping: "components/templates/board-calendar/BoardCalendarContactsPanel.tsx" },
    { view: "contacts", action: "Invite member", form: "invite", mapping: "app/team/team-workspace-sections.tsx" },
  ]) {
    await finalCalendar.locator(`a[data-view="${modal.view}"]`).first().click();
    await finalCalendar.getByRole("button", { name: new RegExp(modal.action) }).first().click();
    const modalFields = await finalCalendar.locator("input:visible, select:visible, textarea:visible")
      .evaluateAll((elements, form) => elements.map((element) => ({
        key: element.getAttribute("data-field"),
        type: element.getAttribute("type") || element.tagName.toLowerCase(),
        sourceForm: element.getAttribute("data-form"),
        placeholder: element.getAttribute("placeholder") || "",
      })).filter((field) => field.key && (form === "invite" ? !field.sourceForm : field.sourceForm === form)), modal.form);
    for (const field of modalFields) {
      add("Board Calendar FINAL", finalCalendarFile, `${modal.form}.${field.key}`, field.type,
        field.placeholder || field.key, 1, modal.mapping,
        "source modal control mapped to application editor; behavioral tests separate");
    }
    await finalCalendar.reload();
    await finalCalendar.locator("a[data-view]").first().waitFor();
  }
  await finalCalendar.close();
  process.stdout.write(`Board Calendar FINAL: ${settingsFields.length + brandingFields.length} rendered settings and branding controls, plus modal fields\n`);

  const surveys = JSON.parse(await readFile("lib/ed-review/survey-source-content.en.json", "utf8"));
  for (const [kind, file] of [["staff", "Staff Feedback Survey (1).html"],
    ["partner", "Partner Feedback Survey (1).html"]]) {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(resolve(referenceDirectory, file)).href);
    const sourceIds = await page.locator("input[name]").evaluateAll((inputs) => [...new Set(inputs
      .map((input) => input.getAttribute("name")).filter(Boolean))]);
    const questions = surveys[kind].sections.flatMap((section) => section.questions);
    for (const question of questions) {
      if (!sourceIds.includes(question.sourceId)) throw new Error(`Missing ${kind} source question ${question.sourceId}`);
      add(`ED Review ${kind} survey`, file, question.sourceId, "radio group", question.label, 5,
        `lib/ed-review/survey-source-content.en.json → ${kind}.${question.sourceId}`,
        "exact source ID, label and order checked by qa-html-data-parity");
    }
    const comments = await page.locator("textarea").count();
    if (comments !== surveys[kind].sections.length + 3) {
      throw new Error(`${kind} survey comment count differs from source HTML`);
    }
    for (const section of surveys[kind].sections) {
      add(`ED Review ${kind} survey`, file, section.commentId, "section comment", section.commentPrompt, 1,
        `lib/ed-review/survey-source-content.en.json → ${kind}.${section.sourceId}.comment`,
        "source textarea count and prompt metadata checked");
    }
    for (const [key, label] of Object.entries(surveys[kind].overallPrompts)) {
      add(`ED Review ${kind} survey`, file, `overall:${key}`, "overall comment", label, 1,
        `lib/ed-review/survey-source-content.en.json → ${kind}.overallPrompts.${key}`,
        "source textarea count checked; content mapping reviewed separately");
    }
    if (surveys[kind].context) {
      for (const [key, label] of Object.entries(surveys[kind].context)) {
        if (!key.endsWith("Label")) continue;
        add(`ED Review ${kind} survey`, file, `context:${key}`, "context field", label, 1,
          `lib/ed-review/survey-source-content.en.json → ${kind}.context.${key}`,
          "source context and app metadata inventoried");
      }
    }
    await page.close();
  }

  const strategicFile = "strategic-planning-workbook (1).html";
  const source = await readFile(resolve(referenceDirectory, strategicFile), "utf8");
  const closing = source.lastIndexOf("})();");
  if (closing < 0) throw new Error("Strategic source script closure not found");
  const strategic = await browser.newPage();
  await strategic.setContent(source.slice(0, closing)
    + "window.__qa={MODULES,SV_BANK};\n" + source.slice(closing));
  const strategicData = await strategic.evaluate("window.__qa");
  if (!strategicData) throw new Error("Strategic source data not available");
  for (const module of strategicData.MODULES) {
    for (const section of module.template) {
      for (const field of section.fields ?? []) {
        add("Strategic Planning", strategicFile, field.id, field.kind, field.label, 1,
          `lib/strategic-planning/workbook-content.json → ${module.id}.${field.id}`,
          "exact source definition checked by qa-html-data-parity");
      }
      if (section.checklist) {
        section.checklist.items.forEach((item, index) => add("Strategic Planning", strategicFile,
          `${section.checklist.id}:${index}`, "checklist", item, 1,
          `lib/strategic-planning/workbook-content.json → ${module.id}.${section.checklist.id}`,
          "exact source definition checked by qa-html-data-parity"));
      }
      if (section.table) {
        section.table.cols.forEach((column, index) => add("Strategic Planning", strategicFile,
          `${section.table.id}:${index}`, "table column", typeof column === "string" ? column : column.h ?? "",
          section.table.rows ?? 1,
          `lib/strategic-planning/workbook-content.json → ${module.id}.${section.table.id}`,
          "exact source definition checked by qa-html-data-parity"));
      }
    }
  }
  for (const question of strategicData.SV_BANK) {
    add("Strategic Planning stakeholder survey", strategicFile, question.id, question.t, question.q, 1,
      `lib/strategic-planning/stakeholder-survey-bank.json → ${question.id}`,
      "exact source definition checked by qa-html-data-parity");
  }
  await strategic.close();

  const trainingFile = "olea-board-training (1).html";
  const training = await browser.newPage();
  await training.goto(pathToFileURL(resolve(referenceDirectory, trainingFile)).href);
  const trainingData = await training.evaluate("DATA");
  for (const course of ["essentials", "refresher"]) {
    for (const language of ["en", "fr"]) {
      for (const lesson of trainingData[course][language].course.lessons) {
        add("Board Training", trainingFile, `${course}.${language}.${lesson.id}`, "lesson",
          lesson.title, lesson.blocks.length,
          `content/training/${course}.${language}.course.json → ${lesson.id}`,
          "exact source lesson content checked by qa-html-data-parity");
      }
      for (const question of trainingData[course][language].quiz.questions) {
        add("Board Training", trainingFile, `${course}.${language}.${question.id}`, "quiz question",
          question.prompt, question.options.length,
          `content/training/${course}.${language}.quiz.json → ${question.id}`,
          "exact source quiz content checked by qa-html-data-parity");
      }
    }
  }
  for (const language of ["en", "fr"]) {
    for (const session of trainingData.chair[language].sessions) {
      add("Board Training chair guide", trainingFile, `chair.${language}.${session.id}`, "session",
        session.title, session.questions.length,
        `content/training/chair.${language}.json → ${session.id}`,
        "exact source session content checked by qa-html-data-parity");
    }
  }
  await training.close();

  const recruitmentFile = "Board Recruitment Toolkit (standalone) FINAL.html";
  const recruitmentSource = await readFile(resolve(referenceDirectory, recruitmentFile), "utf8");
  for (const category of ["prof", "gov", "comm", "contrib"]) {
    const match = recruitmentSource.match(new RegExp(`mk\\('${category}', \\[(.*?)\\]\\)`));
    if (!match) throw new Error(`Board Recruitment source category ${category} not found`);
    for (const [index, skill] of [...match[1].matchAll(/'([^']*)'/g)].map((item) => item[1]).entries()) {
      add("Board Recruitment", recruitmentFile, `${category}:${index}`, "skill", skill, 1,
        `lib/board-recruitment/domain.ts → ${category}:${index}`,
        "exact source skill label and order checked by qa-html-data-parity");
    }
  }

  const require = createRequire(import.meta.url);
  const evaluation = require("../lib/board-evaluation/prototype-content.ts");
  const evaluationDirectory = resolve(referenceDirectory, "Board Toolkit Deliverables");
  for (const [module, file, questions] of [
    ["Board Evaluation question bank", "1 · Administrator Guide & Question Bank.html", [
      ...evaluation.questionBankCategories.flatMap((category) => category.qs.map((question) => question[1])),
      ...evaluation.questionBankOpen.map((question) => question[1]),
      ...evaluation.questionBankMeeting.flatMap((category) => category.qs.map((question) => question[1])),
      ...evaluation.questionBankMeetingOpen.map((question) => question[1]),
    ]],
    ["Board Evaluation annual survey", "2 · Annual Board Self-Evaluation Survey.html",
      evaluation.annualSurveySections.flatMap((section) => section.qs)],
    ["Board Evaluation post-meeting survey", "3 · Post-Meeting Evaluation Form.html",
      evaluation.meetingSurveyGroups.flatMap((group) => group.qs)],
  ]) {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(resolve(evaluationDirectory, file)).href);
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ").replace(/[’‘]/g, "'");
    questions.forEach((question, index) => {
      if (!text.includes(question.replace(/\s+/g, " ").replace(/[’‘]/g, "'"))) {
        throw new Error(`${module} question ${index + 1} not found in rendered source`);
      }
      add(module, file, String(index + 1), "question", question, 1,
        "lib/board-evaluation/prototype-content.ts",
        "source text and application content matched by qa-html-data-parity");
    });
    await page.close();
  }
  const summaryFile = "4 · Summary of Results & Action Plan.html";
  const summary = await browser.newPage();
  await summary.goto(pathToFileURL(resolve(evaluationDirectory, summaryFile)).href);
  const summaryControls = await summary.locator("input,select,textarea").evaluateAll((elements) => elements.map((element) => ({
    type: element.tagName.toLowerCase(),
    label: (element.getAttribute("aria-label") || element.getAttribute("placeholder")
      || element.closest("label")?.textContent || element.parentElement?.textContent || "")
      .trim().replace(/\s+/g, " ").slice(0, 120),
  })));
  summaryControls.forEach((control, index) => add("Board Evaluation summary", summaryFile,
    `control:${index + 1}`, control.type, control.label, 1,
    "app/modules/board-evaluation/prototype-workspace.tsx → SummaryAndActionPlan",
    "source control inventoried; repeated app controls checked by board-evaluation-html-audit E2E"));
  await summary.close();
} finally {
  await browser.close();
}
const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n") + "\n";
await writeFile(outputPath, csv);
