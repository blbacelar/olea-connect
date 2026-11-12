import { expect, test } from "../fixtures/browser.fixture";

test.describe("public account guidance", () => {
  test("explains missing login fields before attempting sign-in", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.locator("#loginEmailError")).toHaveText(
      "Enter a valid email address, such as name@example.org.",
    );
    await expect(page.locator("#loginPasswordError")).toHaveText(
      "Enter your password.",
    );
    await expect(page.locator("#loginEmail")).toHaveAttribute("aria-invalid", "true");

    await page.locator("#loginEmail").fill("bruno@example.org");
    await page.locator("#loginPassword").fill("example-password");
    await expect(page.locator("#loginEmailError")).toHaveCount(0);
    await expect(page.locator("#loginPasswordError")).toHaveCount(0);
  });

  test("explains invalid reset email in French", async ({ page, context, baseURL }) => {
    await context.addCookies([{
      name: "olea_locale",
      value: "fr-CA",
      url: baseURL!,
    }]);
    await page.goto("/reset-password");
    await page.locator("#resetEmail").fill("adresse-invalide");
    await page.locator("#resetEmail").press("Tab");

    await expect(page.locator("#resetEmailError")).toHaveText(
      "Entrez une adresse courriel valide, par exemple nom@exemple.org.",
    );
    await expect(page.getByRole("button", { name: "Envoyer le lien de réinitialisation" })).toBeDisabled();
    await page.locator("#resetEmail").fill("bonjour@exemple.org");
    await expect(page.locator("#resetEmailError")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Envoyer le lien de réinitialisation" })).toBeEnabled();
  });
});
