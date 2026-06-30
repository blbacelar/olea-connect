import { expect, type Page } from "@playwright/test";

const registrationStorageKey = "olea-registration-demo";

export class OnboardingPage {
  constructor(private readonly page: Page) {}

  async seedRegistrationState({
    organizationName,
    tier = "seedling",
  }: {
    organizationName: string;
    tier?: "canopy" | "harvest" | "roots" | "seedling";
  }) {
    await this.page.addInitScript(
      ({ key, organizationName: storedOrganizationName, tier: storedTier }) => {
        window.localStorage.setItem(
          key,
          JSON.stringify({
            tier: storedTier,
            billingCycle: "monthly",
            organizationName: storedOrganizationName,
            fullName: "QA Owner",
            email: "",
            password: "",
            province: "AB",
            emailVerified: true,
            brandComplete: false,
            selectedTemplateIds: [],
          }),
        );
      },
      {
        key: registrationStorageKey,
        organizationName,
        tier,
      },
    );
  }

  async completeBrandSetup(organizationName: string) {
    await this.page.goto("/onboarding/brand-setup");
    await this.page.getByLabel("Organization name").fill(organizationName);
    await this.page
      .getByRole("button", { name: "Save brand and continue" })
      .click();
  }

  async expectTemplateSelection() {
    await expect(
      this.page.getByRole("heading", { name: "Choose your 3 templates" }),
    ).toBeVisible();
  }

  async selectSeedlingTemplates(templateNames: string[]) {
    for (const templateName of templateNames) {
      await this.page
        .getByRole("button", { name: new RegExp(templateName) })
        .click();
    }
  }

  async confirmSeedlingTemplates() {
    await this.page.getByRole("button", { name: "Confirm my 3 templates" }).click();
    await expect(this.page).toHaveURL("/dashboard");
  }

  async openTemplateSelection() {
    await this.page.goto("/onboarding/template-selection");
  }

  async expectSelectionLocked(templateName: string) {
    await expect(this.page.getByText("Selected: 3 of 3")).toBeVisible();
    await expect(this.page.getByText("Available").first()).toBeVisible();
    await expect(this.page.getByText("Selected").first()).toBeVisible();
    await expect(this.page.getByText("Locked until").first()).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: new RegExp(templateName) }),
    ).toBeDisabled();
  }

  async expectRootsBypassesSelection() {
    await this.openTemplateSelection();
    await expect(this.page).toHaveURL("/dashboard");
  }
}
