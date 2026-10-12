import { expect, test } from "../fixtures/authenticated.fixture";

test.describe("@critical KPI persistence", () => {
  test("saves, edits, isolates, and archives a quarter KPI", async ({ page, testData }) => {
    test.setTimeout(90_000);
    const name = `QA Client Retention ${Date.now()}`;
    const revisedName = `${name} Revised`;

    await page.goto("/modules/kpi-dashboard?tab=setup");
    const dashboardId = await page.locator('input[name="dashboardId"]').first().inputValue();
    await page.getByLabel("Financial year end").fill("2026-12-31");
    await page.getByRole("button", { name: "Save setup" }).click();
    await expect.poll(async () => {
      const { data, error } = await testData.supabase
        .from("kpi_dashboards")
        .select("financial_year_end")
        .eq("id", dashboardId)
        .single();
      if (error) throw error;
      return data.financial_year_end;
    }).toBe("2026-12-31");
    await page.reload();
    await expect(page.getByLabel("Financial year end")).toHaveValue("2026-12-31");
    await page.goto("/modules/kpi-dashboard?tab=q1");
    await page.getByRole("button", { name: "Add KPI to Q1" }).click();
    const addDialog = page.getByRole("dialog", { name: "Add KPI to Q1" });
    await addDialog.getByLabel("Domain").fill("Programs");
    await addDialog.getByLabel("KPI name").fill(name);
    await addDialog.getByLabel("Owner").fill("QA Director");
    await addDialog.getByLabel("Target as displayed").fill(">= 75%");
    await addDialog.getByLabel("Target as number").fill("75");
    await addDialog.getByLabel("Current value").fill("72");
    await addDialog.getByRole("button", { name: "Add KPI", exact: true }).click();
    await expect(addDialog).toBeHidden();

    await page.reload();
    await expect(page.getByTestId("kpi-quarter-table")).toContainText(name);
    await page.goto("/modules/kpi-dashboard?tab=q2");
    await expect(page.getByTestId("kpi-quarter-table")).not.toContainText(name);

    await page.goto("/modules/kpi-dashboard?tab=q1");
    await page.getByRole("button", { name: `Edit KPI and Q1 result for ${name}` }).click();
    const editDialog = page.getByRole("dialog", { name: `Edit KPI: ${name}` });
    await editDialog.getByLabel("KPI name").fill(revisedName);
    await editDialog.getByLabel("Current value").fill("78");
    await editDialog.getByRole("button", { name: "Save KPI" }).click();
    await expect(page.getByTestId("kpi-quarter-table")).toContainText(revisedName);
    await page.reload();
    await expect(page.getByTestId("kpi-quarter-table")).toContainText(revisedName);
    await expect(page.getByTestId("kpi-quarter-table")).toContainText("78");

    await page.getByRole("button", { name: `Archive KPI ${revisedName}` }).click();
    await page.getByRole("dialog", { name: "Archive this KPI?" })
      .getByRole("button", { name: "Archive KPI" })
      .click();
    await expect(page.getByTestId("kpi-quarter-table")).not.toContainText(revisedName);
    await page.reload();
    await expect(page.getByTestId("kpi-quarter-table")).not.toContainText(revisedName);
  });
});
