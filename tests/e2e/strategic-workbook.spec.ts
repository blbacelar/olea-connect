import { createClient } from "@supabase/supabase-js";

import { createAuthenticatedStorageState, expect, test } from "../fixtures/authenticated.fixture";
import { BoardCalendarPage } from "../pages/board-calendar.page";
import { inspectPdf } from "../support/pdf-inspector";

test.describe("@critical strategic workbook", () => {
  test.setTimeout(90_000);

  test("saves source workbook fields and rejects a stale concurrent edit", async ({
    browser, baseURL, testData,
  }, testInfo) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const ownerContext = await browser.newContext({
      baseURL,
      storageState: await createAuthenticatedStorageState(owner.email, owner.password, baseURL),
    });
    const page = await ownerContext.newPage();
    const peer = await ownerContext.newPage();
    const organizationName = `Workbook QA ${Date.now()}`;
    try {
      await page.goto("/modules/strategic-planning/workbook");
      await peer.goto("/modules/strategic-planning/workbook");
      await expect(page.getByRole("heading", { name: "Start here: set up your workbook" })).toBeVisible();
      await page.getByRole("tab", { name: "Template" }).click();
      await page.getByLabel("Organization name").fill(organizationName);
      await page.getByRole("combobox", { name: "Plan horizon" }).click();
      await page.getByRole("option", { name: "5-year plan" }).click();
      await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
      const workbookPdf = await ownerContext.request.get("/api/strategic-planning/workbook/print?scope=current&module=m0&format=pdf");
      expect(workbookPdf.status()).toBe(200);
      expect((await inspectPdf(Buffer.from(await workbookPdf.body()))).text).toContain(organizationName);
      const fullHtml = await ownerContext.request.get("/api/strategic-planning/workbook/print?scope=all&format=html");
      expect(fullHtml.status()).toBe(200);
      expect(await fullHtml.text()).toContain("Our planning journey");
      const summaryHtml = await ownerContext.request.get("/api/strategic-planning/export?kind=summary&format=html");
      expect(summaryHtml.status()).toBe(200);
      expect(await summaryHtml.text()).toContain("At a glance");
      testData.registerCleanup({
        label: `strategic workbook ${owner.organizationId}`,
        run: async () => {
          const { error } = await testData.supabase.from("strategic_workbooks")
            .delete().eq("organization_id", owner.organizationId);
          if (error) throw error;
        },
      });
      await peer.getByRole("tab", { name: "Template" }).click();
      await peer.getByLabel("Organization name").fill("Stale overwrite");
      await expect(peer.getByText("Another editor created this workbook. Reload to see their changes."))
        .toBeVisible();
      await page.reload();
      await page.getByRole("tab", { name: "Template" }).click();
      await expect(page.getByLabel("Organization name")).toHaveValue(organizationName);
      await expect(page.getByRole("combobox", { name: "Plan horizon" })).toContainText("5-year plan");
      await page.getByRole("button", { name: "Your strategic plan" }).click();
      await expect(page.getByRole("heading", { name: organizationName })).toBeVisible();
      await expect(page.getByRole("heading", { name: /Plan readiness:/ })).toBeVisible();
      await expect(page.getByRole("link", { name: "Download branded PDF" })).toBeVisible();
      await page.getByRole("button", { name: "9. Implementing and reviewing" }).click();
      await page.getByRole("tab", { name: "Template" }).click();
      await expect(page.getByRole("row", { name: /Mid-point \(Year 3\)/ })).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      await expect.poll(() => page.evaluate(() => document.querySelector('[data-testid="app-main"]')!
        .getBoundingClientRect().left)).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      await expect(page.locator('nav[aria-label="Workbook modules"]')).toBeHidden();
      const mobileSection = page.getByRole("button", { name: "Workbook section: 9. Implementing and reviewing" });
      await expect(mobileSection).toBeVisible();
      await mobileSection.click();
      await page.getByRole("dialog").getByRole("button", { name: "0. Start here" }).click();
      await expect(page.getByRole("heading", { name: "Start here: set up your workbook" })).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: testInfo.outputPath("strategic-workbook-mobile.png") });
      const { data: row, error: readError } = await testData.supabase
        .from("strategic_workbooks")
        .select("revision, state").eq("organization_id", owner.organizationId).single();
      expect(readError).toBeNull();
      expect(row!.revision).toBe(1);
      expect(row!.state.values["org.name"]).toBe(organizationName);
    } finally {
      await ownerContext.close();
    }
  });

  test("hides the workbook and raw state from ordinary members", async ({
    browser, baseURL, testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const member = await testData.createOrganizationMember(owner);
    const memberContext = await browser.newContext({
      baseURL,
      storageState: await createAuthenticatedStorageState(member.email, member.password, baseURL),
    });
    try {
      const memberPage = await memberContext.newPage();
      await memberPage.goto("/modules/strategic-planning/workbook");
      await expect(memberPage.getByTestId("app-main").getByText("An organization owner or administrator with Strategic Planning access"))
        .toBeVisible();
      await expect(memberPage.getByRole("button", { name: "Save workbook" })).toHaveCount(0);
      const memberClient = createClient(
        process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_PUBLISHABLE_KEY!,
      );
      const { error: signInError } = await memberClient.auth.signInWithPassword({
        email: member.email, password: member.password,
      });
      expect(signInError).toBeNull();
      const { data: rows } = await memberClient.from("strategic_workbooks")
        .select("state").eq("organization_id", owner.organizationId);
      expect(rows ?? []).toHaveLength(0);
    } finally {
      await memberContext.close();
    }
  });

  test("shares a fixed quarterly dashboard with members without exposing workbook state", async ({
    browser, baseURL, testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const member = await testData.createOrganizationMember(owner);
    const ownerContext = await browser.newContext({
      baseURL, storageState: await createAuthenticatedStorageState(owner.email, owner.password, baseURL),
    });
    const memberContext = await browser.newContext({
      baseURL, storageState: await createAuthenticatedStorageState(member.email, member.password, baseURL),
    });
    testData.registerCleanup({ label: `strategic board snapshots ${owner.organizationId}`, run: async () => {
      const result = await testData.supabase.from("strategic_workbook_snapshots")
        .delete().eq("organization_id", owner.organizationId);
      if (result.error) throw result.error;
    } });
    testData.registerCleanup({ label: `strategic workbook ${owner.organizationId}`, run: async () => {
      const result = await testData.supabase.from("strategic_workbooks")
        .delete().eq("organization_id", owner.organizationId);
      if (result.error) throw result.error;
    } });
    try {
      const ownerPage = await ownerContext.newPage();
      await ownerPage.goto("/modules/strategic-planning/workbook");
      await ownerPage.getByRole("tab", { name: "Template" }).click();
      await ownerPage.getByLabel("Organization name").fill("Board snapshot QA");
      await ownerPage.getByRole("button", { name: "Save workbook" }).click();
      await expect(ownerPage.getByRole("button", { name: "Saved" })).toBeVisible();
      await ownerPage.getByRole("button", { name: "6. Actions and budget" }).click();
      await ownerPage.getByRole("tab", { name: "Template" }).click();
      await ownerPage.getByRole("button", { name: "Add an action" }).click();
      await ownerPage.getByRole("button", { name: "Save workbook" }).click();
      await expect(ownerPage.getByRole("button", { name: "Saved" })).toBeVisible();
      await ownerPage.getByRole("button", { name: "Board dashboard" }).click();
      await ownerPage.getByLabel("Executive summary").fill("Private editor summary shared with members");
      await ownerPage.getByRole("button", { name: "Share with board" }).click();
      await expect(ownerPage.getByText("Board dashboard shared as a fixed snapshot.")).toBeVisible();

      const memberPage = await memberContext.newPage();
      await memberPage.goto("/modules/strategic-planning/board");
      await expect(memberPage.getByRole("heading", { name: "Board snapshot QA" })).toBeVisible();
      await expect(memberPage.getByTestId("app-main").getByText("Private editor summary shared with members")).toBeVisible();
      await expect(memberPage.getByRole("button", { name: "Share with board" })).toHaveCount(0);
      await memberPage.goto("/modules/strategic-planning/workbook");
      await expect(memberPage.getByTestId("app-main").getByText("An organization owner or administrator with Strategic Planning access"))
        .toBeVisible();

      const memberClient = createClient(
        process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_PUBLISHABLE_KEY!,
      );
      const signIn = await memberClient.auth.signInWithPassword({ email: member.email, password: member.password });
      expect(signIn.error).toBeNull();
      const [workbook, snapshots] = await Promise.all([
        memberClient.from("strategic_workbooks").select("state").eq("organization_id", owner.organizationId),
        memberClient.from("strategic_workbook_snapshots").select("summary").eq("organization_id", owner.organizationId),
      ]);
      expect(workbook.data ?? []).toHaveLength(0);
      expect(snapshots.data ?? []).toHaveLength(0);
    } finally {
      await ownerContext.close();
      await memberContext.close();
    }
  });

  test("shows and removes workbook quarter dates in Board Calendar", async ({ browser, baseURL, testData }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const context = await browser.newContext({
      baseURL, storageState: await createAuthenticatedStorageState(owner.email, owner.password, baseURL),
    });
    testData.registerCleanup({ label: `strategic calendar workbook ${owner.organizationId}`, run: async () => {
      const result = await testData.supabase.from("strategic_workbooks")
        .delete().eq("organization_id", owner.organizationId);
      if (result.error) throw result.error;
    } });
    try {
      const page = await context.newPage();
      await page.goto("/modules/strategic-planning/workbook");
      await page.getByRole("tab", { name: "Template" }).click();
      await page.getByLabel("Plan start date (first day of Year 1, Q1)").fill("2027-01-01");
      await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
      const calendar = new BoardCalendarPage(page);
      await calendar.openNewModuleCalendar();
      await calendar.calendar.selectDate("2027-03-31");
      await expect(calendar.calendar.selectedDatePanel.getByText(/Strategic plan: Year 1 Q1 ends/))
        .toBeVisible();
      await expect(calendar.calendar.selectedDatePanel.getByRole("button", { name: "Delete entry" }))
        .toHaveCount(0);
      await page.goto("/modules/strategic-planning/workbook");
      await page.getByRole("tab", { name: "Template" }).click();
      await page.getByLabel("Plan start date (first day of Year 1, Q1)").fill("");
      await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
      await calendar.openNewModuleCalendar();
      await calendar.calendar.selectDate("2027-03-31");
      await expect(calendar.calendar.selectedDatePanel.getByText(/Strategic plan: Year 1 Q1 ends/))
        .toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test("shows French workbook guidance and a branded French report", async ({ browser, baseURL, testData }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const context = await browser.newContext({
      baseURL, storageState: await createAuthenticatedStorageState(owner.email, owner.password, baseURL),
    });
    testData.registerCleanup({ label: `French strategic workbook ${owner.organizationId}`, run: async () => {
      const { error } = await testData.supabase.from("strategic_workbooks")
        .delete().eq("organization_id", owner.organizationId);
      if (error) throw error;
    } });
    try {
      await context.addCookies([{ name: "olea_locale", value: "fr-CA", url: baseURL }]);
      const page = await context.newPage();
      await page.goto("/modules/strategic-planning/workbook");
      await expect(page.getByRole("heading", { name: "Commencer : configurer votre cahier" })).toBeVisible();
      await expect(page.getByTestId("app-breadcrumbs")).toContainText("Cahier");
      for (const label of ["0. Commencer", "1. Se préparer à planifier",
        "2. Faire le bilan et examiner le contexte", "3. Mission, vision et valeurs",
        "4. Objectifs stratégiques", "5. Priorités clés et mesures", "6. Actions et budget",
        "7. Suivi des progrès", "8. Approbation et communication",
        "9. Mettre en œuvre et faire le suivi"]) {
        await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
      }
      await expect(page.getByRole("tab", { name: "Conseils" })).toBeVisible();
      await page.getByRole("tab", { name: "Modèle" }).click();
      await page.getByLabel("Nom de l'organisme").fill("Centre QA francophone");
      await expect(page.getByRole("button", { name: "Enregistré" })).toBeVisible({ timeout: 30_000 });
      const report = await context.request.get("/api/strategic-planning/workbook/print?scope=current&module=m0&format=html");
      expect(report.status()).toBe(200);
      const html = await report.text();
      expect(html).toContain('<html lang="fr-CA">');
      expect(html).toContain("Centre QA francophone");
      expect(html).toContain("Horizon du plan");
      await page.setViewportSize({ width: 390, height: 844 });
      const mobileSection = page.getByRole("button", { name: "Section du cahier: 0. Commencer" });
      await expect(mobileSection).toBeVisible();
      await mobileSection.click();
      await page.getByRole("dialog").getByRole("button", { name: "1. Se préparer à planifier" }).click();
      await expect(page.getByText("l'organisme est prêt", { exact: false })).toBeVisible();
      await page.getByRole("button", { name: "Section du cahier: 1. Se préparer à planifier" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "2. Faire le bilan et examiner le contexte" }).click();
      await expect(page.getByText("le sondage prêt à l'emploi", { exact: false })).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
