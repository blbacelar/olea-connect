import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { parseStandaloneEdReviewArchive } from "@/lib/ed-review/annual-html-import";

const keys = JSON.parse(readFileSync(new URL("../fixtures/html-reference/ed-review-annual-keys.json", import.meta.url), "utf8")) as string[];
const rows = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => ({ id: `${prefix}${index}` }));
const payload = (store: Record<string, unknown>) => ({
  _type: "ed-review", store,
  competencies: rows("c", 5), smartGoals: rows("sm", 3), goals: rows("g", 4),
  externals: rows("x", 3), actions: rows("a", 4), milestones: rows("m", 4),
});

function valueFor(key: string): string | boolean {
  if (key.startsWith("cover.src_") && key !== "cover.src_summary") return true;
  if (key.endsWith(".rating")) return "4";
  if (key.endsWith(".weight") || key === "cover.years" || key === "comp.recPct") return "7";
  if (/\.(?:cost|amount)$/.test(key) || key === "comp.currentSalary" || key === "comp.totalPackage") return "731";
  if (/Date$|\.(?:due|when)$/.test(key)) return "2027-03-17";
  if (key === "comp.cfoEmail") return "qa@bluecedar.org";
  if (key.endsWith(".approved")) return "yes";
  if (key.endsWith(".status")) return "achieved";
  if (key.endsWith(".link")) return "c0";
  return `QA ${key}`;
}

describe("rendered standalone ED Review HTML fields", () => {
  it("has an exact 180-key source inventory with no duplicates", () => {
    expect(keys).toHaveLength(180);
    expect(new Set(keys).size).toBe(180);
  });

  it("imports every source control into a distinct persisted annual review value", () => {
    const baseline = JSON.stringify(parseStandaloneEdReviewArchive(payload({})));
    const unmapped: string[] = [];
    for (const key of keys) {
      const imported = JSON.stringify(parseStandaloneEdReviewArchive(payload({ [key]: valueFor(key) })));
      if (imported === baseline) unmapped.push(key);
    }
    expect(unmapped).toEqual([]);
  });
});
