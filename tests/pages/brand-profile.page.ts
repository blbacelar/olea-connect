import { expect, type Page } from "@playwright/test";

export type UploadFile = {
  buffer: Buffer;
  mimeType: string;
  name: string;
};

export class BrandProfilePage {
  constructor(private readonly page: Page) {}

  async openDashboard() {
    await this.page.goto("/dashboard");
  }

  async openSettings() {
    await this.page.goto("/settings/brand");
  }

  async expectIncompletePromptVisible() {
    await expect(
      this.page.getByText("Your brand profile is incomplete."),
    ).toBeVisible();
  }

  async expectIncompletePromptHidden() {
    await expect(
      this.page.getByText("Your brand profile is incomplete."),
    ).toHaveCount(0);
  }

  async setOrganizationName(name: string) {
    await this.page.getByLabel("Organization name").fill(name);
  }

  async expectOrganizationName(name: string) {
    await expect(this.page.getByLabel("Organization name")).toHaveValue(name);
  }

  async uploadLogo(file: UploadFile) {
    await this.page.getByLabel("Upload organization logo").setInputFiles(file);
  }

  async dropLogo(file: UploadFile) {
    const dataTransfer = await this.page.evaluateHandle(
      ({ bytes, mimeType, name }) => {
        const transfer = new DataTransfer();
        transfer.items.add(
          new File([new Uint8Array(bytes)], name, { type: mimeType }),
        );
        return transfer;
      },
      {
        bytes: Array.from(file.buffer),
        mimeType: file.mimeType,
        name: file.name,
      },
    );

    await this.page
      .getByRole("button", { name: /Drop your logo here or browse/ })
      .dispatchEvent("drop", { dataTransfer });
    await dataTransfer.dispose();
  }

  async expectLogoUploaded() {
    await expect(this.page.getByText("Logo uploaded")).toBeVisible();
  }

  async save() {
    await this.page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      this.page.getByRole("button", { name: "Changes saved" }),
    ).toBeVisible();
  }

  async removeLogo() {
    await this.page.getByRole("button", { name: "Remove logo" }).click();
  }

  async expectLogoValidation(message: string) {
    await expect(
      this.page.getByRole("alert").filter({ hasText: message }),
    ).toBeVisible();
  }

  async expectReadOnlyForNonAdmin() {
    await expect(
      this.page.getByText(
        "Only organization owners and administrators can modify brand settings.",
      ),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Save changes" }),
    ).toHaveCount(0);
    await expect(this.page.getByLabel("Upload organization logo")).toHaveCount(0);
  }
}
