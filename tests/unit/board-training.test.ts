import { describe, expect, it } from "vitest";

import chairEn from "@/content/training/chair.en.json";
import chairFr from "@/content/training/chair.fr.json";
import essentialsEn from "@/content/training/essentials.en.course.json";
import essentialsFr from "@/content/training/essentials.fr.course.json";
import essentialsQuizEn from "@/content/training/essentials.en.quiz.json";
import essentialsQuizFr from "@/content/training/essentials.fr.quiz.json";
import refresherEn from "@/content/training/refresher.en.course.json";
import refresherFr from "@/content/training/refresher.fr.course.json";
import refresherQuizEn from "@/content/training/refresher.en.quiz.json";
import refresherQuizFr from "@/content/training/refresher.fr.quiz.json";
import { aggregateTrainingReport, gradeTrainingAssessment, trainingCertificateExpiry } from "@/lib/board-training/domain";
import { trainingCsvCell } from "@/lib/board-training/csv";
import { trainingErrorCopy } from "@/lib/board-training/error-copy";

function contentShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(contentShape);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, contentShape(item)]));
  }
  return typeof value;
}

describe("board training content", () => {
  it.each([
    [essentialsEn, essentialsFr], [essentialsQuizEn, essentialsQuizFr],
    [refresherEn, refresherFr], [refresherQuizEn, refresherQuizFr], [chairEn, chairFr],
  ])("keeps every French content field aligned with English", (english, french) => {
    expect(contentShape(french)).toEqual(contentShape(english));
  });

  it("shows French validation guidance without exposing English server errors", () => {
    expect(trainingErrorCopy("Choose a valid PDF document.", "fr")).toBe("Choisissez un document PDF valide.");
    expect(trainingErrorCopy("Choose 1 to 3 commitments, up to 300 characters each.", "fr")).toContain("1 à 3 engagements");
    expect(trainingErrorCopy("Unexpected database response", "fr")).toBe("Impossible d’enregistrer. Vérifiez les champs et réessayez.");
    expect(trainingErrorCopy("Choose a valid PDF document.", "en")).toBe("Choose a valid PDF document.");
  });

  it.each([
    [essentialsEn, essentialsFr, essentialsQuizEn, essentialsQuizFr, 8, 15],
    [refresherEn, refresherFr, refresherQuizEn, refresherQuizFr, 3, 6],
  ])("keeps English and French lessons and answer keys aligned", (english, french, quizEn, quizFr, lessons, questions) => {
    expect(english.lessons).toHaveLength(lessons);
    expect(french.lessons.map((item) => item.id)).toEqual(english.lessons.map((item) => item.id));
    expect(quizEn.questions).toHaveLength(questions);
    expect(quizFr.questions.map((item) => [item.id, item.answer])).toEqual(quizEn.questions.map((item) => [item.id, item.answer]));
    expect(quizEn.questions.every((item) => item.options.some((option) => option.id === item.answer))).toBe(true);
    expect(quizEn.passMarkPercent).toBe(80);
  });

  it("includes all Canadian jurisdictions and aligned Chair sessions", () => {
    expect(essentialsEn.jurisdictions).toHaveLength(15);
    expect(essentialsFr.jurisdictions.map((item) => item.id)).toEqual(essentialsEn.jurisdictions.map((item) => item.id));
    expect(chairEn.sessions.map((item) => item.id)).toEqual(chairFr.sessions.map((item) => item.id));
    expect(chairEn.sessions).toHaveLength(6);
  });
});

describe("server assessment and reporting rules", () => {
  const questions = essentialsQuizEn.questions;
  const correct = Object.fromEntries(questions.map((question) => [question.id, question.answer]));

  it("grades the actual 15-question course at the 80 percent threshold", () => {
    expect(gradeTrainingAssessment(questions, correct, 80).passed).toBe(true);
    const threeWrong = { ...correct };
    questions.slice(0, 3).forEach((question) => {
      threeWrong[question.id] = question.options.find((option) => option.id !== question.answer)!.id;
    });
    expect(gradeTrainingAssessment(questions, threeWrong, 80)).toMatchObject({ score: 12, total: 15, passed: true });
    const fourWrong = { ...threeWrong };
    fourWrong[questions[3].id] = questions[3].options.find((option) => option.id !== questions[3].answer)!.id;
    expect(gradeTrainingAssessment(questions, fourWrong, 80)).toMatchObject({ score: 11, passed: false });
  });

  it("rejects incomplete, extra, and invalid answers", () => {
    expect(() => gradeTrainingAssessment(questions, {}, 80)).toThrow(/every question/i);
    expect(() => gradeTrainingAssessment(questions, { ...correct, extra: "a" }, 80)).toThrow(/every question/i);
    expect(() => gradeTrainingAssessment(questions, { ...correct, [questions[0].id]: "not-an-option" }, 80)).toThrow(/every question/i);
  });

  it("hides small reports and individual free-text commitments", () => {
    const row = { confidenceBefore: { l1: 2 }, confidenceAfter: { l1: 4 }, topicScores: { l1: { correct: 1, total: 1 } }, actionPlan: ["Review bylaws", "Private personal plan"], followUp: { first: "done" } };
    expect(aggregateTrainingReport([row, row], ["l1"], ["Review bylaws"])).toBeNull();
    const report = aggregateTrainingReport([row, row, row], ["l1"], ["Review bylaws"]);
    expect(report?.topics[0]).toMatchObject({ before: 2, after: 4, assessmentPercent: 100 });
    expect(report?.commitments).toEqual([["Review bylaws", 3]]);
    expect(JSON.stringify(report)).not.toContain("Private personal plan");
  });

  it("counts people instead of duplicate actions and follow-up answers", () => {
    const row = { confidenceBefore: {}, confidenceAfter: {}, topicScores: {}, actionPlan: ["Review bylaws", "Review bylaws", "Review bylaws"], followUp: { a: "done", b: "done", c: "done" } };
    const report = aggregateTrainingReport([row, { ...row, actionPlan: [], followUp: {} }, { ...row, actionPlan: [], followUp: {} }], [], ["Review bylaws"]);
    expect(report?.commitments).toEqual([]);
    expect(report?.followUp.done).toBeNull();
  });

  it("neutralizes spreadsheet formulas in roster exports", () => {
    expect(trainingCsvCell('=HYPERLINK("bad")')).toBe('"\'=HYPERLINK(""bad"")"');
    expect(trainingCsvCell("  @SUM(1,2)")).toBe('"\'  @SUM(1,2)"');
  });

  it("sets two-year and one-year certificate expiries", () => {
    const issued = new Date("2026-10-14T12:00:00Z");
    expect(trainingCertificateExpiry(issued, 24).toISOString()).toBe("2028-10-14T12:00:00.000Z");
    expect(trainingCertificateExpiry(issued, 12).toISOString()).toBe("2027-10-14T12:00:00.000Z");
    expect(trainingCertificateExpiry(new Date("2024-02-29T12:00:00Z"), 12).toISOString()).toBe("2025-02-28T12:00:00.000Z");
  });
});
