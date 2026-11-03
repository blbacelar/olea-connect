import { expect, test } from "../fixtures/authenticated.fixture";

test.describe("@critical Jessica tracking code", () => {
  test("attributes a signup for admins without creating a commission", async ({
    authenticatedMember,
    browser,
    page,
    testData,
  }) => {
    const requestId = await testData.createWorkspaceProvisioningRequest(authenticatedMember);
    const { error: updateError } = await testData.supabase
      .from("workspace_provisioning_requests")
      .update({ referral_code: "OLEA-JESSICA", referral_status: "pending" })
      .eq("id", requestId);
    if (updateError) throw updateError;

    await testData.assignPlatformRole(authenticatedMember.userId, "super_admin");
    await page.goto("/settings/referrals");
    await expect(page.getByRole("heading", { name: "Tracking-only codes" })).toBeVisible();
    await expect(page.getByText("Tracked signups").locator("..").getByText("1")).toBeVisible();
    await expect(page.getByText("OLEA-JESSICA", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("cell", { name: authenticatedMember.organizationName }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Open link" })).toHaveAttribute(
      "href",
      "/ref/OLEA-JESSICA",
    );
    await expect(page.getByRole("button", { name: "Copy share link" })).toBeVisible();
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(page.url()).origin });
    await page.getByRole("button", { name: "Copy share link" }).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(
      new URL("/ref/OLEA-JESSICA", process.env.NEXT_PUBLIC_APP_URL).toString(),
    );

    const { data: referrals, error: referralsError } = await testData.supabase
      .from("referrals")
      .select("id")
      .eq("referral_code", "OLEA-JESSICA");
    if (referralsError) throw referralsError;
    expect(referrals).toHaveLength(0);

    const anonymous = await browser.newContext();
    try {
      const visitor = await anonymous.newPage();
      await visitor.goto("/ref/OLEA-JESSICA");
      await expect(visitor).toHaveURL(/\/signup\?ref=OLEA-JESSICA$/);
      const cookie = (await anonymous.cookies()).find(
        (item) => item.name === "olea_referral_code",
      );
      expect(cookie?.value).toBe("OLEA-JESSICA");
    } finally {
      await anonymous.close();
    }
  });
});
