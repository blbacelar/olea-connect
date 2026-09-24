import { expect, test } from "../fixtures/authenticated.fixture";
import type { Page } from "@playwright/test";

async function openUserRow(page: Page, email: string) {
  await page.goto("/users");
  await expect(page.getByRole("heading", { name: "Users Directory" })).toBeVisible();
  const row = page.getByTestId("directory-user-row").filter({ hasText: email });
  for (let pageNumber = 1; pageNumber <= 100; pageNumber += 1) {
    if (await row.count()) return row;
    const next = page.getByRole("link", { name: "Next" });
    if (!(await next.count())) break;
    await next.click();
    await expect(page.getByText(new RegExp(`Page ${pageNumber + 1} of \\d+`))).toBeVisible();
  }
  throw new Error(`Directory user ${email} was not found`);
}

test.describe("@critical users directory", () => {
  test("shows members a private-safe directory and requires sign-in", async ({
    authenticatedMember,
    page,
    testData,
  }) => {
    const uniqueName = `Directory Member ${authenticatedMember.userId.slice(0, 8)}`;
    const { error: profileError } = await testData.supabase
      .from("profiles")
      .update({ full_name: uniqueName })
      .eq("id", authenticatedMember.userId);
    if (profileError) throw profileError;
    const sponsorName = `Member Sponsor ${authenticatedMember.userId.slice(0, 8)}`;
    const { data: sponsor, error: sponsorError } = await testData.supabase
      .from("sponsors")
      .insert({
        name: sponsorName,
        slug: `member-directory-${authenticatedMember.userId}`,
        status: "active",
        directory_email: authenticatedMember.email,
      })
      .select("id")
      .single();
    if (sponsorError) throw sponsorError;
    testData.registerCleanup({
      label: `sponsor ${sponsor.id}`,
      run: async () => {
        const { error } = await testData.supabase.from("sponsors").delete().eq("id", sponsor.id);
        if (error) throw error;
      },
    });

    await page.goto("/dashboard");
    await page.getByTestId("app-sidebar").getByRole("link", {
      name: "Users Directory",
    }).click();
    await expect(page).toHaveURL(/\/users$/);
    await expect(page.getByRole("heading", { name: "Users Directory" })).toBeVisible();
    const row = await openUserRow(page, uniqueName);
    await expect(row.getByText("Sponsor", { exact: true })).toBeVisible();
    await expect(row).not.toContainText(sponsorName);
    await expect(page.getByRole("main").getByText(authenticatedMember.email)).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Email" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Workspace" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Email status" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Signed up" })).toHaveCount(0);

    await page.goto("/settings/users");
    await expect(page).toHaveURL(/\/users$/);

    await page.context().clearCookies();
    await page.goto("/users");
    await expect(page).toHaveURL(/\/login/);
  });

  test("marks sponsors", async ({
    authenticatedMember,
    page,
    testData,
  }) => {
    await testData.assignPlatformRole(authenticatedMember.userId, "super_admin");

    const sponsorName = `Directory Sponsor ${authenticatedMember.userId.slice(0, 8)}`;
    const { data: sponsor, error: sponsorError } = await testData.supabase
      .from("sponsors")
      .insert({
        name: sponsorName,
        slug: `directory-${authenticatedMember.userId}`,
        status: "active",
        directory_email: authenticatedMember.email,
      })
      .select("id")
      .single();
    if (sponsorError) throw sponsorError;
    testData.registerCleanup({
      label: `sponsor ${sponsor.id}`,
      run: async () => {
        const { error } = await testData.supabase.from("sponsors").delete().eq("id", sponsor.id);
        if (error) throw error;
      },
    });

    const row = await openUserRow(page, authenticatedMember.email);
    await expect(page.getByRole("heading", { name: "Users Directory" })).toBeVisible();
    await expect(page.getByTestId("app-sidebar").getByRole("link", {
      name: "Users Directory",
    })).toBeVisible();
    await expect(row.getByText("Sponsor", { exact: true })).toBeVisible();
    await expect(row).toContainText(sponsorName);

    const { error: updateError } = await testData.supabase
      .from("sponsors")
      .update({ directory_email: null })
      .eq("id", sponsor.id);
    if (updateError) throw updateError;
    const { error: contactError } = await testData.supabase
      .from("sponsor_contacts")
      .insert({ sponsor_id: sponsor.id, full_name: authenticatedMember.fullName, email: authenticatedMember.email });
    if (contactError) throw contactError;

    await page.reload();
    await expect(row.getByText("Sponsor", { exact: true })).toBeVisible();

    const unconfirmedEmail = `unconfirmed-${authenticatedMember.userId}@olea-test.invalid`;
    const { data: unconfirmed, error: unconfirmedError } = await testData.supabase.auth.admin
      .createUser({ email: unconfirmedEmail, email_confirm: false });
    if (unconfirmedError) throw unconfirmedError;
    testData.registerCleanup({
      label: `unconfirmed user ${unconfirmed.user.id}`,
      run: async () => {
        const { error } = await testData.supabase.auth.admin.deleteUser(unconfirmed.user.id);
        if (error) throw error;
      },
    });
    const { error: secondContactError } = await testData.supabase
      .from("sponsor_contacts")
      .insert({ sponsor_id: sponsor.id, full_name: "Unconfirmed Contact", email: unconfirmedEmail });
    if (secondContactError) throw secondContactError;
    const unconfirmedRow = await openUserRow(page, unconfirmedEmail);
    await expect(unconfirmedRow).toContainText("Pending confirmation");
    await expect(unconfirmedRow.getByText("Sponsor", { exact: true })).toHaveCount(0);

    const { error: pauseError } = await testData.supabase
      .from("sponsors")
      .update({ status: "paused" })
      .eq("id", sponsor.id);
    if (pauseError) throw pauseError;
    const pausedRow = await openUserRow(page, authenticatedMember.email);
    await expect(pausedRow).not.toContainText(sponsorName);

    const { data: userList, error: listError } = await testData.supabase.auth.admin
      .listUsers({ page: 1, perPage: 50 });
    if (listError) throw listError;
    const lastPage = Math.max(1, Math.ceil(userList.total / 50));
    await page.goto("/users?page=9999");
    await expect(page.getByText(`Page ${lastPage} of ${lastPage}`)).toBeVisible();
    await expect(page.getByTestId("directory-user-row").first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileRow = await openUserRow(page, authenticatedMember.email);
    await expect(mobileRow).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByTestId("locale-selector").click();
    await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/locale") && response.ok()),
      page.getByRole("option", { name: "Français" }).click(),
    ]);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr-CA");
    await page.goto("/users");
    await expect(page.getByRole("heading", { name: "Répertoire des utilisateurs" })).toBeVisible();
  });

  test("navigates a directory with multiple pages", async ({
    authenticatedMember,
    page,
    testData,
  }) => {
    test.setTimeout(180_000);
    await testData.assignPlatformRole(authenticatedMember.userId, "super_admin");
    const { data: existing, error: existingError } = await testData.supabase.auth.admin
      .listUsers({ page: 1, perPage: 50 });
    if (existingError) throw existingError;

    const needed = Math.max(0, 51 - existing.total);
    for (let start = 0; start < needed; start += 10) {
      const batch = await Promise.all(Array.from(
        { length: Math.min(10, needed - start) },
        (_, index) => testData.supabase.auth.admin.createUser({
          email: `directory-page-${authenticatedMember.userId}-${start + index}@olea-test.invalid`,
          email_confirm: false,
        }),
      ));
      for (const { data, error } of batch) {
        if (error || !data.user) continue;
        testData.registerCleanup({
          label: `directory pagination user ${data.user.id}`,
          run: async () => {
            const { error: deleteError } = await testData.supabase.auth.admin
              .deleteUser(data.user.id);
            if (deleteError) throw deleteError;
          },
        });
      }
      const creationError = batch.find(({ error }) => error)?.error;
      if (creationError) throw creationError;
    }

    await page.goto("/users");
    await expect(page.getByText(/Page 1 of [2-9]\d*/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Previous" })).toHaveCount(0);
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page.getByText(/Page 2 of [2-9]\d*/)).toBeVisible();
    await expect(page.getByTestId("directory-user-row").first()).toBeVisible();
    await page.getByRole("link", { name: "Previous" }).click();
    await expect(page.getByText(/Page 1 of [2-9]\d*/)).toBeVisible();
  });
});
