import { createAuthenticatedStorageState, expect, test } from "../fixtures/authenticated.fixture";

test.describe("@critical Strategic Planning source parity", () => {
  test("imports source results, records paper responses, and shows action budget", async ({
    browser, baseURL, testData,
  }) => {
    test.setTimeout(120_000);
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    testData.registerCleanup({ label: `strategic parity workbook ${owner.organizationId}`, run: async () => {
      const { error } = await testData.supabase.from("strategic_workbooks")
        .delete().eq("organization_id", owner.organizationId);
      if (error) throw error;
    } });
    const context = await browser.newContext({
      baseURL,
      storageState: await createAuthenticatedStorageState(owner.email, owner.password, baseURL),
    });
    try {
      const page = await context.newPage();
      await page.goto("/modules/strategic-planning/workbook");
      await page.getByRole("button", { name: "Import workbook JSON" }).click();
      await page.getByLabel("Workbook JSON file").setInputFiles({
        name: "source-workbook.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify({
          workbook: "strategic-planning", version: 1,
          data: {
            "org.name": "Source workbook QA",
            "m2.sv.resp.paper": "3",
            "m2.sv.res.connect.result": "Three paper participants prefer evening sessions",
          },
        })),
      });
      await page.getByRole("button", { name: "Import and replace workbook" }).click();
      await expect(page.getByRole("status").getByText("Workbook imported and saved for this organization.")).toBeVisible();
      await page.reload();
      await page.getByRole("tab", { name: "Template" }).click();
      await page.getByRole("combobox", { name: "Size level" }).click();
      await page.getByRole("option", { name: /Large —/ }).click();
      await page.getByRole("combobox", { name: "Plan horizon" }).click();
      await page.getByRole("option", { name: "5-year plan" }).click();
      await page.getByRole("combobox", { name: "Equity and reconciliation lens" }).click();
      await page.getByRole("option", { name: "Off", exact: true }).click();
      await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
      await page.reload();
      await page.getByRole("tab", { name: "Template" }).click();
      await expect(page.getByRole("combobox", { name: "Size level" })).toContainText("Large");
      await expect(page.getByRole("combobox", { name: "Plan horizon" })).toContainText("5-year plan");
      await expect(page.getByRole("combobox", { name: "Equity and reconciliation lens" })).toContainText("Off");
      await page.getByRole("button", { name: "2. Looking back and around" }).click({ timeout: 15_000 });
      await page.getByRole("tab", { name: "Template" }).click();
      await expect(page.getByLabel("Paper or other responses")).toHaveValue("3");
      const exported = await context.request.get("/api/strategic-planning/data-export?kind=workbook");
      expect(exported.status()).toBe(200);
      const exportedJson = await exported.json();
      expect(exportedJson?.data?.values?.["m2.sv.res.connect.result"])
        .toBe("Three paper participants prefer evening sessions");
      const connectResult = page.getByRole("heading", { name: /How are you connected/ })
        .locator("..").getByRole("textbox", { name: "Result" });
      await expect(connectResult).toHaveValue("Three paper participants prefer evening sessions");
      await page.getByRole("button", { name: "Add these results to What we heard (2D)" }).click();
      await expect(page.getByLabel("Key themes from stakeholders"))
        .toHaveValue(/Three paper participants prefer evening sessions/);
      if (await page.getByRole("button", { name: "Save workbook" }).isVisible()) {
        await page.getByRole("button", { name: "Save workbook" }).click();
      }
      await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
      await page.reload();
      await page.getByRole("button", { name: "2. Looking back and around" }).click({ timeout: 15_000 });
      await page.getByRole("tab", { name: "Template" }).click();
      await expect(page.getByLabel("Key themes from stakeholders"))
        .toHaveValue(/Three paper participants prefer evening sessions/);

      await page.getByRole("button", { name: "6. Actions and budget" }).click();
      await page.getByRole("tab", { name: "Template" }).click();
      await page.getByRole("button", { name: "Add an action" }).click();
      await page.getByLabel("Action budget (CAD)").fill("1250.00");
      await page.getByLabel("Action budget (CAD)").press("Tab");
      await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
      await page.getByRole("button", { name: "Plan budget", exact: true }).click({ timeout: 15_000 });
      await expect(page.getByText("Year 1 budget:")).toBeVisible();
      await expect(page.getByText("$1,250.00").first()).toBeVisible();
      await page.reload();
      await page.getByRole("button", { name: "Plan budget" }).click();
      await expect(page.getByText("$1,250.00").first()).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
