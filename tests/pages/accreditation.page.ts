import { expect, type Page } from "@playwright/test";
import { Buffer } from "node:buffer";

export class AccreditationPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/modules/accreditation");
    await expect(
      this.page.getByRole("heading", {
        name: "Accreditation Preparation Workspace",
      }),
    ).toBeVisible();
  }

  async expectFirstOpenLandsOnSettings() {
    await expect(this.tab("Settings")).toHaveAttribute("data-state", "active");
    await expect(
      this.page.getByRole("heading", { name: "Accreditation settings" }),
    ).toBeVisible();
  }

  async expectSettingsIsLastTab() {
    const tabNames = await this.page.getByRole("tab").allTextContents();
    expect(tabNames.map((name) => name.trim())).toEqual([
      "Dashboard",
      "Template Library",
      "Template Editor",
      "Settings",
    ]);
  }

  async saveInvalidSettings() {
    await this.page.getByLabel("Organization name").fill("A");
    await this.page.getByLabel("CRA charity number").fill("123");
    await this.page.getByLabel("Lead email").fill("not-an-email");
    await this.page.getByRole("button", { name: "Save settings" }).click();
  }

  async expectSettingsValidationErrors() {
    await expect(
      this.page.getByText("Enter an organization name with at least 2 characters."),
    ).toBeVisible();
    await expect(
      this.page.getByText("Use CRA format, for example 123456789RR0001."),
    ).toBeVisible();
    await expect(this.page.getByText("Enter a valid email address.")).toBeVisible();
  }

  async saveValidSettings(options: {
    charityNumber?: string;
    leadEmail: string;
    leadName: string;
    organizationName: string;
    targetDate?: string;
  }) {
    await this.page.getByLabel("Organization name").fill(options.organizationName);
    await this.page
      .getByLabel("CRA charity number")
      .fill(options.charityNumber ?? "123456789RR0001");
    await this.page
      .getByLabel("Target accreditation date")
      .fill(options.targetDate ?? "2026-12-31");
    await this.page.getByLabel("Accreditation lead").fill(options.leadName);
    await this.page.getByLabel("Lead email").fill(options.leadEmail);
    await this.page.getByRole("button", { name: "Save settings" }).click();
    await expect(this.tab("Dashboard")).toHaveAttribute("data-state", "active", {
      timeout: 15_000,
    });
    await expect(
      this.page.getByRole("heading", { name: "Next documents to finish" }),
    ).toBeVisible();
  }

  async openEditor() {
    await this.tab("Template Editor").click();
    await expect(this.page.getByText("Imagine Canada requirement")).toBeVisible();
  }

  async chooseDocumentStatus(status: "We already have it" | "Create document here") {
    const trigger = this.page.getByRole("combobox", { name: "Document status" });
    await trigger.click();
    await this.page.getByRole("option", { name: status }).click();
    await expect(trigger).toContainText(status);
    if (status === "We already have it") {
      await expect(this.page.locator('input[name="documentMode"]')).toHaveValue("have");
      await expect(this.page.getByLabel("Document name")).toBeVisible();
      await expect(this.page.getByLabel("Upload evidence file")).toBeVisible();
    } else {
      await expect(this.page.locator('input[name="documentMode"]')).toHaveValue("create");
      await expect(this.page.getByLabel("Working draft")).toBeVisible();
    }
  }

  async saveTemplateStatus() {
    const saveButton = this.page.getByRole("button", { name: /Save template status|Saving/ });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  }

  async expectEvidenceValidationErrors() {
    await expect(
      this.page.getByText(
        "Document name is required when you already have or upload this document.",
      ),
    ).toBeVisible();
    await expect(
      this.page.getByText("Add a document location or upload the evidence file."),
    ).toBeVisible();
  }

  async chooseBoardApproval(status: "Board approved" | "Ready for board") {
    const trigger = this.page.getByRole("combobox", { name: "Board approval" });
    await trigger.click();
    await this.page.getByRole("option", { name: status }).click();
    await expect(trigger).toContainText(status);
  }

  async uploadEvidenceFile(options: {
    buffer: Buffer;
    mimeType: string;
    name: string;
  }) {
    await this.page.getByTestId("accreditation-evidence-file").setInputFiles({
      buffer: options.buffer,
      mimeType: options.mimeType,
      name: options.name,
    });
  }

  async saveExistingDocument(options: { location: string; name: string }) {
    await this.page.getByLabel("Document name").fill(options.name);
    await this.page.getByLabel("Document location").fill(options.location);
    await this.saveTemplateStatus();
    await expect(
      this.page.getByRole("button", { name: "Save template status" }),
    ).toBeEnabled({ timeout: 15_000 });
  }

  async openDashboard() {
    await this.tab("Dashboard").click();
    await expect(
      this.page.getByRole("heading", { name: "Next documents to finish" }),
    ).toBeVisible();
  }

  async expectCompletedTemplates(count: string) {
    await expect(
      this.page.getByTestId("accreditation-templates-complete"),
    ).toContainText(count);
  }

  async reload() {
    await this.page.reload();
    await expect(this.page.getByTestId("accreditation-workspace")).toBeVisible();
  }

  private tab(name: string) {
    return this.page.getByRole("tab", { name });
  }
}
