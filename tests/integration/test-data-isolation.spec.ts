import { test, expect } from "../fixtures/test-data.fixture";

test.describe("@integration test data isolation", () => {
  test.skip(
    process.env.PLAYWRIGHT_TEST_DATA_ENABLED !== "true",
    "Requires an explicitly enabled dedicated Supabase test environment.",
  );

  test("creates isolated organization data and purges it by exact IDs", async ({
    testData,
  }) => {
    const created = await testData.createOrganizationOwner();

    expect(created.email).toMatch(/^e2e-.+@example\.com$/);
    await expect(
      testData.organizationExists(created.organizationId),
    ).resolves.toBe(true);

    await testData.purge();

    await expect(
      testData.organizationExists(created.organizationId),
    ).resolves.toBe(false);
    await expect(testData.authUserExists(created.userId)).resolves.toBe(false);
  });
});
