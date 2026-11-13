import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test } from "../fixtures/test-data.fixture";
import { createAuthenticatedPage } from "../support/auth-session";

const fixture = resolve(process.cwd(), "tests/fixtures/html-reference/ed-review-annual-keys.json");

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

test("@critical all 180 ED Review HTML fields survive UI import, Supabase save, and archive export", async ({
  baseURL, browser, testData,
}) => {
  test.setTimeout(180_000);
  if (!baseURL) throw new Error("Playwright baseURL is required.");
  const keys = JSON.parse(await readFile(fixture, "utf8")) as string[];
  expect(keys).toHaveLength(180);
  const rows = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => ({ id: `${prefix}${index}` }));
  const source = {
    _type: "ed-review", store: Object.fromEntries(keys.map((key) => [key, valueFor(key)])),
    competencies: rows("c", 5), smartGoals: rows("sm", 3), goals: rows("g", 4),
    externals: rows("x", 3), actions: rows("a", 4), milestones: rows("m", 4),
  };
  const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
  const session = await createAuthenticatedPage(browser, baseURL, owner.email, owner.password);
  try {
    const page = session.page;
    await page.goto("/modules/ed-review");
    await page.getByRole("link", { name: "Open ED / CEO annual evaluation document" }).click();
    await page.getByRole("combobox", { name: "Member to assign" }).click();
    await page.getByRole("option", { name: owner.fullName }).click();
    await page.getByRole("combobox", { name: "Annual review role" }).click();
    await page.getByRole("option", { name: "Full template editor" }).click();
    await page.getByRole("button", { name: "Assign access" }).click();
    await expect(page.getByText("full access")).toBeVisible({ timeout: 30_000 });
    await page.getByLabel("Import ED review JSON archive").setInputFiles({
      name: "all-source-fields.json", mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(source)),
    });
    await expect(page.getByRole("status")).toContainText("Archive imported and saved.", { timeout: 30_000 });
    const response = await page.request.get("/api/ed-review/annual/export?format=archive");
    expect(response.status()).toBe(200);
    const exported = await response.json();
    expect(exported.general).toBeDefined();
    expect(exported.compensation).toBeDefined();
    const serialized = JSON.stringify(exported);
    for (const key of keys) {
      const value = valueFor(key);
      if (typeof value === "string" && value.startsWith("QA ")) {
        expect(serialized, `${key} was lost during import/save/export`).toContain(value);
      }
    }
  } finally {
    await session.context.close();
  }
});
