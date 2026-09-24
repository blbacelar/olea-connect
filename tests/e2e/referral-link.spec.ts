import { expect, test } from "../fixtures/authenticated.fixture";

test.describe("@critical referral link lifecycle", () => {
  test("referral link lifecycle", async ({
    authenticatedMember,
    baseURL,
    browser,
    page,
    testData,
  }) => {
    await testData.assignPlatformRole(authenticatedMember.userId, "super_admin");
    testData.registerCleanup({
      label: `referrer ${authenticatedMember.email}`,
      run: async () => {
        const { data: referrer, error: lookupError } = await testData.supabase
          .from("referrers")
          .select("id")
          .eq("email", authenticatedMember.email)
          .maybeSingle();
        if (lookupError) throw lookupError;
        if (referrer) {
          const { error: eventsError } = await testData.supabase
            .from("integration_events")
            .delete()
            .eq("aggregate_type", "referral_program")
            .eq("aggregate_id", referrer.id);
          if (eventsError) throw eventsError;
        }
        const { error } = await testData.supabase
          .from("referrers")
          .delete()
          .eq("email", authenticatedMember.email);
        if (error) throw error;
      },
    });

    await page.goto("/referrals");
    await expect(page.getByText("10%", { exact: true })).toBeVisible();
    await expect(page.getByText("$100.00", { exact: true })).toHaveCount(0);
    await page.getByLabel("Full name").fill(authenticatedMember.fullName);
    await page.getByLabel("Email", { exact: true }).fill(authenticatedMember.email);
    await page.getByLabel("Organization or company").fill(authenticatedMember.organizationName);
    await page.getByLabel("How do you know Olea's audience?").fill("I work with nonprofit leaders.");
    await page.getByLabel("Best payout contact").fill(authenticatedMember.email);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Submit referral application" }).click();
    await expect(page.getByRole("status")).toContainText("Referral application submitted");

    await page.goto("/settings/referrals");
    await expect(page.getByText(/One commission per referred organization: 10% of its first successful/)).toBeVisible();
    const row = page.locator("section")
      .filter({ has: page.getByRole("heading", { name: "Referrers", exact: true }) })
      .getByRole("row")
      .filter({ hasText: authenticatedMember.email });
    await expect(row).toContainText("Pending");
    await row.getByRole("button", { name: "Save" }).click();

    const getActiveCode = async () => {
      const { data, error } = await testData.supabase
        .from("referrers")
        .select("status, referral_links(code, active)")
        .eq("email", authenticatedMember.email)
        .single();
      if (error) throw error;
      const links = data.referral_links ?? [];
      return {
        status: data.status,
        active: links.filter((link) => link.active).map((link) => link.code),
      };
    };

    await expect.poll(getActiveCode).toMatchObject({
      status: "approved",
      active: [expect.stringMatching(/^OLEA-[A-Z0-9]{6,16}$/)],
    });
    const code = (await getActiveCode()).active[0];

    await page.reload();
    await row.getByRole("button", { name: "Save" }).click();
    await expect.poll(getActiveCode).toEqual({ status: "approved", active: [code] });

    await page.goto("/referrals/dashboard");
    await expect(page.getByText(new RegExp(`/ref/${code}`))).toBeVisible();
    await expect(page.getByRole("link", { name: "Open link" }))
      .toHaveAttribute("href", `${baseURL}/ref/${code}`);
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(`${baseURL}/ref/${code}`);

    const { data: referrer, error: referrerError } = await testData.supabase
      .from("referrers")
      .select("id")
      .eq("email", authenticatedMember.email)
      .single();
    if (referrerError) throw referrerError;

    const { data: referralLink, error: linkError } = await testData.supabase
      .from("referral_links")
      .select("id")
      .eq("code", code)
      .single();
    if (linkError) throw linkError;
    const referredEmail = `referred-${code.toLowerCase()}@olea-test.invalid`;
    const { data: referral, error: referralError } = await testData.supabase
      .from("referrals")
      .insert({
        referral_link_id: referralLink.id,
        referrer_id: referrer.id,
        referral_code: code,
        referred_email: referredEmail,
        status: "lead_created",
      })
      .select("id")
      .single();
    if (referralError) throw referralError;
    testData.registerCleanup({
      label: `referral ${referral.id}`,
      run: async () => {
        const { error } = await testData.supabase
          .from("referrals")
          .delete()
          .eq("id", referral.id);
        if (error) throw error;
      },
    });

    await page.goto("/settings/referrals");
    const milestoneRow = page.getByRole("row").filter({ hasText: referredEmail });
    await milestoneRow.getByRole("combobox").click();
    await expect(page.getByRole("option", { name: "Payout eligible" })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "Paid", exact: true })).toHaveCount(0);
    await page.getByRole("option", { name: "Demo attended" }).click();
    await milestoneRow.getByRole("button", { name: "Save milestone" }).click();
    await expect(page.getByText("Referral milestone saved.")).toBeVisible();
    await expect.poll(async () => {
      const { data, error } = await testData.supabase
        .from("referrals")
        .select("status")
        .eq("id", referral.id)
        .single();
      if (error) throw error;
      return data.status;
    }).toBe("demo_attended");
    const { data: unpaidDemo, error: payoutError } = await testData.supabase
      .from("referral_payouts")
      .select("id")
      .eq("referral_id", referral.id);
    if (payoutError) throw payoutError;
    expect(unpaidDemo).toHaveLength(0);

    const { data: approvalEvents, error: eventsError } = await testData.supabase
      .from("integration_events")
      .select("payload")
      .eq("aggregate_id", referrer!.id)
      .eq("event_type", "referral.application.approved");
    if (eventsError) throw eventsError;
    expect(approvalEvents).toHaveLength(1);
    expect(approvalEvents?.[0]?.payload).toMatchObject({
      referral_code: code,
      referral_path: `/ref/${code}`,
    });

    const anonymous = await browser.newContext();
    try {
      const visitor = await anonymous.newPage();
      await visitor.goto(`/ref/${code}`);
      await expect(visitor).toHaveURL(new RegExp(`/signup\\?ref=${code}$`));
      const cookie = (await anonymous.cookies()).find((item) => item.name === "olea_referral_code");
      expect(cookie?.value).toBe(code);

      await page.goto("/settings/referrals");
      await row.getByRole("combobox").click();
      await page.getByRole("option", { name: "Suspend" }).click();
      await row.getByRole("button", { name: "Save" }).click();
      await expect.poll(getActiveCode).toEqual({ status: "suspended", active: [] });

      const revokedResponse = await visitor.request.get(`/ref/${code}`, {
        maxRedirects: 0,
      });
      expect(revokedResponse.headers()["location"]).toContain("/referrals?referral=invalid");
      expect(revokedResponse.headers()["set-cookie"]).toContain("Max-Age=0");
      await visitor.goto(`/ref/${code}`);
      await expect(visitor).toHaveURL(/\/referrals\?referral=invalid$/);
      await expect(
        visitor.getByRole("alert").filter({ hasText: "This referral link is invalid" }),
      ).toBeVisible();
      await expect.poll(async () =>
        (await anonymous.cookies()).find((item) => item.name === "olea_referral_code"),
      ).toBeUndefined();
    } finally {
      await anonymous.close();
    }
  });
});
