import { expect, test } from "../fixtures/test-data.fixture";

test.describe("@critical authentication recovery", () => {
  test("requests a password reset without authenticating through the UI", async ({
    page,
    testData,
  }) => {
    const member = await testData.createOrganizationOwner();

    await page.goto("/reset-password");
    await page.getByLabel("Email address").fill(member.email);
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(
      page.getByRole("heading", { name: "Check your email" }),
    ).toBeVisible();
    await expect(page.getByText(member.email)).toBeVisible();
  });
});
