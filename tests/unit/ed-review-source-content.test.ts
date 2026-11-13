import { describe, expect, it } from "vitest";

import { getSourceSurveyDefinition } from "@/lib/ed-review/survey-source-content";

describe("ED/CEO standalone survey content", () => {
  it("preserves the source order and IDs while using stable database IDs", () => {
    const staff = getSourceSurveyDefinition("staff", "en-CA");
    const partner = getSourceSurveyDefinition("partner", "en-CA");

    expect(staff.sections.map((section) => section.sourceId)).toEqual([
      "S1", "S2", "S3", "S4", "S5", "S6",
    ]);
    expect(staff.sections.flatMap((section) => section.questions)).toHaveLength(18);
    expect(partner.sections.map((section) => section.sourceId)).toEqual([
      "A", "B", "C", "D",
    ]);
    expect(partner.sections.flatMap((section) => section.questions)).toHaveLength(15);
    expect(partner.sections[0].questions[0]).toMatchObject({
      id: "A1",
      sourceId: "A0",
      label: "Has built a genuine, productive relationship with my organisation.",
    });
    expect(partner.sections[2].questions[3]).toMatchObject({
      id: "C4",
      sourceId: "C3",
      label: "My organisation or community is valued as a genuine partner.",
    });
    expect(partner.sections[3].questions[2]).toMatchObject({
      id: "D3",
      sourceId: "D2",
    });
  });

  it("provides complete French text for every source question and prompt", () => {
    for (const kind of ["staff", "partner"] as const) {
      const english = getSourceSurveyDefinition(kind, "en-CA");
      const french = getSourceSurveyDefinition(kind, "fr-CA");
      expect(french.sections.map((section) => section.sourceId)).toEqual(
        english.sections.map((section) => section.sourceId),
      );
      expect(french.ratingScale.map((rating) => rating.value)).toEqual([1, 2, 3, 4, 5]);
      expect(french.overallPrompts.greatestStrength).not.toBe(english.overallPrompts.greatestStrength);
      expect(french.commentPlaceholder).not.toBe(english.commentPlaceholder);
      expect(french.closingTitle).not.toBe(english.closingTitle);
      expect(french.footerNotice).not.toBe(english.footerNotice);
      for (const [index, section] of french.sections.entries()) {
        expect(section.label).not.toBe(english.sections[index].label);
        expect(section.description.length).toBeGreaterThan(20);
        expect(section.commentPrompt.length).toBeGreaterThan(20);
        expect(section.questions.map((question) => question.sourceId)).toEqual(
          english.sections[index].questions.map((question) => question.sourceId),
        );
        for (const question of section.questions) {
          expect(question.label.length).toBeGreaterThan(10);
          expect(question.subtext.length).toBeGreaterThan(5);
        }
      }
    }
  });
});
