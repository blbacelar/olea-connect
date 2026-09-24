import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/browser.fixture";

async function switchToFrench(page: Page) {
  await page.getByTestId("locale-selector").click();
  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/api/locale") && response.ok(),
    ),
    page.getByRole("option", { name: "Français" }).click(),
  ]);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr-CA");
}

test.describe("@smoke @critical public entry points", () => {
  test("presents the product value and signup entry point", async ({
    page,
  }) => {
    await page.goto("/");

    const offer = page.getByTestId("founding-offer-banner");
    await expect(offer).toContainText("15% off Year 1 for the first 50 paid organizations, while spots last.");
    await expect(offer).toContainText("OLEAFOUNDING15");
    await expect(offer.getByRole("link", { name: "Join now" })).toHaveAttribute("href", "/signup");

    await expect(
      page.getByRole("heading", {
        name: /tools, community, and funding connections/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Olive Social Impact donates 15% of its profits to nonprofits as unrestricted donations\./,
      ).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Get started" }),
    ).toHaveAttribute("href", "/signup");
  });

  test("lets visitors switch the public site to French Canadian", async ({
    page,
  }) => {
    await page.goto("/");

    await switchToFrench(page);
    await expect(page.getByTestId("founding-offer-banner")).toContainText(
      "15 % de rabais la première année pour les 50 premiers organismes payants, jusqu'à épuisement des places.",
    );
    await expect(
      page.getByRole("heading", {
        name: /Les outils, la communauté et les liens de financement/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Commencer" })).toHaveAttribute(
      "href",
      "/signup",
    );

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "fr-CA");
    await expect(
      page.getByRole("heading", {
        name: /Les outils, la communauté et les liens de financement/i,
      }),
    ).toBeVisible();
  });

  test("keeps the offer visible while scrolling on mobile without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 900));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect.poll(() =>
      page.getByTestId("founding-offer-banner").evaluate((element) => element.getBoundingClientRect().top),
    ).toBe(0);
    await expect(page.getByTestId("founding-offer-banner")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    await switchToFrench(page);
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.goto("/signup");
    await expect(page.getByTestId("founding-offer-banner")).toContainText("OLEAFOUNDING15");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test("limits the founding offer to membership marketing and signup", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByTestId("founding-offer-banner")).toContainText("OLEAFOUNDING15");

    await page.goto("/sponsorship");
    await expect(page.getByTestId("founding-offer-banner")).toHaveCount(0);

    await page.goto("/login");
    await expect(page.getByTestId("founding-offer-banner")).toHaveCount(0);
  });

  test("keeps the offer code visible where founding members enter it", async ({ page }) => {
    await page.goto("/signup/account");
    await expect(page.getByTestId("founding-offer-banner")).toContainText("OLEAFOUNDING15");
    await expect(page.getByLabel(/founding.member code/i)).toBeVisible();
  });

  test("keeps the signup flow in French Canadian after language selection", async ({
    page,
  }) => {
    await page.goto("/");

    await switchToFrench(page);
    await page.goto("/signup");

    await expect(
      page.getByRole("heading", { name: "Choisissez votre forfait" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Annuel/ })).toBeVisible();
    await expect(page.getByText("10 sièges inclus")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Continuer avec Roots/ }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Continuer avec Roots/ }).click();
    await expect(
      page.getByRole("heading", { name: "Créez votre compte" }),
    ).toBeVisible();
    await expect(page.getByLabel("Nom de l'organisme *")).toBeVisible();
    await expect(page.getByText("Sélectionner un type")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Continuer au paiement/ }),
    ).toBeVisible();
  });

  test("keeps public referral and sponsorship pages in French Canadian", async ({
    page,
  }) => {
    await page.goto("/");

    await switchToFrench(page);

    await page.goto("/referrals");
    await expect(
      page.getByRole("heading", {
        name: /Gagnez jusqu'à .* après le premier paiement d'adhésion/,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recevoir votre lien de référence" }),
    ).toBeVisible();

    await page.goto("/sponsorship");
    await expect(
      page.getByRole("heading", {
        name: /renforcer la résilience des organismes/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Contactez-nous pour le prix").first(),
    ).toBeVisible();
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
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(
      page.getByRole("button", { name: "Hide password" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(password).toHaveAttribute("type", "password");
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
    const configuredCalendlyUrl =
      process.env.NEXT_PUBLIC_SPONSORSHIP_CALENDLY_URL?.trim();
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

  test("keeps legal documents in French Canadian after language selection", async ({
    page,
  }) => {
    await page.goto("/");
    await switchToFrench(page);

    await page.goto("/legal/terms");

    await expect(page.locator("html")).toHaveAttribute("lang", "fr-CA");
    await expect(
      page.getByRole("heading", { name: "Conditions d'utilisation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Retour à l'inscription" }),
    ).toHaveAttribute("href", "/signup");
    await expect(
      page.getByText("Document juridique Olea Connects™"),
    ).toBeVisible();
  });

});
