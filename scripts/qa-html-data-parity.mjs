import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const referenceDirectory = process.argv[2];
const outputPath = process.argv[3];
if (!referenceDirectory || !outputPath) {
  throw new Error("Usage: node scripts/qa-html-data-parity.mjs <reference-directory> <output.json>");
}

const readJson = async (path) => JSON.parse(await readFile(resolve(path), "utf8"));
const sourcePath = (file) => resolve(referenceDirectory, file);
const equalContent = (source, application, label) => {
  assert.equal(JSON.stringify(application), JSON.stringify(source), `${label} differs from the supplied HTML`);
};
const countLeaves = (value) => {
  if (Array.isArray(value)) return value.reduce((count, item) => count + countLeaves(item), 0);
  if (value && typeof value === "object") {
    return Object.values(value).reduce((count, item) => count + countLeaves(item), 0);
  }
  return 1;
};

const evidence = { sourceDirectory: referenceDirectory, checked: [] };
const browser = await chromium.launch({ headless: true });
const temporaryDirectory = await mkdtemp(join(tmpdir(), "olea-html-parity-"));
try {
  const training = await browser.newPage();
  await training.goto(pathToFileURL(sourcePath("olea-board-training (1).html")).href);
  const trainingData = await training.evaluate("DATA");
  for (const course of ["essentials", "refresher"]) {
    for (const language of ["en", "fr"]) {
      for (const kind of ["course", "quiz"]) {
        const label = `Board Training ${course}.${language}.${kind}`;
        const source = trainingData[course][language][kind];
        equalContent(source, await readJson(`content/training/${course}.${language}.${kind}.json`), label);
        evidence.checked.push({ label, leaves: countLeaves(source), result: "exact JSON equality" });
      }
    }
  }
  for (const language of ["en", "fr"]) {
    const label = `Board Training chair.${language}`;
    const source = trainingData.chair[language];
    equalContent(source, await readJson(`content/training/chair.${language}.json`), label);
    evidence.checked.push({ label, leaves: countLeaves(source), result: "exact JSON equality" });
  }
  await training.close();

  const strategicSource = await readFile(sourcePath("strategic-planning-workbook (1).html"), "utf8");
  const endOfScript = strategicSource.lastIndexOf("})();");
  if (endOfScript < 0) throw new Error("Strategic Planning source script closure not found");
  const instrumented = strategicSource.slice(0, endOfScript)
    + "window.__qa={MODULES,SV_BANK,SV_AUD,SV_THEMES};\n"
    + strategicSource.slice(endOfScript);
  const temporaryHtml = join(temporaryDirectory, "strategic.html");
  await writeFile(temporaryHtml, instrumented);
  const strategic = await browser.newPage();
  await strategic.goto(pathToFileURL(temporaryHtml).href);
  const strategicData = await strategic.evaluate("window.__qa");
  if (!strategicData) throw new Error("Strategic Planning source data not available");
  const workbook = await readJson("lib/strategic-planning/workbook-content.json");
  const surveyBank = await readJson("lib/strategic-planning/stakeholder-survey-bank.json");
  for (const [label, source, application] of [
    ["Strategic Planning modules", strategicData.MODULES, workbook.modules],
    ["Strategic Planning survey questions", strategicData.SV_BANK, surveyBank.questions],
    ["Strategic Planning survey audiences", strategicData.SV_AUD, surveyBank.audiences],
    ["Strategic Planning survey themes", strategicData.SV_THEMES, surveyBank.themes],
  ]) {
    equalContent(source, application, label);
    evidence.checked.push({ label, entries: source.length, leaves: countLeaves(source), result: "exact JSON equality" });
  }
  await strategic.close();

  const sourceSurveys = await readJson("lib/ed-review/survey-source-content.en.json");
  for (const [kind, file] of [
    ["staff", "Staff Feedback Survey (1).html"],
    ["partner", "Partner Feedback Survey (1).html"],
  ]) {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(sourcePath(file)).href);
    const sourceHtml = await readFile(sourcePath(file), "utf8");
    const sourceText = (await page.locator("body").innerText()).replace(/\s+/g, " ").replace(/[’‘]/g, "'");
    const sourceQuestions = await page.locator("input[name]").evaluateAll((inputs) => {
      const questions = new Map();
      for (const input of inputs) {
        const id = input.getAttribute("name");
        const label = input.parentElement?.parentElement?.parentElement?.innerText
          .split("\n")[0]?.trim();
        if (id && label) questions.set(id, label);
      }
      return [...questions].map(([id, label]) => ({ id, label }));
    });
    const appQuestions = sourceSurveys[kind].sections.flatMap((section) => section.questions
      .map((question) => ({ id: question.sourceId, label: question.label })));
    assert.deepEqual(appQuestions, sourceQuestions, `${kind} survey questions or order differ from source HTML`);
    const visibleText = sourceSurveys[kind].sections.flatMap((section) => [
      section.label, section.description,
      ...section.questions.flatMap((question) => [question.label, question.subtext]),
    ]);
    for (const value of visibleText) {
      assert.ok(sourceText.includes(value.replace(/\s+/g, " ").replace(/[’‘]/g, "'")),
        `${kind} survey visible content missing from source HTML: ${value}`);
    }
    const metadata = [
      ...sourceSurveys[kind].sections.map((section) => section.commentPrompt),
      ...Object.values(sourceSurveys[kind].overallPrompts),
      ...Object.entries(sourceSurveys[kind].context ?? {})
        .filter(([key]) => key.endsWith("Label")).map(([, value]) => value),
    ];
    for (const value of metadata) {
      assert.ok(sourceHtml.includes(value), `${kind} survey prompt missing from source HTML: ${value}`);
    }
    evidence.checked.push({ label: `ED Review ${kind} survey`, entries: sourceQuestions.length,
      leaves: sourceQuestions.length * 2 + visibleText.length + metadata.length,
      result: "exact rendered question ID, label and order, visible text and prompt metadata equality" });
    await page.close();
  }

  const recruitmentSource = await readFile(sourcePath("Board Recruitment Toolkit (standalone) FINAL.html"), "utf8");
  const require = createRequire(import.meta.url);
  const { recruitmentCategories } = require("../lib/board-recruitment/domain.ts");
  for (const [index, category] of ["prof", "gov", "comm", "contrib"].entries()) {
    const match = recruitmentSource.match(new RegExp(`mk\\('${category}', \\[(.*?)\\]\\)`));
    if (!match) throw new Error(`Board Recruitment source category ${category} not found`);
    const sourceSkills = [...match[1].matchAll(/'([^']*)'/g)].map((item) => item[1]);
    assert.deepEqual(recruitmentCategories[index].skills, sourceSkills,
      `Board Recruitment ${category} skills or order differ from source HTML`);
    evidence.checked.push({ label: `Board Recruitment ${category} skills`, entries: sourceSkills.length,
      leaves: sourceSkills.length, result: "exact source skill label and order equality" });
  }

  const evaluation = require("../lib/board-evaluation/prototype-content.ts");
  const evaluationDirectory = resolve(referenceDirectory, "Board Toolkit Deliverables");
  const evaluationSets = [
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
  ];
  for (const [label, file, questions] of evaluationSets) {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(join(evaluationDirectory, file)).href);
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ").replace(/[’‘]/g, "'");
    for (const [index, question] of questions.entries()) {
      assert.ok(body.includes(question.replace(/\s+/g, " ").replace(/[’‘]/g, "'")),
        `${label} question ${index + 1} absent from source HTML: ${question}`);
    }
    evidence.checked.push({ label, entries: questions.length, leaves: questions.length,
      result: "every application question found verbatim in rendered source HTML" });
    await page.close();
  }
} finally {
  await browser.close();
  await rm(temporaryDirectory, { recursive: true, force: true });
}
evidence.totalLeaves = evidence.checked.reduce((count, entry) => count + entry.leaves, 0);
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
process.stdout.write(`Checked ${evidence.checked.length} source datasets and ${evidence.totalLeaves} leaf values.\n`);
