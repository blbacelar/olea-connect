import { expect, test } from "@playwright/test";

test.describe("@smoke @critical public entry points", () => {
  test("presents the product value and signup entry point", async ({
    page,
  }) => {
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

    await page.getByRole("button", { name: "Quarterly" }).click();
    await expect(rootsLink).toHaveAttribute(
      "href",
      "/signup/account?tier=roots&billing=quarterly",
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

  test("presents the public sponsorship offer without pricing or authentication", async ({
    page,
  }) => {
    await page.goto("/sponsorship");

    await expect(
      page.getByRole("heading", {
        name: "Partner with Us to Strengthen Nonprofit Resilience",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Seed Keeper" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Root Keeper" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Resilience Builder" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Legacy Guardian" }),
    ).toBeVisible();
    await expect(
      page.getByTestId("sponsorship-tier-catalyst").getByRole("heading", {
        name: "Catalyst",
      }),
    ).toBeVisible();
    await expect(page.getByText("Contact us for pricing")).toHaveCount(5);
    await expect(page.getByText(/\$\s?\d/)).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "What Every Sponsor Receives" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "The Catalyst Difference: Impact Circle",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "sponsorship@olivesocialimpact.com" }),
    ).toHaveAttribute("href", "mailto:sponsorship@olivesocialimpact.com");
    const bookingCtas = page.getByTestId("sponsorship-booking-cta");
    await expect(bookingCtas).toHaveCount(7);
    const bookingHrefs = await bookingCtas.evaluateAll((links) =>
      Array.from(new Set(links.map((link) => link.getAttribute("href")))),
    );
    expect(bookingHrefs).toHaveLength(1);
    const configuredCalendlyUrl = process.env.NEXT_PUBLIC_SPONSORSHIP_CALENDLY_URL
      ?.trim();
    if (configuredCalendlyUrl) {
      expect(bookingHrefs[0]).toBe(new URL(configuredCalendlyUrl).toString());
    } else {
      expect(bookingHrefs[0]).toBe("mailto:sponsorship@olivesocialimpact.com");
    }
    await expect(page).not.toHaveURL(/login|dashboard/);
  });
});
