import {
  createAuthenticatedStorageState,
  expect,
  test,
} from "../fixtures/authenticated.fixture";

test.describe("@critical grant platform persistence", () => {
  test("creates, edits, and deletes a workspace draft consistently across pipeline and calendar", async ({
    page,
    testData,
    browser,
    baseURL,
    authenticatedMember,
  }) => {
    test.setTimeout(90_000);
    const grantName = `QA Community Capacity ${Date.now()}`;
    const updatedName = `${grantName} Updated`;
    const deadline = "2027-05-20";

    await page.goto("/modules/grant-platform");
    await page.getByRole("button", { name: "Add Grant" }).click();
    const dialog = page.getByRole("dialog", { name: "Add new grant" });
    await dialog.getByLabel("Grant name").fill(grantName);
    await dialog.getByLabel("Funder").fill("QA Community Foundation");
    await dialog.getByLabel("Amount requested (CAD)").fill("2500");
    await dialog.getByLabel("Application deadline").fill(deadline);
    await dialog.getByRole("button", { name: "Create Grant" }).click();

    await expect(dialog).toBeHidden();
    const { data: round, error } = await testData.supabase
      .from("grant_rounds")
      .select("id")
      .eq("name", grantName)
      .single();
    expect(error).toBeNull();
    expect(round).not.toBeNull();
    testData.registerCleanup({
      label: `grant round ${grantName}`,
      run: async () => {
        const { error: applicationError } = await testData.supabase
          .from("grant_applications")
          .delete()
          .eq("round_id", round!.id);
        if (applicationError) throw applicationError;
        const { error: cleanupError } = await testData.supabase
          .from("grant_rounds")
          .delete()
          .eq("id", round!.id);
        if (cleanupError) throw cleanupError;
      },
    });

    await page.reload();
    const pipelineRow = page.getByRole("row", { name: new RegExp(grantName) });
    await expect(pipelineRow).toContainText("QA Community Foundation");
    await expect(pipelineRow).toContainText("$2,500.00");
    await expect(pipelineRow).toContainText("May 20, 2027");
    await page.getByRole("tab", { name: "Calendar" }).click();
    await expect(page.getByText(grantName)).toBeVisible();
    await expect(page.getByText("QA Community Foundation")).toBeVisible();
    await expect(page.getByText("May 20, 2027")).toBeVisible();

    await page.getByRole("tab", { name: "Pipeline" }).click();
    await pipelineRow.getByRole("button", { name: `Edit ${grantName}` }).click();
    const editDialog = page.getByRole("dialog", { name: "Edit grant" });
    await editDialog.getByLabel("Grant name").fill(updatedName);
    await editDialog.getByLabel("Funder").fill("QA Updated Foundation");
    const amountInput = editDialog.getByLabel("Amount requested (CAD)");
    await amountInput.focus();
    await amountInput.press("ControlOrMeta+A");
    await amountInput.pressSequentially("3750.50");
    await expect(editDialog.getByLabel("Amount requested (CAD)")).toHaveValue("3750.50");
    await expect(editDialog.locator('input[name="requestedAmount"]')).toHaveValue("3750.50");
    await editDialog.getByLabel("Application deadline").fill("2027-06-30");
    await editDialog.getByLabel("Notes").fill("Updated application details");
    await editDialog.getByRole("button", { name: "Save grant" }).click();
    await expect(editDialog).toBeHidden();
    await expect.poll(async () => {
      const { data } = await testData.supabase.from("grant_rounds").select("name, public_notes, closes_at").eq("id", round!.id).single();
      return data;
    }).toMatchObject({
      name: updatedName,
      public_notes: "Funder: QA Updated Foundation\nNotes: Updated application details",
    });
    await page.reload();
    const updatedRow = page.getByRole("row", { name: new RegExp(updatedName) });
    await expect(updatedRow).toContainText("QA Updated Foundation");
    await expect(updatedRow).toContainText("$3,750.50");
    await expect(page.getByText(grantName, { exact: true })).toHaveCount(0);
    await page.getByRole("tab", { name: "Calendar" }).click();
    await expect(page.getByText(updatedName)).toBeVisible();
    await expect(page.getByText("QA Updated Foundation")).toBeVisible();
    await expect(page.getByText("Jun 30, 2027")).toBeVisible();

    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const otherOwner = await testData.createOrganizationOwner({ activeSubscription: true });
    const otherContext = await browser.newContext({
      baseURL,
      storageState: await createAuthenticatedStorageState(
        otherOwner.email,
        otherOwner.password,
        baseURL,
      ),
    });
    try {
      const otherPage = await otherContext.newPage();
      await otherPage.goto("/modules/grant-platform?tab=calendar");
      await expect(otherPage.getByText(updatedName)).toHaveCount(0);
      const { data: application } = await testData.supabase.from("grant_applications").select("id").eq("round_id", round!.id).single();
      const { error: crossOrgError } = await testData.supabase.rpc("delete_grant_planning_draft", {
        target_application_id: application!.id,
        target_organization_id: otherOwner.organizationId,
      });
      expect(crossOrgError).not.toBeNull();
    } finally {
      await otherContext.close();
    }

    const member = await testData.createOrganizationMember(authenticatedMember);
    const memberContext = await browser.newContext({
      baseURL,
      storageState: await createAuthenticatedStorageState(member.email, member.password, baseURL),
    });
    try {
      const memberPage = await memberContext.newPage();
      await memberPage.goto("/modules/grant-platform");
      await expect(memberPage.getByRole("button", { name: "Add Grant" })).toHaveCount(0);
      await expect(memberPage.getByRole("row", { name: new RegExp(updatedName) })).toContainText("QA Updated Foundation");
      await expect(memberPage.getByRole("button", { name: `Edit ${updatedName}` })).toHaveCount(0);
      await expect(memberPage.getByRole("button", { name: `Delete ${updatedName}` })).toHaveCount(0);
    } finally {
      await memberContext.close();
    }

    const { data: savedApplication } = await testData.supabase
      .from("grant_applications").select("id").eq("round_id", round!.id).eq("organization_id", authenticatedMember.organizationId).single();
    expect(savedApplication).not.toBeNull();
    const { data: sharedApplication, error: sharedError } = await testData.supabase
      .from("grant_applications")
      .insert({
        applicant_user_id: otherOwner.userId,
        cra_good_standing: true,
        expected_outcome: "A shared test opportunity",
        focus_area: "operational_capacity",
        funding_request: "Shared planning entry",
        organization_id: otherOwner.organizationId,
        registered_in_canada: true,
        requested_amount_cents: 375050,
        round_id: round!.id,
        status: "draft",
      })
      .select("id").single();
    expect(sharedError).toBeNull();
    try {
      const { error: sharedDeleteError } = await testData.supabase.rpc("delete_grant_planning_draft", {
        target_application_id: savedApplication!.id,
        target_organization_id: authenticatedMember.organizationId,
      });
      expect(sharedDeleteError).not.toBeNull();
      const { data: protectedRound } = await testData.supabase.from("grant_rounds").select("id").eq("id", round!.id).single();
      expect(protectedRound?.id).toBe(round!.id);
    } finally {
      if (sharedApplication) {
        const { error: removeSharedError } = await testData.supabase.from("grant_applications").delete().eq("id", sharedApplication.id);
        expect(removeSharedError).toBeNull();
      }
    }

    await page.getByRole("tab", { name: "Pipeline" }).click();
    await updatedRow.getByRole("button", { name: `Delete ${updatedName}` }).click();
    const deleteDialog = page.getByRole("dialog", { name: "Delete grant draft?" });
    await deleteDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(updatedRow).toBeVisible();
    await updatedRow.getByRole("button", { name: `Delete ${updatedName}` }).click();
    await deleteDialog.getByRole("button", { name: "Delete grant" }).click();
    await expect(deleteDialog).toBeHidden();
    await expect.poll(async () => {
      const { data } = await testData.supabase.from("grant_rounds").select("id").eq("id", round!.id).maybeSingle();
      return data;
    }).toBeNull();
    await page.reload();
    await expect(page.getByText(updatedName)).toHaveCount(0);
    await page.getByRole("tab", { name: "Calendar" }).click();
    await expect(page.getByText(updatedName)).toHaveCount(0);
  });
});
