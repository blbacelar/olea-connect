import { expect, test as base } from "@playwright/test";

import { test as testWithData } from "../fixtures/test-data.fixture";
import { createAuthenticatedPage } from "../support/auth-session";

const STEP_PAUSE_MS = 3_000;

base.setTimeout(60_000);
testWithData.setTimeout(90_000);

async function pauseForReview() {
  await new Promise((resolve) => setTimeout(resolve, STEP_PAUSE_MS));
}

base.describe("native community visual walkthrough", () => {
  base("shows unauthenticated users being redirected to login", async ({ page }) => {
    await page.goto("/community");
    await expect(page).toHaveURL("/login?next=%2Fcommunity");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await pauseForReview();
  });
});

testWithData.describe("native community authenticated visual walkthrough", () => {
  testWithData("shows dashboard entry, community content, and manager controls", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    await testData.assignCommunityManager(member);
    await testData.createCommunityPost(member, {
      title: "Roots peer governance question",
      body: "How are other Roots members preparing board packages?",
      kind: "discussion",
      pinned: true,
      spaceSlug: "general",
    });
    await testData.createCommunityEvent(member, {
      title: "Roots live governance call",
      summary: "A Zoom-linked working session for Roots members.",
      spaceSlug: "webinars-events",
      zoomUrl: "https://zoom.us/j/123456789",
    });

    const { context, page } = await createAuthenticatedPage(
      browser,
      baseURL,
      member.email,
      member.password,
    );

    try {
      await page.setViewportSize({ width: 1440, height: 900 });

      await page.goto("/dashboard");
      await expect(
        page.getByRole("heading", { name: /good (morning|afternoon|evening), qa/i }),
      ).toBeVisible();
      await pauseForReview();

      await page.getByRole("link", { name: "Community" }).click();
      await expect(page).toHaveURL("/community");
      await expect(
        page.getByRole("heading", { name: "Olea Connects Community" }),
      ).toBeVisible();
      await pauseForReview();

      await expect(page.getByText("# General", { exact: true })).toBeVisible();
      await expect(page.getByText("# Roots Members", { exact: true })).toBeVisible();
      await expect(
        page.getByText("# Seedling Members", { exact: true }),
      ).toHaveCount(0);
      await pauseForReview();

      await expect(
        page.getByRole("heading", { name: "Roots peer governance question" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Roots live governance call" }),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "Join on Zoom" })).toHaveAttribute(
        "href",
        "https://zoom.us/j/123456789",
      );
      await pauseForReview();

      await page.mouse.wheel(0, 700);
      await expect(page.getByText("Community manager", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Create post" })).toBeEnabled();
      await pauseForReview();
    } finally {
      await context.close();
    }
  });

  testWithData("shows canceled members being blocked by the billing guard", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      planId: "roots",
      subscriptionStatus: "canceled",
    });
    const { context, page } = await createAuthenticatedPage(
      browser,
      baseURL,
      member.email,
      member.password,
    );

    try {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/community");
      await expect(page).toHaveURL("/subscription?billing=required");
      await expect(
        page.getByText(/membership needs attention|billing setup is incomplete/i),
      ).toBeVisible();
      await pauseForReview();
    } finally {
      await context.close();
    }
  });
});
