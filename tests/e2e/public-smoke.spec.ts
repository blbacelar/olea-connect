import { expect, test } from "@playwright/test";

test.describe("@smoke @critical public entry points", () => {
  test("presents the product value and signup entry point", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "The tools, community, and funding connections your nonprofit needs to grow.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Get started" }),
    ).toHaveAttribute("href", "/signup");
  });

  test("carries the selected plan directly into account creation", async ({
    page,
  }) => {
    await page.goto("/");

    const rootsLink = page.getByRole("link", { name: "Choose Roots" });
    await expect(rootsLink).toHaveAttribute(
      "href",
      "/signup/account?tier=roots&billing=annual",
    );

    await page.getByRole("button", { name: "Monthly" }).click();
    await expect(rootsLink).toHaveAttribute(
      "href",
      "/signup/account?tier=roots&billing=monthly",
    );
  });

  test("exposes login and password recovery", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "Remember me for 30 days" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Forgot password?" }),
    ).toHaveAttribute("href", "/reset-password");
  });
});
