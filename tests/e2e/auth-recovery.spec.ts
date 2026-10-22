import { test } from "../fixtures/test-data.fixture";
import { PasswordRecoveryPage } from "../pages/password-recovery.page";

test.describe("@critical authentication recovery", () => {
  test("requests a password reset without authenticating through the UI", async ({
    page,
    testData,
  }) => {
    const member = await testData.createOrganizationOwner();
    const passwordRecovery = new PasswordRecoveryPage(page);

    await passwordRecovery.open();
    await passwordRecovery.requestReset(member.email);
    await passwordRecovery.expectResetEmailSent(member.email);
  });
});
