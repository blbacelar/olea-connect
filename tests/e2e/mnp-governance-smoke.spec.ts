import type { Browser, Page } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { evaluationQuestions } from "@/lib/board-evaluation/domain";

import { createAuthenticatedStorageState } from "../fixtures/authenticated.fixture";
import { expect, test } from "../fixtures/test-data.fixture";

type TestAccount = { email: string; password: string };
const visualPath = (name: string) => join(tmpdir(), `olea-mnp-${name}.png`);

async function authenticatedPage(browser: Browser, baseURL: string, account: TestAccount) {
  const context = await browser.newContext({
    baseURL,
    storageState: await createAuthenticatedStorageState(account.email, account.password, baseURL),
  });
  return { context, page: await context.newPage() };
}

async function chooseOption(page: Page, label: string, option: string) {
  const field = page.locator("label").filter({ hasText: label }).getByRole("combobox");
  await field.click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function submitRatings(page: Page, rating: number) {
  await page.goto("/modules/board-evaluation");
  await expect(page.getByRole("heading", { name: /Your board evaluation|Update your ratings/ })).toBeVisible();
  for (const question of evaluationQuestions) {
    await chooseOption(page, question.en, String(rating));
  }
  await page.getByRole("button", { name: /Submit ratings|Update ratings/ }).click();
  await expect(page.getByRole("heading", { name: "Update your ratings" })).toBeVisible();
}

test.describe("@critical MNP governance and sponsor privacy", () => {
  test.beforeAll(() => {
    const dbUrl = process.env.TEST_SUPABASE_URL;
    const appUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3011";
    if (!dbUrl) throw new Error("TEST_SUPABASE_URL is required for this authenticated smoke.");
    const dbHost = new URL(dbUrl).hostname;
    if (!["localhost", "127.0.0.1"].includes(dbHost) &&
      !dbHost.startsWith("tweeaxnawemykedrxsar.")) {
      throw new Error("MNP smoke may only use local Supabase or the development project tweeaxnawemykedrxsar.");
    }
    if (["oleaconnects.com", "www.oleaconnects.com"].includes(new URL(appUrl).hostname)) {
      throw new Error("MNP smoke must not run against the production domain.");
    }
  });

  test("Roots collects three private ratings, then shows only closed aggregates", async ({ browser, baseURL, testData }, testInfo) => {
    test.setTimeout(180_000);
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "roots" });
    const second = await testData.createOrganizationMember(owner);
    const third = await testData.createOrganizationMember(owner);
    const sessions = await Promise.all([owner, second, third].map((account) =>
      authenticatedPage(browser, baseURL, account)));
    try {
      const [ownerPage, secondPage, thirdPage] = sessions.map((session) => session.page);
      await ownerPage.goto("/modules/board-evaluation");
      await expect(ownerPage.getByRole("heading", { name: "Start an annual board evaluation" })).toBeVisible();
      await ownerPage.getByRole("button", { name: "Open evaluation" }).click();
      await expect(ownerPage.getByRole("heading", { name: `${new Date().getUTCFullYear()} board evaluation` })).toBeVisible({ timeout: 30_000 });
      await testInfo.attach("board-evaluation-open", { body: await ownerPage.screenshot({ path: visualPath("board-open"), fullPage: true }), contentType: "image/png" });

      await submitRatings(ownerPage, 1);
      await submitRatings(secondPage, 3);
      await ownerPage.reload();
      await expect(ownerPage.getByText("At least three board members must respond before you can close the evaluation.")).toBeVisible();
      await expect(ownerPage.getByRole("button", { name: "Close evaluation and show results" })).toHaveCount(0);
      await submitRatings(thirdPage, 5);

      await ownerPage.reload();
      await expect(ownerPage.getByText("3 board members have responded.")).toBeVisible();
      await expect(ownerPage.getByText("Aggregate results appear after the evaluation closes with at least three responses.")).toBeVisible();
      await expect(ownerPage.getByText("3.0 / 5")).toHaveCount(0);
      await ownerPage.getByRole("button", { name: "Close evaluation and show results" }).click();
      await expect(ownerPage.getByRole("dialog")).toContainText("This cannot be undone.");
      await ownerPage.getByRole("dialog").getByRole("button", { name: "Close evaluation", exact: true }).click();
      await expect(ownerPage.getByText("Closed", { exact: true })).toBeVisible();
      await ownerPage.reload();
      await expect(ownerPage.getByText("3.0 / 5")).toHaveCount(evaluationQuestions.length);
      await expect(ownerPage.getByRole("button", { name: "Update ratings" })).toHaveCount(0);
      await expect(ownerPage.getByRole("spinbutton", { name: "Evaluation year" }))
        .toHaveValue(String(new Date().getUTCFullYear() + 1));
      await testInfo.attach("board-evaluation-closed", { body: await ownerPage.screenshot({ path: visualPath("board-closed"), fullPage: true }), contentType: "image/png" });
      await ownerPage.setViewportSize({ width: 390, height: 844 });
      await expect(ownerPage.getByTestId("app-sidebar")).toBeHidden();
      await expect(ownerPage.getByTestId("app-main").locator("..")).toHaveCSS("margin-left", "0px");
      await testInfo.attach("board-evaluation-mobile", { body: await ownerPage.screenshot({ path: visualPath("board-mobile"), fullPage: true }), contentType: "image/png" });

      await secondPage.reload();
      await expect(secondPage.getByText("3.0 / 5")).toHaveCount(evaluationQuestions.length);
      await expect(secondPage.getByRole("button", { name: "Update ratings" })).toHaveCount(0);
      const { data: responses, error } = await testData.supabase
        .from("board_evaluation_responses")
        .select("id, respondent_id")
        .eq("organization_id", owner.organizationId);
      expect(error).toBeNull();
      expect(responses).toHaveLength(3);
    } finally {
      await Promise.all(sessions.map((session) => session.context.close()));
    }
  });

  test("Canopy saves a board-approved plan and a measurable goal; ordinary members read only", async ({ browser, baseURL, testData }, testInfo) => {
    test.setTimeout(120_000);
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const member = await testData.createOrganizationMember(owner);
    const ownerSession = await authenticatedPage(browser, baseURL, owner);
    const memberSession = await authenticatedPage(browser, baseURL, member);
    try {
      const page = ownerSession.page;
      await page.goto("/modules/strategic-planning");
      await expect(page.getByRole("heading", { name: "Strategic Planning" })).toBeVisible();
      const title = `Board priorities ${owner.marker}`;
      await page.getByLabel("Plan title").fill(title);
      await page.getByLabel("Mission").fill("Serve local communities effectively.");
      await page.getByLabel("Vision").fill("Every community has strong governance.");
      await page.getByLabel("Board approval date").fill(new Date().toISOString().slice(0, 10));
      await chooseOption(page, "Status", "Board approved");
      await page.getByRole("button", { name: "Create plan" }).click();
      await expect(page.getByRole("button", { name: "Save plan" })).toBeVisible();

      await page.getByRole("button", { name: "Add goal" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Priority or goal").fill("Improve board succession");
      await dialog.getByLabel("How progress will be measured").fill("Fill vacancies within 90 days");
      await dialog.getByLabel("Intended outcome").fill("A complete, approved succession plan");
      await dialog.getByLabel("Owner").fill("Governance committee");
      await dialog.getByRole("button", { name: "Add goal" }).click();
      await expect.poll(async () => {
        const { data, error } = await testData.supabase.from("strategic_goals")
          .select("id").eq("organization_id", owner.organizationId)
          .eq("title", "Improve board succession").maybeSingle();
        if (error) throw error;
        return Boolean(data);
      }, { timeout: 30_000, message: "Strategic goal must persist before navigation" }).toBe(true);
      await page.reload();
      await expect(page.getByRole("heading", { name: "Improve board succession" })).toBeVisible();
      await testInfo.attach("strategic-planning", { body: await page.screenshot({ path: visualPath("strategic-planning"), fullPage: true }), contentType: "image/png" });
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByTestId("app-sidebar")).toBeHidden();
      await expect(page.getByTestId("app-main").locator("..")).toHaveCSS("margin-left", "0px");
      await testInfo.attach("strategic-planning-mobile", { body: await page.screenshot({ path: visualPath("strategic-planning-mobile"), fullPage: true }), contentType: "image/png" });

      await memberSession.page.goto("/modules/strategic-planning");
      await expect(memberSession.page.getByText(title)).toBeVisible();
      await expect(memberSession.page.getByRole("heading", { name: "Improve board succession" })).toBeVisible();
      await expect(memberSession.page.getByRole("button", { name: "Edit goal" })).toHaveCount(0);
      await expect(memberSession.page.getByRole("button", { name: "Add goal" })).toHaveCount(0);
      const { data: plan, error } = await testData.supabase.from("strategic_plans")
        .select("status, approved_on").eq("organization_id", owner.organizationId).single();
      expect(error).toBeNull();
      expect(plan?.status).toBe("active");
      expect(plan?.approved_on).toBe(new Date().toISOString().slice(0, 10));
    } finally {
      await Promise.all([ownerSession.context.close(), memberSession.context.close()]);
    }
  });

  test("Seedling receives membership guidance instead of governance forms", async ({ browser, baseURL, testData }) => {
    test.setTimeout(90_000);
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const seedling = await testData.createOrganizationOwner({ activeSubscription: true, planId: "seedling" });
    const session = await authenticatedPage(browser, baseURL, seedling);
    try {
      await session.page.goto("/modules/board-evaluation");
      await expect(session.page.getByText("Board Evaluation is included with Roots and Canopy or an active add-on.")).toBeVisible();
      await expect(session.page.getByRole("button", { name: "Open evaluation" })).toHaveCount(0);
      await expect(session.page.getByRole("link", { name: "View membership" })).toBeVisible();
      await session.page.goto("/modules/strategic-planning");
      await expect(session.page.getByText("Strategic Planning is included with Canopy or an active add-on.")).toBeVisible();
      await expect(session.page.getByRole("button", { name: "Create plan" })).toHaveCount(0);
      await expect(session.page.getByRole("link", { name: "View membership" })).toBeVisible();
    } finally {
      await session.context.close();
    }
  });

  test("ED Review denies Roots without add-on and admits Canopy to board-chair setup", async ({ browser, baseURL, testData }) => {
    test.setTimeout(90_000);
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const roots = await testData.createOrganizationOwner({ activeSubscription: true, planId: "roots" });
    const canopy = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const rootsSession = await authenticatedPage(browser, baseURL, roots);
    const canopySession = await authenticatedPage(browser, baseURL, canopy);
    try {
      await rootsSession.page.goto("/modules/ed-review");
      await expect(rootsSession.page.getByRole("heading", { name: "This review is restricted" })).toBeVisible();
      await expect(rootsSession.page.getByText("ED Review requires an active Canopy membership or ED Review add-on.", { exact: false })).toBeVisible();
      await canopySession.page.goto("/modules/ed-review");
      await expect(canopySession.page.getByRole("heading", { name: "ED/CEO annual review" })).toBeVisible();
      await expect(canopySession.page.getByText("ED Review requires an active Canopy membership or ED Review add-on.", { exact: false })).toHaveCount(0);
    } finally {
      await Promise.all([rootsSession.context.close(), canopySession.context.close()]);
    }
  });

  test("finance activates a funded Seedling year through the sponsor screen", async ({ browser, baseURL, testData }, testInfo) => {
    test.setTimeout(120_000);
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const finance = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    await testData.assignPlatformRole(finance.userId, "finance_admin");
    const sponsorName = `MNP finance ${finance.marker}`;
    const { data: sponsor, error: sponsorError } = await testData.supabase.from("sponsors")
      .insert({ name: sponsorName, slug: `mnp-finance-${finance.marker}`, status: "active" })
      .select("id").single();
    if (sponsorError) throw sponsorError;
    testData.registerCleanup({ label: `sponsor ${sponsor.id}`, run: async () => {
      const { error } = await testData.supabase.from("sponsors").delete().eq("id", sponsor.id);
      if (error) throw error;
    } });
    const startsOn = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const endsOn = new Date(Date.now() + 370 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: sponsorship, error: termError } = await testData.supabase.from("sponsorships")
      .insert({ sponsor_id: sponsor.id, package_id: "seedkeeper", status: "active",
        starts_on: startsOn, ends_on: endsOn, contract_amount_cents: 200000,
        committed_contribution_cents: 0 })
      .select("id").single();
    if (termError) throw termError;
    const { error: contributionError } = await testData.supabase.from("sponsor_contributions")
      .insert({ sponsorship_id: sponsorship.id, status: "received", amount_cents: 200000 });
    if (contributionError) throw contributionError;
    const recipient = await testData.createOrganizationOwner();
    const { error: budgetError } = await testData.supabase.from("organizations")
      .update({ annual_budget_range: "250k-500k" }).eq("id", recipient.organizationId);
    if (budgetError) throw budgetError;

    const session = await authenticatedPage(browser, baseURL, finance);
    const browserErrors: string[] = [];
    session.page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.stack ?? error.message}`));
    session.page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
    });
    session.page.on("response", (response) => {
      if (response.status() >= 400 && response.url().startsWith(baseURL)) {
        browserErrors.push(`http ${response.status()}: ${response.url()}`);
      }
    });
    try {
      await session.page.goto("/sponsors");
      await session.page.getByRole("tab", { name: "Funded boards" }).click();
      const form = session.page.getByRole("tabpanel", { name: "Funded boards" }).locator("form");
      await form.getByRole("combobox", { name: "Active sponsorship" }).click({ timeout: 10_000 });
      await session.page.getByRole("option", { name: sponsorName, exact: false }).click();
      await form.getByRole("combobox", { name: "Membership tier" }).click({ timeout: 10_000 });
      await session.page.getByRole("option", { name: "Seedling", exact: false }).click();
      await form.getByRole("combobox", { name: "Eligible organization" }).click({ timeout: 10_000 });
      await session.page.getByRole("option", { name: recipient.organizationName, exact: false }).click();
      await form.getByLabel("Confirmed annual budget (CAD)").fill("550000");
      await form.getByRole("button", { name: "Review activation" }).click();
      await expect(form.getByRole("alert")).toContainText("confirmed budget must match");
      await form.getByLabel("Confirmed annual budget (CAD)").fill("450000");
      await testInfo.attach("sponsor-finance-review", { body: await session.page.screenshot({ path: visualPath("finance-review"), fullPage: true }), contentType: "image/png" });
      await form.getByRole("button", { name: "Review activation" }).click();
      const dialog = session.page.getByRole("dialog", { name: "Activate this funded year?" });
      await expect(dialog).toContainText(recipient.organizationName);
      await expect(dialog).toContainText("$450,000");
      await testInfo.attach("sponsor-finance-confirmation", { body: await session.page.screenshot({ path: visualPath("finance-confirmation"), fullPage: true }), contentType: "image/png" });
      await dialog.getByRole("button", { name: "Activate funded year" }).click();
      await expect(session.page).toHaveURL(/\/sponsors\?admin=funding&placement=[0-9a-f-]{36}/, { timeout: 20_000 });
      if (await session.page.getByRole("heading", { name: "We could not load this workspace" }).count()) {
        throw new Error(`Sponsors workspace failed after activation: ${browserErrors.join(" | ") || "no browser error captured"}`);
      }
      await expect(session.page.getByRole("tab", { name: "Funded boards" })).toHaveAttribute("data-state", "active", { timeout: 20_000 });
      await expect(session.page.getByRole("status")).toContainText("One full year of funded membership is active.");
      await expect(session.page.getByText("1 of 2 boards placed")).toBeVisible();
      await expect(session.page.getByText(recipient.organizationName).first()).toBeVisible();
      await expect(form.getByRole("combobox", { name: "Active sponsorship" })).toContainText("Choose sponsorship");
      await expect(form.getByLabel("Confirmed annual budget (CAD)")).toHaveValue("");
      await testInfo.attach("sponsor-finance-activated", { body: await session.page.screenshot({ path: visualPath("finance-activated"), fullPage: true }), contentType: "image/png" });
      await session.page.setViewportSize({ width: 390, height: 844 });
      await expect(session.page.getByTestId("app-sidebar")).toBeHidden();
      await expect(session.page.getByTestId("app-main").locator("..")).toHaveCSS("margin-left", "0px");
      await testInfo.attach("sponsor-finance-mobile", { body: await session.page.screenshot({ path: visualPath("finance-mobile"), fullPage: true }), contentType: "image/png" });

      const { data: placement, error: placementError } = await testData.supabase
        .from("sponsored_memberships")
        .select("id, plan_id, status, allocation_cents, subscription_id, ends_at")
        .eq("sponsorship_id", sponsorship.id)
        .eq("organization_id", recipient.organizationId)
        .single();
      expect(placementError).toBeNull();
      expect(placement).toMatchObject({ plan_id: "seedling", status: "active", allocation_cents: 100000 });
      expect(new URL(session.page.url()).searchParams.get("placement")).toBe(placement!.id);
      expect(new Date(placement!.ends_at).getTime()).toBeGreaterThan(Date.now() + 360 * 24 * 60 * 60 * 1000);
      const { data: subscription, error: subscriptionError } = await testData.supabase
        .from("subscriptions").select("provider, plan_id, status, metadata")
        .eq("id", placement!.subscription_id).single();
      expect(subscriptionError).toBeNull();
      expect(subscription).toMatchObject({ provider: "manual", plan_id: "seedling", status: "active",
        metadata: { funding_source: "sponsorship" } });
      expect(browserErrors.filter((item) => item.startsWith("pageerror:") || item.includes("TypeError:"))).toEqual([]);
    } finally {
      await session.context.close();
    }
  });

  test("sponsor contact sees funded progress without recipient identity or activity", async ({ browser, baseURL, testData }, testInfo) => {
    test.setTimeout(120_000);
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const contact = await testData.createOrganizationOwner({ activeSubscription: true, planId: "seedling" });
    const sponsorName = `MNP privacy ${contact.marker}`;
    const { data: sponsor, error: sponsorError } = await testData.supabase.from("sponsors")
      .insert({ name: sponsorName, slug: `mnp-privacy-${contact.marker}`, status: "active" })
      .select("id").single();
    if (sponsorError) throw sponsorError;
    testData.registerCleanup({ label: `sponsor ${sponsor.id}`, run: async () => {
      const { error } = await testData.supabase.from("sponsors").delete().eq("id", sponsor.id);
      if (error) throw error;
    } });
    const { error: contactError } = await testData.supabase.from("sponsor_contacts")
      .insert({ sponsor_id: sponsor.id, full_name: contact.fullName, email: contact.email, is_primary: true });
    if (contactError) throw contactError;
    const startsOn = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const endsOn = new Date(Date.now() + 370 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: sponsorship, error: termError } = await testData.supabase.from("sponsorships")
      .insert({ sponsor_id: sponsor.id, package_id: "seedkeeper", status: "active",
        starts_on: startsOn, ends_on: endsOn, contract_amount_cents: 200000,
        committed_contribution_cents: 0 })
      .select("id").single();
    if (termError) throw termError;
    const { error: contributionError } = await testData.supabase.from("sponsor_contributions")
      .insert({ sponsorship_id: sponsorship.id, status: "received", amount_cents: 200000 });
    if (contributionError) throw contributionError;
    const recipient = await testData.createOrganizationOwner();
    const { error: placementError } = await testData.supabase.rpc("activate_sponsored_membership", {
      p_sponsorship_id: sponsorship.id,
      p_organization_id: recipient.organizationId,
      p_plan_id: "seedling",
      p_verified_budget_cents: 45000000,
      p_created_by: null,
    });
    if (placementError) throw placementError;

    const session = await authenticatedPage(browser, baseURL, contact);
    try {
      await session.page.goto("/sponsors");
      await expect(session.page.getByRole("heading", { name: "Funded board progress" })).toBeVisible();
      await expect(session.page.getByText(sponsorName).first()).toBeVisible();
      await expect(session.page.getByText("1 of 2 boards placed")).toBeVisible();
      await expect(session.page.getByText("The annual aggregate impact report will be shared after review and approval.")).toBeVisible();
      await expect(session.page.getByText("Tracked activity during funded years")).toHaveCount(0);
      expect(await session.page.content()).not.toContain(recipient.organizationName);
      await testInfo.attach("sponsor-contact-private-progress", { body: await session.page.screenshot({ path: visualPath("sponsor-contact"), fullPage: true }), contentType: "image/png" });
      await session.page.setViewportSize({ width: 390, height: 844 });
      await expect(session.page.getByTestId("app-sidebar")).toBeHidden();
      await expect(session.page.getByTestId("app-main").locator("..")).toHaveCSS("margin-left", "0px");
      await testInfo.attach("sponsor-contact-mobile", { body: await session.page.screenshot({ path: visualPath("sponsor-contact-mobile"), fullPage: true }), contentType: "image/png" });
    } finally {
      await session.context.close();
    }
  });
});
