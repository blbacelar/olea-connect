import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test as publicTest } from "@playwright/test";

import { createAuthenticatedStorageState, test as authenticatedTest } from "../fixtures/authenticated.fixture";

const outputDirectory = process.env.OLEA_UX_AUDIT_OUTPUT_DIR ??
  path.join(process.cwd(), "test-results", "ux-route-audit");

const publicRoutes = [
  "/", "/sponsorship", "/referrals", "/signup", "/signup/account",
  "/signup/payment", "/signup/success", "/login", "/reset-password",
  "/verify-email", "/auth/confirm", "/legal/terms", "/legal/privacy",
  "/legal/data-ownership", "/legal/confidentiality",
  "/update-password", "/team/invitations/accept?token=invalid",
  "/modules/board-recruitment/survey/invalid",
  "/modules/ed-review/survey/invalid",
  "/modules/ed-review/survey/unavailable",
];

const authenticatedRoutes = [
  "/dashboard", "/community", "/consulting", "/grants", "/help",
  "/modules/accreditation", "/modules/board-calendar",
  "/modules/board-recruitment", "/modules/ed-review",
  "/modules/grant-platform", "/modules/kpi-dashboard",
  "/onboarding/brand-setup", "/onboarding/template-selection",
  "/referrals/dashboard", "/settings/brand", "/settings/integrations",
  "/settings/referrals", "/settings/users", "/sponsors", "/subscription",
  "/team", "/templates", "/templates/board-self-evaluation",
  "/templates/board-calendar-operational-workflow", "/templates/grant-platform",
  "/users", "/webinars", "/webinars/manage", "/webinars/new", "/whats-new",
];

type AuditRow = {
  requested: string;
  actual: string;
  viewport: string;
  heading: string;
  title: string;
  tabs: string[];
  dialogs: number;
  horizontalOverflow: number;
  errors: string[];
  screenshot?: string;
};

async function visitRoutes(
  page: import("@playwright/test").Page,
  routes: string[],
  group: string,
) {
  const rows: AuditRow[] = [];
  await mkdir(outputDirectory, { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    for (const requested of routes) {
      const errors: string[] = [];
      const onPageError = (error: Error) => errors.push(error.message.slice(0, 200));
      page.on("pageerror", onPageError);
      try {
        await page.goto(requested, { waitUntil: "domcontentloaded", timeout: 25_000 });
        await page.locator("body").waitFor({ state: "visible", timeout: 10_000 });
        await page.getByLabel("Loading workspace data").waitFor({ state: "hidden", timeout: 15_000 });
        await page.getByText("Loading template", { exact: true }).waitFor({ state: "hidden", timeout: 15_000 });
        if (await page.locator("h1").count() === 0) {
          await page.locator("h1").first().waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
        }
        const state = await page.evaluate(() => ({
          heading: document.querySelector("h1")?.textContent?.trim() ?? "",
          tabs: [...document.querySelectorAll('[role="tab"]')]
            .filter((element) => element.getBoundingClientRect().width > 0)
            .map((element) => element.textContent?.trim() ?? ""),
          dialogs: document.querySelectorAll('[role="dialog"]').length,
          horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        }));
        const screenshot = `${group}-${width}-${requested.replace(/[^a-z0-9]+/gi, "-") || "home"}.png`;
        await page.screenshot({ path: path.join(outputDirectory, screenshot) });
        rows.push({
          requested, actual: new URL(page.url()).pathname,
          viewport: String(width), title: await page.title(), errors, screenshot,
          ...state,
        });
      } catch (error) {
        rows.push({
          requested, actual: new URL(page.url()).pathname,
          viewport: String(width), title: "", heading: "", tabs: [], dialogs: 0,
          horizontalOverflow: 0,
          errors: [...errors, error instanceof Error ? error.message.slice(0, 200) : String(error)],
        });
      } finally {
        page.off("pageerror", onPageError);
      }
    }
  }
  await writeFile(path.join(outputDirectory, `${group}.json`), JSON.stringify(rows, null, 2));
  console.log(`${group}: ${rows.length} route/viewport observations written to ${outputDirectory}`);
}

publicTest("public UX route inventory", async ({ page }) => {
  publicTest.setTimeout(600_000);
  await visitRoutes(page, publicRoutes, "public");
});

authenticatedTest("authenticated UX route inventory", async ({ page, authenticatedMember }) => {
  authenticatedTest.setTimeout(900_000);
  void authenticatedMember;
  await visitRoutes(page, authenticatedRoutes, "authenticated");
});

authenticatedTest("module tab UX inventory", async ({ page, authenticatedMember }) => {
  authenticatedTest.setTimeout(900_000);
  void authenticatedMember;
  const modules = [
    "/modules/accreditation", "/modules/board-calendar",
    "/modules/board-recruitment", "/modules/ed-review",
    "/modules/grant-platform", "/modules/kpi-dashboard",
  ];
  const rows: Array<{
    module: string; tab: string; actual: string; heading: string;
    selected: boolean; buttons: string[]; error?: string;
  }> = [];
  await mkdir(outputDirectory, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const modulePath of modules) {
    await page.goto(modulePath, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Loading workspace data").waitFor({ state: "hidden", timeout: 15_000 });
    if (modulePath.endsWith("accreditation")) {
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(page.getByRole("tab", { name: "Dashboard" })).toHaveAttribute("aria-selected", "true", { timeout: 30_000 });
    }
    if (modulePath.endsWith("kpi-dashboard")) {
      await page.getByLabel("Financial year end").fill("2026-12-31");
      await page.getByRole("button", { name: "Save setup" }).click();
      await page.waitForURL(/tab=setup/);
    }
    const tabLabels = await page.locator('[role="tab"]').allTextContents();
    const kpiLinks = modulePath.endsWith("kpi-dashboard")
      ? await page.locator('a[href*="tab="]').allTextContents()
      : [];
    for (const tab of [...new Set([...tabLabels, ...kpiLinks].map((label) => label.trim()).filter(Boolean))]) {
      try {
        const tabControl = tabLabels.includes(tab)
          ? page.getByRole("tab", { name: tab, exact: true }).first()
          : page.locator('a[href*="tab="]').filter({ hasText: tab }).first();
        await tabControl.click({ timeout: 10_000 });
        if (tabLabels.includes(tab)) {
          await page.waitForFunction((label) => {
            const tabs = [...document.querySelectorAll('[role="tab"]')];
            return tabs.some((element) => element.textContent?.trim() === label &&
              element.getAttribute("aria-selected") === "true");
          }, tab, { timeout: 10_000 });
        } else {
          await expect(tabControl).toHaveAttribute("aria-current", "page", { timeout: 10_000 });
        }
        await page.getByLabel("Loading workspace data").waitFor({ state: "hidden", timeout: 15_000 });
        const state = await page.evaluate(() => ({
          heading: document.querySelector("main h2")?.textContent?.trim() ?? "",
          buttons: [...document.querySelectorAll("main button")]
            .filter((element) => element.getBoundingClientRect().width > 0)
            .slice(0, 20).map((element) => element.textContent?.trim() ?? ""),
        }));
        await page.screenshot({ path: path.join(outputDirectory,
          `tab-${modulePath.split("/").pop()}-${tab.replace(/[^a-z0-9]+/gi, "-")}.png`) });
        rows.push({ module: modulePath, tab, actual: new URL(page.url()).pathname + new URL(page.url()).search,
          selected: await tabControl.getAttribute("aria-selected") === "true" ||
            await tabControl.getAttribute("aria-current") === "page", ...state });
      } catch (error) {
        rows.push({ module: modulePath, tab, actual: new URL(page.url()).pathname,
          heading: "", selected: false, buttons: [], error: error instanceof Error ? error.message.slice(0, 240) : String(error) });
      }
    }
  }
  await writeFile(path.join(outputDirectory, "tabs.json"), JSON.stringify(rows, null, 2));
  console.log(`module tabs: ${rows.length} observations written to ${outputDirectory}`);
  expect(rows.filter((row) => !row.selected || row.error), JSON.stringify(rows, null, 2)).toEqual([]);
});

authenticatedTest("privileged and seeded detail UX inventory", async ({ page, testData, authenticatedMember }) => {
  authenticatedTest.setTimeout(300_000);
  await testData.assignPlatformRole(authenticatedMember.userId, "super_admin");
  const event = await testData.createEvent({ accessPlanIds: ["roots"] });
  await visitRoutes(page, [
    "/settings/integrations", "/settings/referrals", "/settings/users",
    "/webinars/manage", "/webinars/new", `/webinars/${event.slug}`,
  ], "privileged");
});

authenticatedTest("Seedling-only onboarding UX inventory", async ({ page, testData, baseURL }) => {
  if (!baseURL) throw new Error("Playwright baseURL is required.");
  const seedling = await testData.createOrganizationOwner({ activeSubscription: true, planId: "seedling" });
  const state = await createAuthenticatedStorageState(seedling.email, seedling.password, baseURL);
  await page.context().clearCookies();
  await page.context().addCookies(state.cookies);
  await visitRoutes(page, ["/onboarding/template-selection"], "seedling");
});

authenticatedTest("modal close returns to previous module tab", async ({ page, authenticatedMember }) => {
  authenticatedTest.setTimeout(120_000);
  void authenticatedMember;
  const cases = [
    { route: "/modules/board-calendar", trigger: "Add meeting" },
    { route: "/modules/board-recruitment?tab=terms", trigger: "Add member" },
    { route: "/modules/grant-platform", trigger: "Add Grant" },
  ];
  const rows: Array<{ route: string; trigger: string; width: number; opened: boolean; returned: boolean; error?: string }> = [];
  for (const width of [1440, 390]) for (const item of cases) {
    try {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.goto(item.route);
      await page.getByLabel("Loading workspace data").waitFor({ state: "hidden", timeout: 15_000 });
      await page.getByRole("button", { name: item.trigger, exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
      await page.screenshot({ path: path.join(outputDirectory,
        `modal-${width}-${item.trigger.replace(/[^a-z0-9]+/gi, "-")}.png`) });
      await page.keyboard.press("Escape");
      const returned = await page.getByRole("dialog").isHidden() &&
        new URL(page.url()).pathname + new URL(page.url()).search === item.route;
      rows.push({ ...item, width, opened: true, returned });
    } catch (error) {
      rows.push({ ...item, width, opened: false, returned: false,
        error: error instanceof Error ? error.message.slice(0, 240) : String(error) });
    }
  }
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, "modals.json"), JSON.stringify(rows, null, 2));
  expect(rows.every((row) => row.opened && row.returned), JSON.stringify(rows, null, 2)).toBe(true);
});
