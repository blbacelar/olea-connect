import { expect, test } from "../fixtures/authenticated.fixture";
import { AppShellPage } from "../pages/app-shell.page";
import { TemplatesPage } from "../pages/templates.page";

test.describe("@smoke @critical platform UI coverage gate", () => {
  test("collapses and restores the desktop sidebar without breaking navigation", async ({
    authenticatedMember,
    page,
  }) => {
    const app = new AppShellPage(page);
    const sidebar = page.getByTestId("app-sidebar");
    const organizationName = sidebar.getByText(
      authenticatedMember.organizationName,
      { exact: true },
    );

    await app.openDashboard();
    await app.expectSidebarExpanded();
    await expect(organizationName).toBeVisible();
    await page.getByRole("button", { name: "Collapse sidebar" }).focus();
    await page.keyboard.press("Enter");
    await app.expectSidebarCollapsed();
    await expect(organizationName).toHaveCount(0);

    const templatesLink = sidebar.getByRole("link", { name: "Templates" });
    await expect(templatesLink).toBeVisible();
    await templatesLink.focus();
    await expect(page.getByTestId("sidebar-tooltip-templates")).toBeVisible();
    await templatesLink.click();
    await expect(page).toHaveURL(/\/templates$/);
    await app.expectSidebarCollapsed();
    await expect(templatesLink).toHaveAttribute("aria-label", "Templates");
    await expect(templatesLink).toHaveAttribute("aria-current", "page");

    await page.reload();
    await app.expectSidebarCollapsed();
    await expect(templatesLink).toHaveAttribute("aria-current", "page");

    await page.getByRole("button", { name: "Expand sidebar" }).focus();
    await page.keyboard.press("Enter");
    await app.expectSidebarExpanded();
    await expect(sidebar).toContainText("Templates");
    await expect(templatesLink).toHaveAttribute("aria-current", "page");
    await expect(organizationName).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(sidebar).toBeHidden();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("button", { name: "Close navigation" }).nth(1),
    ).toBeVisible();
  });

  test("reaches the primary authenticated platform screens without forcing a new checkout", async ({
    authenticatedMember,
    page,
  }) => {
    test.setTimeout(90_000);

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
    const createdKpiRow = page
      .getByRole("row")
      .filter({ hasText: kpiName })
      .first();
    await expect(createdKpiRow).toBeVisible({ timeout: 15000 });
    await expect(addKpiDialog).toBeHidden();
    await page.getByRole("tab", { name: "Q2 Tracker" }).click();
    await expect(
      page.getByRole("heading", { name: /KPI Staff Tracker — Q2/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: kpiName }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add KPI to Q2" })).toBeVisible();
    await page.getByRole("button", { name: "Add KPI to Q2" }).click();
    const addQ2KpiDialog = page.getByRole("dialog", { name: "Add KPI to Q2" });
    await addQ2KpiDialog.getByLabel("Domain").fill("Programs");
    await addQ2KpiDialog.getByLabel("KPI name").fill(kpiName);
    await addQ2KpiDialog.getByLabel("Owner").fill("Executive Director");
    await addQ2KpiDialog.getByLabel("Target as displayed").fill(">= 80%");
    await addQ2KpiDialog.getByLabel("Target as number").fill("80");
    await addQ2KpiDialog.getByLabel("Current value").fill("75");
    await addQ2KpiDialog.getByRole("button", { name: "Add KPI" }).click();
    await expect(addQ2KpiDialog).toBeHidden();
    await expect(
      page.getByRole("row").filter({ hasText: kpiName }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("row").filter({ hasText: kpiName }),
    ).toContainText("75");
    await page.reload();
    await expect(
      page.getByRole("row").filter({ hasText: kpiName }),
    ).toContainText("75");
    await page.getByRole("button", { name: "Add KPI to Q2" }).click();
    const duplicateQ2Dialog = page.getByRole("dialog", { name: "Add KPI to Q2" });
    await duplicateQ2Dialog.getByLabel("Domain").fill("programs");
    await duplicateQ2Dialog.getByLabel("KPI name").fill(kpiName);
    await duplicateQ2Dialog.getByLabel("Owner").fill("Changed owner");
    await duplicateQ2Dialog.getByLabel("Target as displayed").fill(">= 90%");
    await duplicateQ2Dialog.getByLabel("Target as number").fill("90");
    await duplicateQ2Dialog.getByLabel("Current value").fill("10");
    await duplicateQ2Dialog.getByRole("button", { name: "Add KPI" }).click();
    await expect(
      duplicateQ2Dialog.getByText(/already exists|already tracked in Q2/i),
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: kpiName }),
    ).toContainText("75");
    await duplicateQ2Dialog.press("Escape");
    for (const [quarter, currentValue] of [
      [3, "66"],
      [4, "60"],
    ] as const) {
      await page.getByRole("tab", { name: `Q${quarter} Tracker` }).click();
      await expect(
        page.getByRole("heading", { name: new RegExp(`KPI Staff Tracker — Q${quarter}`, "i") }),
      ).toBeVisible();
      await expect(
        page.getByRole("row").filter({ hasText: kpiName }),
      ).toHaveCount(0);
      await page.getByRole("button", { name: `Add KPI to Q${quarter}` }).click();
      const quarterDialog = page.getByRole("dialog", {
        name: `Add KPI to Q${quarter}`,
      });
      await quarterDialog.getByLabel("Domain").fill("Programs");
      await quarterDialog.getByLabel("KPI name").fill(kpiName);
      await quarterDialog.getByLabel("Target as displayed").fill(">= 80%");
      await quarterDialog.getByLabel("Target as number").fill("80");
      await quarterDialog.getByLabel("Current value").fill(currentValue);
      await quarterDialog.getByRole("button", { name: "Add KPI" }).click();
      await expect(quarterDialog).toBeHidden();
      await expect(
        page.getByRole("row").filter({ hasText: kpiName }),
      ).toHaveCount(1);
      await expect(
        page.getByRole("row").filter({ hasText: kpiName }),
      ).toContainText(currentValue);
    }
    await page.reload();
    for (const [quarter, currentValue] of [
      [1, "72"],
      [2, "75"],
      [3, "66"],
      [4, "60"],
    ] as const) {
      await page.getByRole("tab", { name: `Q${quarter} Tracker` }).click();
      await expect(
        page.getByRole("row").filter({ hasText: kpiName }),
      ).toHaveCount(1);
      await expect(
        page.getByRole("row").filter({ hasText: kpiName }),
      ).toContainText(currentValue);
    }
    await page.getByRole("tab", { name: "Q1 Tracker" }).click();
    await expect(createdKpiRow).toBeVisible();
    await expect(createdKpiRow).toContainText("72");
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
    await page.getByRole("tab", { name: "Board Dashboard" }).click();
    await expect(
      page.getByRole("heading", { name: "Full-year KPI results by quarter" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "RAG key: GREEN = on target, AMBER = needs attention, RED = off track",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Domain" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Outcome" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Progress % to target" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Q1 Result" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Variance vs target" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Full-year RAG" }),
    ).toBeVisible();
    await expect(page.getByTestId("board-dashboard-table")).toHaveClass(
      /scrollbar-hide/,
    );
    await expect(page.getByTestId("kpi-dashboard-tabs")).toHaveClass(
      /scrollbar-hide/,
    );
    const boardRow = page.getByRole("row").filter({ hasText: kpiName }).last();
    await expect(boardRow).toContainText("Programs");
    await expect(boardRow).toContainText("90%");
    await expect(boardRow).toContainText("Latest: Q1");
    await expect(
      boardRow.getByRole("combobox", { name: `Full-year RAG for ${kpiName}` }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Milestones & Risks" }).click();
    await expect(page).toHaveURL(/\/modules\/kpi-dashboard\?tab=milestones/);
    await expect(page.getByRole("heading", { name: "Milestones" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Risk register" }),
    ).toBeVisible();

    const milestoneTitle = `AGM confirmed ${Date.now()}`;
    await page.getByRole("button", { name: "Add milestone" }).click();
    const addMilestoneDialog = page.getByRole("dialog", { name: "Add milestone" });
    await expect(addMilestoneDialog).toBeVisible();
    await addMilestoneDialog.getByLabel("Milestone title").fill(milestoneTitle);
    await addMilestoneDialog.getByLabel("Owner").fill("Board Chair");
    await addMilestoneDialog.getByLabel("Due date").fill("2026-10-15");
    await addMilestoneDialog.getByLabel("Notes").fill("Created by platform E2E.");
    await addMilestoneDialog.getByRole("button", { name: "Add milestone" }).click();
    await expect(page).toHaveURL(/\/modules\/kpi-dashboard\?tab=milestones/);
    await expect(
      page.getByRole("tab", { name: "Milestones & Risks" }),
    ).toHaveAttribute("data-state", "active");
    const milestoneRow = page
      .getByRole("row")
      .filter({ hasText: milestoneTitle })
      .first();
    await expect(milestoneRow).toContainText("Board Chair", { timeout: 15000 });
    await expect(milestoneRow).toContainText("2026-10-15");
    await expect(milestoneRow).toContainText("Not Started");
    await page.keyboard.press("Escape");
    await expect(addMilestoneDialog).toBeHidden();

    await milestoneRow
      .getByRole("button", { name: `Edit milestone ${milestoneTitle}` })
      .click();
    const editMilestoneDialog = page.getByRole("dialog", {
      name: "Edit milestone",
    });
    await expect(editMilestoneDialog).toBeVisible();
    await editMilestoneDialog.getByLabel("Owner").fill("Executive Director");
    await editMilestoneDialog.getByLabel("Milestone status").click();
    await page.getByRole("option", { name: "Complete" }).click();
    await editMilestoneDialog
      .getByRole("button", { name: "Update milestone" })
      .click();
    await expect(milestoneRow).toContainText("Executive Director");
    await expect(milestoneRow).toContainText("Complete");
    await page.keyboard.press("Escape");
    await expect(editMilestoneDialog).toBeHidden();

    const riskArea = `Finance risk ${Date.now()}`;
    await page.getByRole("button", { name: "Add risk" }).click();
    const addRiskDialog = page.getByRole("dialog", { name: "Add risk" });
    await expect(addRiskDialog).toBeVisible();
    await addRiskDialog.getByLabel("Risk area").fill(riskArea);
    await addRiskDialog
      .getByLabel("Risk description")
      .fill("Funding renewal may arrive later than expected.");
    await addRiskDialog
      .getByLabel("Mitigation")
      .fill("Maintain monthly funder check-ins.");
    await addRiskDialog.getByLabel("Owner").fill("Treasurer");
    await addRiskDialog.getByLabel("Risk RAG status").click();
    await page.getByRole("option", { name: "Amber" }).click();
    await addRiskDialog.getByRole("button", { name: "Add risk" }).click();
    const riskRow = page.getByRole("row").filter({ hasText: riskArea }).first();
    await expect(riskRow).toContainText("Treasurer", { timeout: 15000 });
    await expect(riskRow).toContainText("Funding renewal");
    await expect(riskRow).toContainText("AMBER");
    await page.keyboard.press("Escape");
    await expect(addRiskDialog).toBeHidden();

    await riskRow.getByRole("button", { name: `Edit risk ${riskArea}` }).click();
    const editRiskDialog = page.getByRole("dialog", { name: "Edit risk" });
    await expect(editRiskDialog).toBeVisible();
    await editRiskDialog.getByLabel("Owner").fill("Finance Lead");
    await editRiskDialog.getByRole("button", { name: "Update risk" }).click();
    await expect(riskRow).toContainText("Finance Lead");
    await page.keyboard.press("Escape");
    await expect(editRiskDialog).toBeHidden();

    await riskRow.getByRole("button", { name: `Delete risk ${riskArea}` }).click();
    const deleteRiskDialog = page.getByRole("dialog", {
      name: "Delete this risk?",
    });
    await expect(deleteRiskDialog).toBeVisible();
    await deleteRiskDialog.getByRole("button", { name: "Delete risk" }).click();
    await expect(riskRow).toHaveCount(0);

    await milestoneRow
      .getByRole("button", { name: `Delete milestone ${milestoneTitle}` })
      .click();
    const deleteMilestoneDialog = page.getByRole("dialog", {
      name: "Delete this milestone?",
    });
    await expect(deleteMilestoneDialog).toBeVisible();
    await deleteMilestoneDialog
      .getByRole("button", { name: "Delete milestone" })
      .click();
    await expect(milestoneRow).toHaveCount(0);
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
