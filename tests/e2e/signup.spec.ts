import { expect, test } from "@playwright/test";

import { SignupPage } from "../pages/signup.page";

test.describe("@smoke @critical membership signup", () => {
  test("keeps payment disabled until valid account details are complete", async ({
    page,
  }) => {
    const signup = new SignupPage(page);
    await signup.openAccount("seedling", "annual");

    await expect(signup.continueToPayment).toBeDisabled();

    await signup.completeAccountDetails({
      organization: "Olea QA Foundation",
      fullName: "QA Owner",
      email: "qa.owner@example.com",
      password: "StrongPass123!",
    });

    await expect(signup.continueToPayment).toBeEnabled();
    await signup.continueToPayment.click();

    await expect(page).toHaveURL("/signup/payment");
    await expect(
      page.getByRole("heading", { name: "Activate your membership" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "🌱 Seedling" }),
    ).toBeVisible();
    await expect(page.getByText("$440/year")).toBeVisible();
  });

  test("does not persist the password in browser storage", async ({ page }) => {
    const signup = new SignupPage(page);
    await signup.openAccount();

    await page.getByLabel("Organization name *").fill("Persistent Org");
    await page.getByLabel("Password *").fill("NeverStoreThis123!");
    await page.reload();

    await expect(page.getByLabel("Organization name *")).toHaveValue(
      "Persistent Org",
    );
    await expect(page.getByLabel("Password *")).toHaveValue("");
  });

  test("returns from account creation to landing-page plans", async ({
    page,
  }) => {
    const signup = new SignupPage(page);
    await signup.openAccount();

    await page.getByRole("button", { name: "← Back to plan" }).click();

    await expect(page).toHaveURL("/#plans");
    await expect(
      page.getByRole("heading", { name: "Choose the support that fits today." }),
    ).toBeVisible();
  });
});
