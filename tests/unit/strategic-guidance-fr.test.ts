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
  });
});
