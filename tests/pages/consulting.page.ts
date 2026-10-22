import { expect, type Page } from "@playwright/test";

type RequestInput = {
  category?: "Board package" | "Committee minutes" | "Governance support" | "Strategy call" | "Other";
  description: string;
  filePath?: string;
  title: string;
  urgency?: "Low" | "Standard" | "High" | "Urgent";
};

type StaffUpdateInput = {
  assignedConsultant?: string;
  internalNotes?: string;
  memberNotes?: string;
  scheduledAt?: string;
  status: "Accepted" | "In progress" | "Blocked" | "Completed" | "Canceled";
};

type TimeEntryInput = {
  description: string;
  inKind?: boolean;
  minutes: number;
  workDate?: string;
};

export class ConsultingPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/consulting");
  }

  async expectHarvestWorkspace(organizationName: string) {
    await expect(
      this.page.getByRole("heading", {
        name: `Hands-on support for ${organizationName}`,
      }),
    ).toBeVisible();
    await expect(
      this.page.getByTestId("consulting-request-form"),
    ).toBeVisible();
  }

  async expectHarvestUpgradeMessage() {
    await expect(
      this.page.getByRole("heading", {
        name: "Harvest consulting is not included with this membership",
      }),
    ).toBeVisible();
    await expect(
      this.page.getByTestId("consulting-request-form"),
    ).toHaveCount(0);
  }

  async submitRequest({
    category = "Governance support",
    description,
    filePath,
    title,
    urgency = "Standard",
  }: RequestInput) {
    const form = this.page.getByTestId("consulting-request-form");
    await expect(form).toBeVisible();
    await form.getByRole("combobox").nth(0).click();
    await this.page.getByRole("option", { name: category }).click();
    await form.getByRole("combobox").nth(1).click();
    await this.page.getByRole("option", { name: urgency }).click();
    await form.getByLabel("Title").fill(title);
    await form.getByLabel("Description").fill(description);

    if (filePath) {
      await form.getByLabel("Attachments").setInputFiles(filePath);
    }

    await form.getByRole("button", { name: "Submit request" }).click();
  }

  async expectRequestSubmitted() {
    await expect(
      this.page.getByText(
        "Consulting request submitted. Our team can now triage it.",
      ),
    ).toBeVisible();
  }

  async expectAttachmentRejected() {
    await expect(
      this.page.getByText("HTML files are not accepted as consulting attachments."),
    ).toBeVisible();
  }

  async expectRequestCard(title: string) {
    await expect(this.requestCard(title)).toBeVisible();
  }

  async expectRequestStatus(title: string, status: string) {
    await expect(
      this.requestCard(title).getByText(status, { exact: true }),
    ).toBeVisible();
  }

  async expectMemberUpdate(title: string, update: string) {
    await expect(this.requestCard(title).getByText(update)).toBeVisible();
  }

  async expectStaffRequest(title: string) {
    await this.selectStaffRequest(title);
  }

  async openStaffWorkspace() {
    const dialog = this.page.getByRole("dialog", {
      name: "Consulting staff workspace",
    });
    if (await dialog.isVisible().catch(() => false)) return;

    await this.page.getByRole("button", { name: "Open staff workspace" }).click();
    await expect(dialog).toBeVisible();
  }

  async updateRequest(title: string, input: StaffUpdateInput) {
    await this.selectStaffRequest(title);
    const panel = this.staffPanel(title);
    const updateForm = panel.locator("form").first();
    await updateForm.getByRole("combobox").nth(0).click();
    await this.page.getByRole("option", { name: input.status }).click();

    if (input.assignedConsultant) {
      await updateForm.getByRole("combobox").nth(1).click();
      await this.page
        .getByRole("option", { name: input.assignedConsultant })
        .click();
    }

    if (input.scheduledAt) {
      await updateForm.getByLabel("Scheduled call").fill(input.scheduledAt);
    }

    if (input.memberNotes !== undefined) {
      await updateForm.getByLabel("Member-facing update").fill(input.memberNotes);
    }

    if (input.internalNotes !== undefined) {
      await updateForm.getByLabel("Internal notes").fill(input.internalNotes);
    }

    await updateForm.getByRole("button", { name: "Update request" }).click();
  }

  async recordTime(title: string, input: TimeEntryInput) {
    await this.selectStaffRequest(title);
    const panel = this.staffPanel(title);
    const timeForm = panel.locator("form").nth(1);

    if (input.workDate) {
      await timeForm.getByLabel("Work date").fill(input.workDate);
    }

    await timeForm.getByLabel("Minutes").fill(String(input.minutes));
    await timeForm.getByLabel("Work completed").fill(input.description);

    if (input.inKind) {
      await timeForm.getByLabel("Time type").check();
    }

    await timeForm.getByRole("button", { name: "Record time" }).click();
  }

  async expectTimeRecorded(title: string) {
    await expect(
      this.staffPanel(title).getByText("Consulting time recorded."),
    ).toBeVisible();
  }

  async expectTimeLimitError(title: string) {
    await expect(
      this.staffPanel(title).getByText(
        "This time entry exceeds the available consulting hours for the current period.",
      ),
    ).toBeVisible();
  }

  private requestCard(title: string) {
    return this.page.getByRole("article").filter({ hasText: title });
  }

  private async selectStaffRequest(title: string) {
    const dialog = this.page.getByRole("dialog", {
      name: "Consulting staff workspace",
    });
    const tab = dialog.getByRole("tab").filter({ hasText: title });

    if ((await tab.count()) > 0) {
      await tab.click();
    }

    await expect(this.staffPanel(title)).toBeVisible();
  }

  private staffPanel(title: string) {
    return this.page
      .getByRole("dialog", { name: "Consulting staff workspace" })
      .getByRole("article")
      .filter({ hasText: title });
  }
}
