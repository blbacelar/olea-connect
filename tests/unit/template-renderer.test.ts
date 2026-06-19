import { describe, expect, it } from "vitest";

import { getValue, setValue } from "@/lib/template-renderer/schema";
import {
  calculateCompletionPercent,
  validateTemplateData,
} from "@/lib/template-renderer/validation";
import type { TemplateFieldSchema } from "@/lib/template-renderer/types";

const schema: TemplateFieldSchema = {
  version: 1,
  header_fields: [
    { id: "meeting_title", type: "text", label: "Meeting title", required: true },
    { id: "facilitator_email", type: "email", label: "Email" },
  ],
  sections: [
    {
      id: "agenda",
      title: "Agenda",
      questions: [
        {
          id: "agenda_items",
          type: "repeatable",
          label: "Agenda item",
          required: true,
          subfields: [
            { id: "topic", type: "text", label: "Topic", required: true },
            {
              id: "decision_required",
              type: "checkbox",
              label: "Decision required",
            },
            {
              id: "decision_question",
              type: "textarea",
              label: "Decision question",
              required: true,
              show_if: { field: "decision_required", equals: true },
            },
          ],
        },
      ],
    },
  ],
};

describe("dynamic template renderer domain", () => {
  it("validates required fields and nested repeatable rows", () => {
    const errors = validateTemplateData(schema, {
      meeting_title: "",
      agenda_items: [{ decision_required: true }],
    });

    expect(errors.map((error) => error.path)).toEqual([
      "meeting_title",
      "agenda_items.0.topic",
      "agenda_items.0.decision_question",
    ]);
  });

  it("skips conditional fields when the condition is not met", () => {
    const errors = validateTemplateData(schema, {
      meeting_title: "June board meeting",
      agenda_items: [{ topic: "Finance", decision_required: false }],
    });

    expect(errors).toEqual([]);
  });

  it("calculates completion from visible editable fields", () => {
    expect(
      calculateCompletionPercent(schema, {
        meeting_title: "June board meeting",
        agenda_items: [{ topic: "Finance", decision_required: false }],
      }),
    ).toBe(100);

    expect(calculateCompletionPercent(schema, {})).toBe(33);
  });

  it("updates nested values without mutating the original data", () => {
    const current = {
      agenda_items: [{ topic: "Finance" }],
    };
    const next = setValue(
      current,
      ["agenda_items", 0, "topic"],
      "Executive report",
    );

    expect(getValue(next, ["agenda_items", 0, "topic"])).toBe(
      "Executive report",
    );
    expect(current.agenda_items[0].topic).toBe("Finance");
  });
});
