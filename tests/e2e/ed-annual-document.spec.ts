import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

import { createAuthenticatedStorageState, expect, test } from "../fixtures/authenticated.fixture";
import { annualReviewDefaults } from "@/lib/ed-review/annual-document";

test.describe("@critical ED annual document", () => {
  test.setTimeout(180_000);

  test("saves the eight-section review and keeps compensation out of ordinary member access", async ({
    browser, baseURL, testData,
  }, testInfo) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const member = await testData.createOrganizationMember(owner);
    const ownerContext = await browser.newContext({ baseURL,
      storageState: await createAuthenticatedStorageState(owner.email, owner.password, baseURL) });
    const page = await ownerContext.newPage();
    page.setDefaultTimeout(10_000);
    try {
      await page.goto("/modules/ed-review");
      await page.getByRole("link", { name: "Open ED / CEO annual evaluation document" }).click();
      await expect(page.getByRole("heading", { name: "ED / CEO Annual Evaluation" })).toBeVisible();
      await page.getByRole("combobox", { name: "Member to assign" }).click();
      await page.getByRole("option", { name: owner.fullName }).click();
      await page.getByRole("combobox", { name: "Annual review role" }).click();
      await page.getByRole("option", { name: "Full template editor" }).click();
      await page.getByRole("button", { name: "Assign access" }).click();
      await expect(page.getByText("full access")).toBeVisible();
      await page.getByRole("textbox", { name: "Organization" }).fill("Olea Annual QA");
      await page.getByRole("spinbutton", { name: /Years in role/ }).fill("2.5");
      await page.getByRole("checkbox", { name: "Staff survey" }).check();
      await page.getByRole("checkbox", { name: "Partners / funders" }).check();
      await page.getByRole("button", { name: "Save Cover & Setup" }).click();
      await expect(page.getByText("Section saved.")).toBeVisible();
      await page.getByRole("button", { name: "ED Self-Assessment" }).click();
      await page.getByRole("textbox", { name: "Competency name" }).first().fill("Strategic leadership");
      await page.getByRole("textbox", { name: "Linked KPIs" }).first().fill("Two completed partnerships");
      await page.getByRole("combobox", { name: "ED rating for Strategic leadership" }).click();
      await page.getByRole("option", { name: "3 / 5" }).click();
      await page.getByRole("button", { name: "Save ED Self-Assessment" }).click();
      await expect(page.getByText("Section saved.")).toBeVisible();
      await page.getByRole("button", { name: "Board Chair Assessment" }).click();
      await page.getByRole("combobox", { name: "Chair rating for Strategic leadership" }).click();
      await page.getByRole("option", { name: "5 / 5" }).click();
      await page.getByRole("button", { name: "Save Board Chair Assessment" }).click();
      await expect(page.getByText("Section saved.")).toBeVisible();
      await page.getByRole("button", { name: "Scoring Summary" }).click();
      await expect(page.getByText("Chair rates notably higher — ED may be underselling. Discuss.")).toBeVisible();
      await page.getByRole("button", { name: "Compensation & Bonuses" }).click();
      await page.getByRole("textbox", { name: /Current salary \(CAD\)/ }).fill("100000");
      await page.getByRole("textbox", { name: "Last adjustment amount" }).fill("4%");
      await page.getByRole("textbox", { name: /Current total package \(CAD\)/ }).fill("125000");
      await page.getByRole("spinbutton", { name: /Recommended adjustment %/ }).fill("5");
      await page.getByRole("textbox", { name: "Rationale" }).fill("Strong performance with evidence");
      await page.getByRole("textbox", { name: "Board minute reference #" }).fill("2026-12-01-5");
      await page.getByRole("textbox", { name: "Target" }).first().fill("Q2 2027");
      await expect(page.getByText("$105,000.00")).toBeVisible();
      await page.getByRole("button", { name: "Save Compensation & Bonuses" }).click();
      await expect(page.getByText("Section saved.")).toBeVisible();
      await page.getByRole("button", { name: "Professional Development" }).click();
      await page.getByRole("textbox", { name: "Specific & Measurable" }).first().fill("Two partnerships");
      await page.getByRole("textbox", { name: "Achievable & Relevant" }).first().fill("Supports plan");
      await page.getByRole("textbox", { name: "Provider" }).first().fill("College");
      await page.getByRole("button", { name: "Save Professional Development" }).click();
      await expect(page.getByText("Section saved.")).toBeVisible();
      await page.getByRole("button", { name: "Future Remuneration" }).click();
      await page.getByRole("textbox", { name: "target Date" }).fill("Within 18 months");
      await page.getByRole("textbox", { name: "board Notes" }).fill("Board to review next year");
      await page.getByRole("button", { name: "Save Future Remuneration" }).click();
      await expect(page.getByText("Section saved.")).toBeVisible();
      await page.getByRole("button", { name: "Agreed Actions & Sign-off" }).click();
      await page.getByRole("textbox", { name: "Detail / expected outcome" }).first().fill("Present plan to board");
      await page.getByRole("button", { name: "Save Agreed Actions & Sign-off" }).click();
      await expect(page.getByText("Section saved.")).toBeVisible();
      await page.reload();
      await page.getByRole("button", { name: "Compensation & Bonuses" }).click();
      await expect(page.getByRole("textbox", { name: /Current salary \(CAD\)/ })).toHaveValue("100000.00");
      await expect(page.getByRole("textbox", { name: "Rationale" })).toHaveValue("Strong performance with evidence");
      const archive = page.waitForEvent("download");
      await page.getByRole("link", { name: "Export editable JSON" }).click();
      const exportedArchive = await archive;
      expect(exportedArchive.suggestedFilename()).toMatch(/\.json$/);
      await page.getByLabel("Import ED review JSON archive").setInputFiles({
        name: "ed-review-archive.json", mimeType: "application/json",
        buffer: await readFile(await exportedArchive.path()),
      });
      await expect(page.getByRole("status")).toContainText("Archive imported and saved.", { timeout: 30_000 });
      const pdf = await page.request.get("/api/ed-review/annual/export");
      expect(pdf.status()).toBe(200);
      expect(pdf.headers()["content-type"]).toContain("application/pdf");
      expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
      await page.setViewportSize({ width: 390, height: 844 });
      await expect.poll(() => page.evaluate(() => document.querySelector('[data-testid="app-main"]')!
        .getBoundingClientRect().left)).toBeLessThanOrEqual(1);
      const mobileOverflow = await page.evaluate(() => ({ width: document.documentElement.scrollWidth,
        offenders: [...document.querySelectorAll<HTMLElement>("body *")]
          .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
          .slice(0, 12).map((element) => ({ tag: element.tagName, className: String(element.className).slice(0, 100),
            right: Math.round(element.getBoundingClientRect().right) })) }));
      expect(mobileOverflow.width, JSON.stringify(mobileOverflow.offenders)).toBeLessThanOrEqual(390);
      const navBox = await page.getByRole("navigation", { name: "Annual review sections" }).boundingBox();
      expect(navBox!.width).toBeGreaterThan(280);
      expect(navBox!.x + navBox!.width).toBeLessThanOrEqual(391);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: testInfo.outputPath("ed-annual-mobile.png") });

      const memberContext = await browser.newContext({ baseURL,
        storageState: await createAuthenticatedStorageState(member.email, member.password, baseURL) });
      try {
        const memberPage = await memberContext.newPage();
        await memberPage.goto("/modules/ed-review/annual");
        await expect(memberPage.getByRole("heading", { name: "Annual review access restricted" })).toBeVisible();
      } finally { await memberContext.close(); }
      const direct = createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_PUBLISHABLE_KEY!);
      const { error: signInError } = await direct.auth.signInWithPassword({ email: member.email, password: member.password });
      expect(signInError).toBeNull();
      const { data: compRows } = await direct.from("ed_review_annual_compensation").select("data");
      expect(compRows ?? []).toHaveLength(0);
    } finally { await ownerContext.close(); }
  });

  test("projects only the ED and CFO sections allowed by their server-side roles", async ({
    browser, baseURL, testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const ed = await testData.createOrganizationMember(owner);
    const cfo = await testData.createOrganizationMember(owner);
    const ownerContext = await browser.newContext({ baseURL,
      storageState: await createAuthenticatedStorageState(owner.email, owner.password, baseURL) });
    try {
      await (await ownerContext.newPage()).goto("/modules/ed-review");
      const { data: cycle, error: cycleError } = await testData.supabase.from("ed_review_cycles")
        .select("id").eq("organization_id", owner.organizationId).order("created_at", { ascending: false }).limit(1).single();
      expect(cycleError).toBeNull();
      const defaults = annualReviewDefaults();
      defaults.general.competencies[0].name = "Sensitive competency";
      defaults.general.competencies[0].selfRating = 3;
      defaults.general.competencies[0].chairRating = 5;
      defaults.general.competencies[0].selfEvidence = "Self evidence private to reviewers";
      defaults.general.competencies[0].chairEvidence = "Chair evidence private to reviewers";
      defaults.compensation.packageNotes = "Compensation memo private to finance";
      defaults.compensation.currentSalaryCents = 12_345_600;
      const [general, compensation, assignments] = await Promise.all([
        testData.supabase.from("ed_review_annual_general").insert({ cycle_id: cycle!.id,
          organization_id: owner.organizationId, data: defaults.general }),
        testData.supabase.from("ed_review_annual_compensation").insert({ cycle_id: cycle!.id,
          organization_id: owner.organizationId, data: defaults.compensation }),
        testData.supabase.from("ed_review_annual_access").insert([
          { cycle_id: cycle!.id, organization_id: owner.organizationId, user_id: ed.userId, role: "ed", granted_by: owner.userId },
          { cycle_id: cycle!.id, organization_id: owner.organizationId, user_id: cfo.userId, role: "cfo", granted_by: owner.userId },
        ]),
      ]);
      expect(general.error).toBeNull();
      expect(compensation.error).toBeNull();
      expect(assignments.error).toBeNull();

      const edContext = await browser.newContext({ baseURL,
        storageState: await createAuthenticatedStorageState(ed.email, ed.password, baseURL) });
      try {
        const page = await edContext.newPage();
        const response = await page.goto("/modules/ed-review/annual");
        await expect(page.getByRole("button", { name: "ED Self-Assessment" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Compensation & Bonuses" })).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Board Chair Assessment" })).toHaveCount(0);
        expect(await response!.text()).not.toContain("Compensation memo private to finance");
      } finally { await edContext.close(); }

      const cfoContext = await browser.newContext({ baseURL,
        storageState: await createAuthenticatedStorageState(cfo.email, cfo.password, baseURL) });
      try {
        const page = await cfoContext.newPage();
        const response = await page.goto("/modules/ed-review/annual");
        await expect(page.getByRole("button", { name: "Compensation & Bonuses" })).toBeVisible();
        await expect(page.getByRole("button", { name: "ED Self-Assessment" })).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Scoring Summary" })).toHaveCount(0);
        expect(await response!.text()).not.toContain("Sensitive competency");
        expect(await response!.text()).not.toContain("Self evidence private to reviewers");
      } finally { await cfoContext.close(); }
    } finally { await ownerContext.close(); }
  });

  test("shows the annual document and template guidance in French Canadian", async ({ browser, baseURL, testData }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const context = await browser.newContext({ baseURL,
      storageState: await createAuthenticatedStorageState(owner.email, owner.password, baseURL) });
    await context.addCookies([{ name: "olea_locale", value: "fr-CA", url: baseURL }]);
    try {
      const page = await context.newPage();
      await page.goto("/modules/ed-review");
      await page.goto("/modules/ed-review/annual");
      await expect(page.locator("html")).toHaveAttribute("lang", "fr-CA");
      await expect(page.getByRole("heading", { name: "Évaluation annuelle de la direction générale" })).toBeVisible();
      await page.getByRole("button", { name: "Rémunération future" }).click();
      await expect(page.getByRole("textbox", { name: "Objectif de cette section" }))
        .toHaveValue(/ne constitue pas un engagement juridiquement contraignant/);
    } finally { await context.close(); }
  });
});
