import {
  createAuthenticatedStorageState,
  expect,
  test,
} from "../fixtures/authenticated.fixture";

test.describe("@critical @member authenticated access", () => {
  test("keeps the app header brand compact on small screens", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 640, height: 844 });
    await page.goto("/dashboard");

    const compactLogo = page.getByRole("link", {
      name: "Olea Connects dashboard",
    });
    await expect(compactLogo).toBeVisible();
    await expect(page.getByLabel("Open navigation")).toBeVisible();

    const logoWidth = await compactLogo.evaluate(
      (element) => element.getBoundingClientRect().width,
    );
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );

    expect(logoWidth).toBeLessThan(60);
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("opens protected pages with an API-created session", async ({
    page,
    authenticatedMember,
  }) => {
    await page.goto("/subscription");

    await expect(page).toHaveURL("/subscription");
    await expect(
      page.getByRole("heading", { name: "Subscription" }),
    ).toBeVisible();
    await expect(
      page.getByText(`Manage billing for ${authenticatedMember.organizationName}.`),
    ).toBeVisible();
    await expect(
      page.getByText("Your membership is active and platform access is enabled."),
    ).toBeVisible();
  });

  test("loads organization-scoped member platform data", async ({
    page,
    authenticatedMember,
  }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("main").getByText(authenticatedMember.organizationName),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Board Self-Evaluation" }),
    ).toBeVisible();

    await page.goto("/templates");
    await expect(
      page.getByRole("heading", { name: "Board Self-Evaluation" }),
    ).toBeVisible();

    await page.goto("/team");
    await expect(page.getByText(authenticatedMember.email)).toBeVisible();

    await page.goto("/grants");
    await expect(
      page.getByRole("heading", { name: "Q3 2026 Community Grant" }),
    ).toBeVisible();

    await page.goto("/webinars");
    await expect(
      page.getByRole("heading", {
        name: "Governance Best Practices for Small Nonprofits",
      }),
    ).toBeVisible();

    await page.goto("/community");
    await expect(
      page.getByRole("heading", { name: "Community" }),
    ).toBeVisible();
    await expect(page.getByText("Native Olea community")).toBeVisible();
    await expect(page.getByText("# General")).toBeVisible();
  });

  test("locked template upgrade CTA opens subscription management", async ({
    baseURL,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const seedlingMember = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "seedling",
    });
    const storage = await createAuthenticatedStorageState(
      seedlingMember.email,
      seedlingMember.password,
      baseURL,
    );
    await page.context().clearCookies();
    await page.context().addCookies(storage.cookies);

    await page.goto("/templates");

    const lockedTemplate = page
      .locator("article")
      .filter({ hasText: "canopy & above" })
      .first();
    await lockedTemplate.getByRole("link", { name: "Upgrade" }).click();

    await expect(page).toHaveURL(
      /\/subscription\?upgrade=canopy&resource=conflict-of-interest-policy/,
    );
  });
});
