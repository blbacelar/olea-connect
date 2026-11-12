import { expect, test } from "../fixtures/browser.fixture";

test("public homepage shows verified trust claims, plan comparison, podcast, and legal links", async ({ page }) => {
  await page.goto("/");

  const pricing = page.locator("#plans");
  await expect(pricing.getByRole("link", { name: "We do not sell your data" })).toHaveAttribute("href", "/legal/privacy");
  await expect(pricing).toContainText("Seedling $180, Roots $530, Canopy $1,060");
  await expect(pricing).not.toContainText("Recommended");
  await expect(pricing.getByRole("table")).toContainText("Board Recruitment Toolkit and Skills Matrix");
  await expect(pricing.getByRole("table")).toContainText("Add-on $595 CAD/year");
  await page.locator("#podcast").getByRole("button", { name: "Play podcast episode" }).click();
  await expect(page.locator("#podcast iframe")).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/puuW6y1mSAQ?autoplay=1");

  const legal = page.getByRole("navigation", { name: "Legal and contact links" });
  await expect(legal.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/legal/privacy");
  await expect(legal.getByRole("link", { name: "Terms of Use" })).toHaveAttribute("href", "/legal/terms");
  await expect(legal.getByRole("link", { name: "Accessibility" })).toHaveAttribute("href", "/accessibility");
  await expect(legal.getByRole("link", { name: "Book a call" })).toHaveAttribute("href", /olivesocialimpact\.com\/\?.*#discovery$/);
});

test("legal links work on signup and the public pages in English and French", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("navigation", { name: "Legal and contact links" })).toBeVisible();
  for (const path of ["/legal/privacy", "/legal/terms", "/accessibility"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  await page.goto("/");
  await page.getByTestId("locale-selector").click();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/locale") && response.ok()),
    page.getByRole("option", { name: "Français" }).click(),
  ]);
  await expect(page.getByRole("navigation", { name: "Liens juridiques et coordonnées" })).toBeVisible();
  await expect(page.locator("#plans")).toContainText("Seedling 180 $, Roots 530 $, Canopy 1 060 $");
  await page.goto("/accessibility");
  await expect(page.getByRole("heading", { name: "L'accessibilité chez Olea Connects" })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});

test("pricing comparison and footer fit a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("#plans table")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Legal and contact links" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("public sitemap uses the production domain", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const xml = await response.text();
  expect(xml).toContain("https://oleaconnects.com/accessibility");
  expect(xml).not.toContain("vercel.app");
});
