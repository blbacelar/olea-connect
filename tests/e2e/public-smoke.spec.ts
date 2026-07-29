import { expect, test } from "../fixtures/browser.fixture";

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
    const password = page.getByRole("textbox", { name: "Password" });
    await expect(password).toBeVisible();
    await expect(password).toHaveAttribute(
      "type",
      "password",
    );
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(
      page.getByRole("button", { name: "Hide password" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(password).toHaveAttribute(
      "type",
      "password",
    );
    await expect(
      page.getByRole("checkbox", { name: "Remember me for 30 days" }),
    ).toBeVisible();
    const rememberMe = page.getByRole("checkbox", {
      name: "Remember me for 30 days",
    });
    await rememberMe.check();
    await expect(rememberMe).toBeChecked();
    await rememberMe.uncheck();
    await expect(rememberMe).not.toBeChecked();
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

  test("exposes all versioned legal documents as public pages", async ({
    page,
  }) => {
    const documents = [
      ["terms", "Terms of Service"],
      ["privacy", "Privacy Policy"],
      ["data-ownership", "Data Ownership Agreement"],
      ["confidentiality", "Confidentiality Policy"],
    ] as const;

    for (const [slug, title] of documents) {
      await page.goto(`/legal/${slug}`);
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
      await expect(page.getByText("Version 2026-07-24")).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Return to signup" }),
      ).toHaveAttribute("href", "/signup");
      await expect(page).not.toHaveURL(/login|dashboard/);
    }
  });
});
