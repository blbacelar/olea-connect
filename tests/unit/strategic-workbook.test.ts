import { describe, expect, it } from "vitest";

import { parseWorkbookValues, workbookDefaultValues, workbookModules } from "@/lib/strategic-planning/workbook";
import { parseWorkbookActions } from "@/lib/strategic-planning/action-tracker";
import { stakeholderAudiences, stakeholderQuestionBank } from "@/lib/strategic-planning/stakeholder-survey";
import { buildStrategicPlan } from "@/lib/strategic-planning/workbook-plan";
import { convertLegacyStrategicWorkbook } from "@/lib/strategic-planning/legacy-import";
import { strategicWorkbookPrintSections } from "@/lib/strategic-planning/workbook-print";
import { mergeStakeholderSummary } from "@/lib/strategic-planning/stakeholder-results";
import { buildStakeholderSurveyDocument } from "@/lib/strategic-planning/survey-document";
import { buildStrategicCalendarDates, strategicDatesToCalendarEvents } from "@/lib/strategic-planning/calendar-dates";
import { buildBoardSnapshot } from "@/lib/strategic-planning/board-snapshot";
import { strategicBoardSections } from "@/lib/reports/module-sections";
import { strategicWorkbookFrenchTranslations } from "@/lib/i18n/strategic-workbook-fr";
import { stakeholderSurveyCloseDate, stakeholderSurveyHasClosed } from "@/lib/strategic-planning/survey-deadline";

describe("final strategic workbook content", () => {
  it("keeps Start here and the nine modules in source order", () => {
    expect(workbookModules.map((module) => module.id)).toEqual(
      Array.from({ length: 10 }, (_, index) => `m${index}`),
    );
    expect(workbookModules[0].title).toBe("Start here: set up your workbook");
    expect(workbookModules[9].title).toBe("Implementing and reviewing");
    expect(workbookDefaultValues()["set.size"]).toBe("mid");
    const sections = workbookModules.flatMap((module) => module.template);
    expect(sections).toHaveLength(46);
    expect(sections.flatMap((section) => section.fields ?? [])).toHaveLength(69);
    expect(sections.filter((section) => section.table)).toHaveLength(17);
  });

  it("has an exact French label for every generated module navigation item", () => {
    const translations = new Map(strategicWorkbookFrenchTranslations);
    expect(workbookModules.every((module) => translations.has(module.short))).toBe(true);
  });

  it("keeps survey reply-by and actual close dates independent", () => {
    expect(stakeholderSurveyCloseDate({ deadline: "2027-02-01", closesAt: "2027-03-01" }))
      .toBe("2027-03-01");
    expect(stakeholderSurveyHasClosed({ deadline: "2027-02-01", closesAt: "2027-03-01" }, "2027-02-15"))
      .toBe(false);
    expect(stakeholderSurveyHasClosed({ deadline: "2027-02-01" }, "2027-02-15"))
      .toBe(true);
  });

  it("validates dates, choices, checklists and table values before persistence", () => {
    expect(parseWorkbookValues({
      "set.size": "small",
      "set.horizon": "5",
      "m1.ready:0": "yes",
      "m1.dates:0:1": "2027-01-04",
      "m5.pri:0:8": "400 participants",
      "m4.score:0:1": "5",
    })).toHaveProperty("set.horizon", "5");
    expect(() => parseWorkbookValues({ "set.horizon": "9" })).toThrow();
    expect(() => parseWorkbookValues({ "m1.dates:0:1": "2027-99-99" })).toThrow();
    expect(() => parseWorkbookValues({ "m1.ready:0": "maybe" })).toThrow();
    expect(() => parseWorkbookValues({ "m4.score:0:1": "-5" })).toThrow();
    expect(() => parseWorkbookValues({ "m4.score:0:1": "6" })).toThrow(/1 to 5/);
    expect(() => parseWorkbookValues({ "m4.score:0:6": "10" })).toThrow();
    expect(() => parseWorkbookValues({ "private.compensation": "secret" })).toThrow();
    expect(parseWorkbookValues({ "m6.finlead": "Treasurer" })["m6.finlead"]).toBe("Treasurer");
    const financeReview = parseWorkbookValues({ "m6.fin.y1.inbudget": "Partly", "m6.fin.y1.date": "2027-03-15" });
    expect(financeReview["m6.fin.y1.inbudget"]).toBe("Partly");
    expect(() => parseWorkbookValues({ "m6.fin.y1.inbudget": "Unclear" })).toThrow();
    expect(parseWorkbookValues({ "org.budget": "$500K" })["org.budget"]).toBe("$500K");
    expect(() => parseWorkbookValues({ "org.budget": "unknown" })).toThrow(/CAD amount/);
  });

  it("keeps the HTML budget-line field on saved actions", () => {
    const actions = parseWorkbookActions([{
      id: "17871e2a-dc7e-40bd-b1c4-69f4d5736cc9", year: 1, goal: "Access",
      keyPriority: "Reach more communities", action: "Open a new site", owner: "Alex",
      dueQuarter: "y1q2", budgetCents: 125000, fundingSource: "Operating budget",
      fundingStatus: "Secured", budgetLine: "5200 Programs", carriedFromYear: null,
      originId: null, updates: [],
    }]);
    expect(actions[0].budgetLine).toBe("5200 Programs");
    expect(() => parseWorkbookActions([{ ...actions[0], budgetLine: "a".repeat(161) }])).toThrow();
  });

  it("keeps every audience and question from the source stakeholder survey", () => {
    expect(stakeholderAudiences.map((audience) => audience.v)).toEqual([
      "board", "staff", "volunteers", "clients", "partners", "funders", "community",
    ]);
    expect(stakeholderQuestionBank).toHaveLength(30);
  });

  it("carries linked goals, priorities, actions, and budget lines into the generated plan", () => {
    const actions = parseWorkbookActions([{
      id: "17871e2a-dc7e-40bd-b1c4-69f4d5736cc9", year: 1, goal: "Access",
      keyPriority: "Reach more communities", action: "Open a new site", owner: "Alex",
      dueQuarter: "y1q2", budgetCents: 125000, fundingSource: "Operating budget",
      fundingStatus: "Secured", budgetLine: "5200 Programs", carriedFromYear: null,
      originId: null, updates: [],
    }]);
    const plan = buildStrategicPlan({
      "org.name": "Community Outreach", "set.horizon": "3",
      "m4.goals:0:0": "Access", "m5.pri:0:0": "Access",
      "m5.pri:0:1": "Reach more communities",
    }, actions);
    expect(plan.organization).toBe("Community Outreach");
    expect(plan.goals[0].priorities).toEqual(["Reach more communities"]);
    const actionBlock = plan.sections.find((section) => section.title === "Actions by year")?.blocks[0];
    expect(actionBlock?.kind).toBe("table");
    if (actionBlock?.kind === "table") {
      expect(actionBlock.rows[0]).toContain("5200 Programs");
      expect(actionBlock.rows[0]).toContain("Secured");
    }
  });

  it("imports the source HTML flat JSON without losing checklist notes, SWOT, tables, actions, or source-only keys", () => {
    const result = convertLegacyStrategicWorkbook({
      "org.name": "Outreach Centre", "set.horizon": "3", "start.use.m2": "true",
      "m1.ready.0.ans": "yes", "m1.ready.0.note": "Board approved",
      "m2.swot.s": "Strong volunteers", "m4.goals.0.strategic-goal": "Access",
      "m5.pri.0.goal": "Access", "m5.pri.0.key-priority": "Serve rural members",
      "m6.actions.0.action": "Launch a mobile clinic", "m6.actions.0.key-priority": "Serve rural members",
      "m6.actions.0.cost": "$1,250", "m6.actions.0.due": "y1q2",
      "m6.actions.0.funding-status": "Secured", "m6.actions.0.budget-line": "5200 Programs",
      "trk.a.0.y1q2.s": "green", "trk.a.0.y1q2.spent": "$500",
      "m2.sv.online.id": "source survey reference",
    });
    expect(result.values["m1.ready:0:note"]).toBe("Board approved");
    expect(result.values["m2.swot:s"]).toBe("Strong volunteers");
    expect(result.values["m4.goals:0:0"]).toBe("Access");
    expect(result.values["start.use"]).toBe("m2");
    expect(result.actions[0]).toMatchObject({ goal: "Access", budgetCents: 125000,
      budgetLine: "5200 Programs", updates: [{ quarter: "y1q2", status: "green", spentCents: 50000 }] });
    expect(result.values["legacy:m2.sv.online.id"]).toBe("source survey reference");
    expect(result.skippedKeys).toContain("m2.sv.online.id");
  });

  it("prints the current source module or the complete selected workbook with entered fields", () => {
    const values = { "set.size": "mid", "set.horizon": "3", "start.use": "m1|m2",
      "m1.ready:0": "yes", "m1.ready:0:note": "Board reviewed",
      "m2.swot:s": "Strong volunteers" };
    const current = strategicWorkbookPrintSections({ values, actions: [], moduleId: "m1" });
    expect(current.some((section) => section.blocks.some((block) => block.kind === "table" &&
      block.rows.some((row) => row.includes("Board reviewed"))))).toBe(true);
    const all = strategicWorkbookPrintSections({ values, actions: [] });
    expect(all.some((section) => section.title.includes("2E. SWOT analysis") &&
      section.blocks.some((block) => block.kind === "text" && block.value === "Strong volunteers"))).toBe(true);
    expect(all.some((section) => section.title.includes("Strategic goals"))).toBe(false);
  });

  it("replaces an older survey summary while retaining independent Module 2D notes", () => {
    const current = "Staff interviews\n\nFrom our stakeholder survey (5 responses)\nOld result\n\nCommunity session";
    expect(mergeStakeholderSummary(current, "From our stakeholder survey (9 responses)\nNew result"))
      .toBe("Staff interviews\n\nFrom our stakeholder survey (9 responses)\nNew result\n\nCommunity session");
  });

  it("exports a branded French survey with translated source questions and options", () => {
    const html = buildStakeholderSurveyDocument({ locale: "fr-CA", horizon: 3,
      brand: { organizationName: "Centre communautaire", logoInitials: "CC",
        primaryColor: "#123456", secondaryColor: "#abcdef" },
      title: "Sondage 2027", audience: "board", onlineUrl: "https://example.org/survey",
      questions: [{ id: "understand", theme: "today", type: "agree",
        text: "I understand what Centre communautaire does and who it serves.",
        options: [], defaultOn: true }],
    });
    expect(html).toContain('<html lang="fr-CA">');
    expect(html).toContain("Je comprends ce que fait Centre communautaire");
    expect(html).toContain("Tout à fait d&#39;accord");
    expect(html).toContain("Vous préférez répondre en ligne?");
  });

  it("matches the attached HTML's year totals for the same action and spending fixture", () => {
    const actions = parseWorkbookActions([
      { id: "17871e2a-dc7e-40bd-b1c4-69f4d5736cc9", year: 1, goal: "Access", keyPriority: "Rural",
        action: "Mobile clinic", owner: "Alex", dueQuarter: "y1q2", budgetCents: 125000,
        fundingSource: "Operating budget", fundingStatus: "Secured", carriedFromYear: null, originId: null,
        updates: [{ quarter: "y1q1", status: "green", note: "", spentCents: 20000 },
          { quarter: "y1q2", status: "green", note: "", spentCents: 30000 }] },
      { id: "27871e2a-dc7e-40bd-b1c4-69f4d5736cc9", year: 1, goal: "Access", keyPriority: "Partners",
        action: "Community sessions", owner: "Sam", dueQuarter: "y1q3", budgetCents: 100000,
        fundingSource: "Donations and fundraising", fundingStatus: "Pending", carriedFromYear: null, originId: null,
        updates: [{ quarter: "y1q1", status: "yellow", note: "", spentCents: 10000 }] },
      { id: "37871e2a-dc7e-40bd-b1c4-69f4d5736cc9", year: 2, goal: "Capacity", keyPriority: "Training",
        action: "Train staff", owner: "Jo", dueQuarter: "y2q2", budgetCents: 70000,
        fundingSource: "Grant", fundingStatus: "To be raised", carriedFromYear: null, originId: null, updates: [] },
    ]);
    const budget = buildStrategicPlan({ "set.horizon": "3" }, actions).sections
      .find((section) => section.title === "Plan budget")!.blocks[0];
    expect(budget.kind).toBe("table");
    if (budget.kind === "table") {
      expect(budget.rows[0]).toEqual(["1", "$2,250.00", "$1,250.00", "$1,000.00", "$0.00"]);
      expect(budget.rows[1]).toEqual(["2", "$700.00", "$0.00", "$0.00", "$700.00"]);
    }
    expect(actions.filter((action) => action.year === 1).flatMap((action) => action.updates)
      .reduce((sum, update) => sum + update.spentCents, 0)).toBe(60000);
  });

  it("projects saved quarter milestones into read-only Board Calendar events", () => {
    const values = parseWorkbookValues({ "set.horizon": "3", "start.plan": "2027-01-01" });
    const dates = buildStrategicCalendarDates(values);
    const events = strategicDatesToCalendarEvents(dates);
    expect(events.find((event) => event.id === "strategic-quarter-end-y1q1"))
      .toMatchObject({ dateKey: "2027-03-31", source: "strategic", category: "Strategic Planning" });
    expect(events.some((event) => event.id === "strategic-quarter-end-y1q1")).toBe(true);
    expect(strategicDatesToCalendarEvents(dates, true).find((event) => event.id === "strategic-quarter-end-y1q1"))
      .toMatchObject({ title: expect.stringContaining("fin de l'année 1, T1"), category: "Planification stratégique" });
    expect(strategicDatesToCalendarEvents(buildStrategicCalendarDates({})))
      .not.toContainEqual(expect.objectContaining({ id: "strategic-quarter-end-y1q1" }));
  });

  it("localizes fixed Board and workbook report data while preserving entered text", () => {
    const snapshot = buildBoardSnapshot({ "org.name": "Maison de quartier" }, [], {
      quarter: "y1q1", executiveSummary: "Keep this English sentence.", decisions: "Approve outreach.",
    });
    const sections = strategicBoardSections(snapshot, "fr-CA");
    expect(sections[0].title).toBe("Progrès en bref");
    expect(sections[0].blocks).toContainEqual(expect.objectContaining({
      kind: "text", label: "Résumé", value: "Keep this English sentence.",
    }));
    expect(sections.find((section) => section.title === "Budget")?.blocks[0])
      .toMatchObject({ kind: "table", headers: ["Budget", "Dépensé", "Confirmé", "À trouver"] });
    const printed = strategicWorkbookPrintSections({ values: {
      "set.horizon": "3", "start.use": "m9", "m9.cal:0:0": "Monthly",
    }, actions: [], moduleId: "m9", locale: "fr-CA" });
    expect(JSON.stringify(printed)).toContain("Mensuellement");
    expect(JSON.stringify(printed)).toContain("Le personnel vérifie l'avancement");
  });
});
