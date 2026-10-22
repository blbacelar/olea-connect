import { expect, test } from "../fixtures/authenticated.fixture";
import { Buffer } from "node:buffer";
import { AccreditationPage } from "../pages/accreditation.page";

test.describe("@critical Accreditation Preparation Workspace", () => {
  test.setTimeout(90_000);

  test("opens on settings first, validates inputs, and persists document evidence", async ({
    authenticatedMember,
    page,
  }) => {
    const accreditation = new AccreditationPage(page);

    await accreditation.open();
    await accreditation.expectSettingsIsLastTab();
    await accreditation.expectFirstOpenLandsOnSettings();

    await accreditation.saveInvalidSettings();
    await accreditation.expectSettingsValidationErrors();

    await accreditation.saveValidSettings({
      leadEmail: authenticatedMember.email,
      leadName: authenticatedMember.fullName,
      organizationName: authenticatedMember.organizationName,
    });

    await accreditation.openEditor();
    await accreditation.chooseDocumentStatus("We already have it");
    await accreditation.saveTemplateStatus();
    await accreditation.expectEvidenceValidationErrors();

    await accreditation.uploadEvidenceFile({
      buffer: Buffer.from("board-approved strategic plan evidence"),
      mimeType: "text/plain",
      name: "Strategic plan approved by board.txt",
    });
    await accreditation.chooseBoardApproval("Board approved");
    await accreditation.saveTemplateStatus();

    await accreditation.openDashboard();
    await accreditation.expectCompletedTemplates("1 / 36");

    await accreditation.reload();
    await expect(page).toHaveURL(/\/modules\/accreditation/);
    await accreditation.openEditor();
    await expect(page.getByLabel("Document name")).toHaveValue(
      "Strategic plan approved by board.txt",
    );
    await expect(page.getByText("Uploaded evidence: Strategic plan approved by board.txt")).toBeVisible();
  });
});
