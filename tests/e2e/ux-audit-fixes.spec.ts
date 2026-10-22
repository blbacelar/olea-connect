import { expect, test as publicTest } from "@playwright/test";

import { test as authenticatedTest } from "../fixtures/authenticated.fixture";
import { createAuthenticatedPage } from "../support/auth-session";

publicTest("local public pages do not load a deployment-only analytics script", async ({ page }) => {
  publicTest.skip(Boolean(process.env.VERCEL_ENV), "Analytics loads on Vercel deployments.");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/sponsorship", { waitUntil: "networkidle" });
  await expect(page.locator('script[src*="/_vercel/insights/script.js"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const width of [320, 390, 430]) {
  publicTest(`public mobile header keeps signup action visible at ${width}px in both locales`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/sponsorship");

    for (const locale of ["en-CA", "fr-CA"]) {
      if (locale === "fr-CA") {
        await page.locator('[data-testid="locale-selector"]:visible').click();
        await page.getByRole("option", { name: "Français" }).click();
        await expect(page.locator("html")).toHaveAttribute("lang", "fr-CA");
      }
      for (const route of ["/sponsorship", "/referrals"]) {
        await page.goto(route);
        const signup = page.locator('header a[href="/signup"]').last();
        await expect(signup).toBeInViewport();
        const overflow = await page.evaluate(() => ({
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
          elements: [...document.querySelectorAll("body *")]
            .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
            .slice(0, 5)
            .map((element) => ({ tag: element.tagName, className: element.className, text: element.textContent?.slice(0, 50) })),
        }));
        expect(overflow.document, JSON.stringify({ route, locale, overflow })).toBeLessThanOrEqual(width);
      }
    }
  });
}

publicTest("signup account shows selected plan and returns to its chooser", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/signup/account?tier=seedling&billing=quarterly");
  await expect(page.getByRole("main").getByText("Selected plan")).toBeVisible();
  await expect(page.getByRole("main").getByText(/Seedling.*quarter/i)).toBeVisible();
  await page.getByRole("main").getByRole("button", { name: "Change plan" }).click();
  await expect(page).toHaveURL(/\/signup\?tier=seedling/);
  await expect(page.locator('button[aria-pressed="true"]')).toContainText("Seedling");
});

publicTest("sponsorship booking label matches its destination", async ({ page }) => {
  await page.goto("/sponsorship");
  const action = page.getByTestId("sponsorship-booking-cta").first();
  const href = await action.getAttribute("href");
  if (href?.startsWith("mailto:")) {
    await expect(action).toContainText("Email");
    await expect(action).toHaveAttribute("aria-label", /Email/);
  } else {
    await expect(action).toContainText("Book a conversation");
    await expect(action).toHaveAttribute("href", /^https:\/\//);
  }
});

authenticatedTest("Help has a working contact and What's new is absent from the menu", async ({ page, authenticatedMember }) => {
  void authenticatedMember;
  await page.goto("/help");
  await expect(page.getByRole("heading", { name: "Common questions" })).toBeVisible();
  await expect(page.locator('a[href^="mailto:hello@olivesocialimpact.com"]')).toBeVisible();
  await expect(page.getByRole("link", { name: "What's new" })).toHaveCount(0);
  await page.locator('[data-testid="locale-selector"]:visible').click();
  await page.getByRole("option", { name: "Français" }).click();
  await expect(page.getByRole("heading", { name: "Questions fréquentes" })).toBeVisible();
});

authenticatedTest("mobile module picker switches board calendar, recruitment, and grant sections", async ({ page, authenticatedMember }) => {
  void authenticatedMember;
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/modules/board-calendar");
  await expect(page.getByRole("button", { name: "Add calendar entry" })).toBeVisible();
  await page.getByRole("button", { name: "Add calendar entry" }).click();
  await expect(page.getByRole("dialog", { name: "Add calendar entry" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByLabel("Board Calendar section").click();
  await page.getByRole("option", { name: "Settings" }).click();
  await expect(page.getByLabel("Board Calendar section")).toContainText("Settings");

  await page.goto("/modules/board-recruitment");
  await page.getByLabel("Board Recruitment section").click();
  await page.getByRole("option", { name: "Board Report" }).click();
  await expect(page).toHaveURL(/tab=report/);

  await page.goto("/modules/grant-platform");
  await expect(page.getByRole("button", { name: "Add Grant" })).toBeInViewport();
  await page.getByLabel("Grant Platform section").click();
  await page.getByRole("option", { name: "Settings" }).click();
  await expect(page).toHaveURL(/tab=settings/);
});

authenticatedTest("mobile KPI and ED Review pickers reach later sections", async ({ page, authenticatedMember, testData, browser, baseURL }, testInfo) => {
  void authenticatedMember;
  testInfo.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/modules/kpi-dashboard");
  await page.getByLabel("Financial year end").fill("2026-12-31");
  await page.getByRole("button", { name: "Save setup" }).click();
  await page.waitForURL(/tab=setup/);
  await page.getByRole("combobox", { name: "KPI Dashboard section" }).click();
  await page.getByRole("option", { name: "Settings" }).click();
  await expect(page).toHaveURL(/tab=settings/);

  if (!baseURL) throw new Error("Playwright baseURL is required.");
  const canopyOwner = await testData.createOrganizationOwner({
    activeSubscription: true,
    planId: "canopy",
  });
  const canopySession = await createAuthenticatedPage(
    browser,
    baseURL,
    canopyOwner.email,
    canopyOwner.password,
  );
  try {
    await canopySession.page.setViewportSize({ width: 390, height: 844 });
    await canopySession.page.goto("/modules/ed-review");
    await canopySession.page.getByLabel("ED Review section").click();
    await canopySession.page.getByRole("option", { name: "Access & audit" }).click();
    await expect(canopySession.page).toHaveURL(/tab=access/);
  } finally {
    await canopySession.context.close();
  }
});

authenticatedTest("mobile section picker follows the French locale", async ({ page, authenticatedMember }) => {
  void authenticatedMember;
  await page.goto("/help");
  await page.locator('[data-testid="locale-selector"]:visible').click();
  await page.getByRole("option", { name: "Français" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr-CA");
  await expect(page.locator('[data-testid="locale-selector"]:visible')).toHaveAttribute("aria-busy", "false");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/modules/board-calendar");
  const picker = page.getByRole("combobox", { name: "Section du calendrier du conseil" });
  await expect(picker).toBeVisible();
  await picker.click();
  await page.getByRole("option", { name: "Paramètres" }).click();
  await expect(picker).toContainText("Paramètres");
});
