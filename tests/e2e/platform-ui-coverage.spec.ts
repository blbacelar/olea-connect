import { expect, test } from "../fixtures/authenticated.fixture";
import { AppShellPage } from "../pages/app-shell.page";
import { TemplatesPage } from "../pages/templates.page";

test.describe("@smoke @critical platform UI coverage gate", () => {
  test("reaches the primary authenticated platform screens without forcing a new checkout", async ({
    authenticatedMember,
    page,
  }) => {
    const app = new AppShellPage(page);
    const templates = new TemplatesPage(page);

    await app.expectDashboardForOrganization(
      authenticatedMember.organizationName,
    );
    await app.expectDashboardTemplate("Board Self-Evaluation");
    await app.expectNoServerError();

    await templates.open();
    await templates.expectTemplateVisible("Board Self-Evaluation");
    await app.expectNoServerError();

    await app.expectPageHeading("/settings/brand", "Brand profile");
    await app.expectText("Organization name");
    await app.expectNoServerError();

    await app.expectPageHeading("/team", "Team");
    await app.expectText(authenticatedMember.email);
    await app.expectNoServerError();

    await app.expectPageHeading("/subscription", "Subscription");
    await app.expectText("Your membership is active");
    await app.expectNoServerError();

    await app.expectPageHeading("/grants", /Olea Gives|Grants/i);
    await app.expectNoServerError();

    await app.expectPageHeading("/sponsors", "Sponsors & Olea Gives");
    await app.expectSectionHeading("Approved sponsor profiles");
    await app.expectNoServerError();

    await app.expectPageHeading(
      "/modules/kpi-dashboard",
      "KPI Dashboard and Board Reporting",
    );
    await app.expectText("Setup & Branding");
    await app.expectText("Q1 Tracker");
    await app.expectText("Annual Summary");
    await expect(
      page.getByRole("heading", { name: "Dashboard setup" }),
    ).toBeVisible();
    await expect(page.getByLabel("Organization name")).toBeVisible();
    await expect(page.getByRole("heading", { name: "KPI definitions" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: "Dashboard setup" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: "Add KPI" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Edit KPI/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Archive KPI/i })).toHaveCount(0);
    await page.getByRole("tab", { name: "Q1 Tracker" }).click();
    await expect(
      page.getByRole("heading", { name: /KPI Staff Tracker — Q1/i }),
    ).toBeVisible();
    await expect(
      page.getByText("Pale yellow fields are edited through modals"),
    ).toBeVisible();
    const addQ1Kpi = page.getByRole("button", { name: "Add KPI to Q1" });
    await expect(addQ1Kpi).toBeVisible();
    await addQ1Kpi.click();
    await expect(
      page.getByRole("dialog", { name: "Add KPI to Q1" }),
    ).toBeVisible();
    const addKpiDialog = page.getByRole("dialog", { name: "Add KPI to Q1" });
    await expect(addKpiDialog.getByLabel("KPI name")).toBeVisible();
    await expect(addKpiDialog.getByLabel("Current value")).toBeVisible();
    await expect(page.getByText("Calculated fields")).toBeVisible();
    const kpiName = `Client satisfaction ${Date.now()}`;
    await addKpiDialog.getByLabel("Domain").fill("Programs");
    await addKpiDialog.getByLabel("KPI name").fill(kpiName);
    await addKpiDialog.getByLabel("Owner").fill("Executive Director");
    await addKpiDialog.getByLabel("Target as displayed").fill(">= 80%");
    await addKpiDialog.getByLabel("Target as number").fill("80");
    await addKpiDialog.getByLabel("Current value").fill("72");
    await addKpiDialog
      .getByLabel("Notes / actions")
      .fill("Submitted from the quarter tracker.");
    await addKpiDialog.getByRole("button", { name: "Add KPI" }).click();
    await expect(addKpiDialog).toBeHidden();
    const createdKpiRow = page.getByRole("row").filter({ hasText: kpiName });
    await expect(createdKpiRow).toBeVisible();
    const actionCell = createdKpiRow.getByRole("cell").last();
    await expect(
      page.getByRole("columnheader", { name: "Actions" }),
    ).toBeVisible();
    await expect(
      actionCell.getByRole("button", {
        name: `Edit KPI and Q1 result for ${kpiName}`,
      }),
    ).toBeVisible();
    await expect(
      actionCell.getByRole("button", { name: `Archive KPI ${kpiName}` }),
    ).toBeVisible();
    await expect(
      actionCell.getByRole("button", {
        name: `Edit Q1 result for ${kpiName}`,
      }),
    ).toHaveCount(0);
    await expect(
      actionCell.getByRole("button", {
        name: `Clear Q1 result for ${kpiName}`,
      }),
    ).toBeVisible();
    await expect(actionCell).not.toContainText(/Edit KPI|Archive|Edit|Clear/);
    await createdKpiRow
      .getByRole("button", { name: `Edit KPI and Q1 result for ${kpiName}` })
      .click();
    await expect(
      page.getByRole("dialog", { name: `Edit KPI: ${kpiName}` }),
    ).toBeVisible();
    await expect(page.getByRole("dialog").getByLabel("KPI name")).toHaveValue(
      kpiName,
    );
    await expect(page.getByRole("dialog").getByLabel("Current value")).toHaveValue(
      "72",
    );
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("columnheader", { name: "Current value" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Variance vs target" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Auto-RAG" }),
    ).toBeVisible();
    await app.expectNoServerError();

    await app.expectPageHeading("/webinars", "Webinars");
    await app.expectSectionHeading("Upcoming");
    await app.expectNoServerError();

    await app.expectPageHeading("/community", "Community");
    await app.expectText(/Native Olea community|Community is coming soon/);
    await app.expectNoServerError();

    await app.expectPageHeading("/help", "Help");
    await app.expectText("Guides, answers, and a real person");
    await app.expectNoServerError();

    await app.expectPageHeading("/whats-new", "What's new");
    await app.expectText("Product updates, new resources");
    await app.expectNoServerError();
  });

  test("shows sponsor finance administration before member sponsor content for finance admins", async ({
    authenticatedMember,
    page,
    testData,
  }) => {
    await testData.assignPlatformRole(
      authenticatedMember.userId,
      "finance_admin",
    );

    await page.goto("/sponsors");
    await expect(
      page.getByRole("heading", { name: "Sponsors & Olea Gives", level: 1 }),
    ).toBeVisible();

    const financeAdministration = page.getByText("Finance administration", {
      exact: true,
    });
    const memberDirectory = page.getByText("Member directory", { exact: true });

    await expect(financeAdministration).toBeVisible();
    await expect(memberDirectory).toBeVisible();

    const financeTop = await financeAdministration.evaluate(
      (element) => element.getBoundingClientRect().top,
    );
    const directoryTop = await memberDirectory.evaluate(
      (element) => element.getBoundingClientRect().top,
    );

    expect(financeTop).toBeLessThan(directoryTop);
  });
});
