import { describe, expect, it } from "vitest";

import { strategicGuidanceFrenchTranslations } from "@/lib/i18n/strategic-guidance-fr";
import { workbookModules } from "@/lib/strategic-planning/workbook";

describe("Strategic Planning guidance in French", () => {
  it("covers every visible guidance string, including text nodes in Start here HTML", () => {
    const source: string[] = [];
    for (const module of workbookModules) {
      source.push(module.purpose, module.who, module.output ?? "");
      for (const key of ["questions", "steps", "facilitator", "equity", "tips"] as const) {
        source.push(...(module[key] ?? []));
      }
      source.push(...Object.values(module.scale ?? {}));
      for (const section of module.guidance ?? []) {
        source.push(section.h, ...[...section.html.matchAll(/>([^<>]+)</g)].map((match) => match[1]));
      }
    }
    const translations = new Map(strategicGuidanceFrenchTranslations);
    const missing = [...new Set(source.map((value) => value.trim()).filter(Boolean))]
      .filter((value) => !translations.has(value));
    expect(missing).toEqual([]);
    expect(translations.get("Who owns each action?")).toContain("responsable");
    expect(translations.get("When collecting data with First Nations communities, are you following OCAP® principles: ownership, control, access and possession?"))
      .toContain("propriété, contrôle, accès et possession");
    expect(translations.get("Confirm the organization is ready, agree on why you are planning, and set up the people, timeline and budget for the process."))
      .toContain("l'organisme est prêt");
    expect(translations.get("A planning committee of 5 to 7 board and staff members. Plan a stakeholder survey and a few interviews. Consider a facilitator for the retreat."))
      .toContain("un sondage");
    expect(translations.get("Hear from stakeholders: build the ready-made survey in the Stakeholder survey tab, send it out, and add interviews or focus groups if you have capacity."))
      .toContain("le sondage prêt à l'emploi");
    expect(translations.get("Record survey results and add them to What we heard (2D)."))
      .toContain("du sondage");
    expect(translations.get("Is the survey offered in plain language and the languages your community uses?"))
      .toContain("Le sondage est-il proposé");
    expect([...translations.values()].join(" ")).not.toMatch(/l['’]sondage|une sondage|sondage prête|organisme est prête/);
  });
});
