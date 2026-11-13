import { createClient } from "@supabase/supabase-js";

import { createAuthenticatedStorageState, expect, test } from "../fixtures/authenticated.fixture";
import { BoardCalendarPage, getFutureDateKey } from "../pages/board-calendar.page";

test.describe("@critical Board Calendar role boundaries", () => {
  test.setTimeout(120_000);

  test("shows the reference tabs and rejects direct writes outside each role", async ({
    baseURL, browser, testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "roots" });
    const chair = await testData.createOrganizationMember(owner);
    const executive = await testData.createOrganizationMember(owner);
    const member = await testData.createOrganizationMember(owner);
    const secondMember = await testData.createOrganizationMember(owner);
    const { count: seatCount, error: seatError } = await testData.supabase
      .from("organization_members").select("user_id", { count: "exact", head: true })
      .eq("organization_id", owner.organizationId).eq("status", "active");
    if (seatError) throw seatError;
    expect(seatCount).toBe(5);
    for (const [userId, role] of [[chair.userId, "chair"], [executive.userId, "executive"]] as const) {
      const { error } = await testData.supabase.from("organization_members")
        .update({ board_calendar_role: role })
        .eq("organization_id", owner.organizationId).eq("user_id", userId);
      if (error) throw error;
    }

    const ownerContext = await browser.newContext({
      baseURL,
      storageState: await createAuthenticatedStorageState(owner.email, owner.password, baseURL),
    });
    let sessionId: string;
    const initialDate = getFutureDateKey(12);
    const date = getFutureDateKey(-1);
    try {
      const ownerPage = await ownerContext.newPage();
      const calendar = new BoardCalendarPage(ownerPage);
      await calendar.openNewModuleCalendar();
      await calendar.calendar.selectDate(initialDate);
      await calendar.calendar.addMeeting({ title: "Role boundary meeting", category: "Board Meeting", time: "13:00" });
      await calendar.waitForSaved();
      sessionId = new URL(ownerPage.url()).searchParams.get("session") ?? "";
      expect(sessionId).toBeTruthy();
    } finally {
      await ownerContext.close();
    }

    const { data: stored, error: readError } = await testData.supabase.from("template_instances")
      .select("form_data").eq("id", sessionId).single();
    if (readError) throw readError;
    const seededData = {
      ...stored.form_data,
      meetings: (stored.form_data.meetings as Array<Record<string, unknown>>).map((meeting) =>
        meeting.date === initialDate ? { ...meeting, date } : meeting),
      tasks: [
        ...((Array.isArray(stored.form_data.tasks) ? stored.form_data.tasks : []) as Record<string, unknown>[]),
        { id: "role-task", task: "Prepare role review", status: "Not Started", due_date: date,
          responsible: "Executive", related_meeting: "Role boundary meeting", notes: "" },
      ],
    };
    const { error: seedError } = await testData.supabase.from("template_instances")
      .update({ form_data: seededData }).eq("id", sessionId);
    if (seedError) throw seedError;

    for (const account of [chair, executive, member, secondMember]) {
      const context = await browser.newContext({
        baseURL,
        storageState: await createAuthenticatedStorageState(account.email, account.password, baseURL),
      });
      try {
        const page = await context.newPage();
        await page.goto(`/modules/board-calendar?session=${sessionId}`);
        await expect(page.getByRole("tab", { name: "Calendar" })).toBeVisible();
        await expect(page.getByRole("tab", { name: "Board Packages" })).toBeVisible();
        await expect(page.getByRole("tab", { name: "Directory" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Add calendar entry" })).toHaveCount(0);
        await expect(page.getByRole("tab", { name: "Meetings" }))
          .toHaveCount(account.userId === executive.userId ? 1 : 0);
        await expect(page.getByRole("tab", { name: "Workflows" }))
          .toHaveCount(account.userId === executive.userId ? 1 : 0);
        await expect(page.getByRole("tab", { name: "Settings" })).toHaveCount(0);

        const client = createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_PUBLISHABLE_KEY!);
        const { error: signInError } = await client.auth.signInWithPassword({
          email: account.email, password: account.password,
        });
        if (signInError) throw signInError;
        const { data: forbiddenRows, error: forbiddenWrite } = await client.from("template_instances")
          .update({ form_data: { ...seededData, organization_name: "Unauthorized role change" } })
          .eq("id", sessionId).select("id");
        expect(forbiddenWrite || (forbiddenRows?.length ?? 0) === 0).toBeTruthy();

        if (account.userId === chair.userId) {
          const calendar = new BoardCalendarPage(page);
          await calendar.calendar.selectDate(date);
          await page.getByTestId("board-calendar-selected-date-panel")
            .getByRole("button", { name: "Agenda and minutes" }).click();
          const dialog = page.getByRole("dialog", { name: "Meeting documents: Role boundary meeting" });
          await dialog.getByLabel("Consent agenda", { exact: true }).fill("Chair reviewed consent items.");
          await dialog.getByRole("button", { name: "Save draft" }).click();
          await calendar.waitForSaved();
          await expect.poll(async () => {
            const { data } = await testData.supabase.from("template_instances")
              .select("form_data").eq("id", sessionId).single();
            return JSON.stringify(data?.form_data?.meeting_documents ?? []);
          }).toContain("Chair reviewed consent items.");
          await dialog.getByRole("button", { name: "Close" }).first().click();
          await calendar.chooseWorkspaceView("Board Packages");
          const packageCard = page.getByRole("heading", { name: "Role boundary meeting", exact: true })
            .locator("xpath=ancestor::section[1]");
          await packageCard.getByRole("button", { name: "Add file" }).click();
          const upload = page.getByRole("dialog", { name: "Add file to Role boundary meeting" });
          await upload.getByLabel("Document name").fill("Chair private notes");
          await upload.getByLabel("Private file upload").setInputFiles({
            name: "chair-notes.txt", mimeType: "text/plain", buffer: Buffer.from("Confidential board notes"),
          });
          await upload.getByRole("button", { name: "Add file" }).click();
          await expect(upload).toHaveCount(0);
          await calendar.waitForSaved();
          await expect.poll(async () => {
            const { data } = await testData.supabase.from("template_instances")
              .select("form_data").eq("id", sessionId).single();
            return JSON.stringify(data?.form_data?.documents ?? []);
          }).toContain("Chair private notes");
          const { data: uploadedSession, error: uploadedError } = await testData.supabase
            .from("template_instances").select("form_data").eq("id", sessionId).single();
          if (uploadedError) throw uploadedError;
          const uploadedPath = (uploadedSession.form_data.documents as Array<{
            name: string; storage_path: string;
          }>).find((document) => document.name === "Chair private notes")?.storage_path;
          expect(uploadedPath).toBeTruthy();
          testData.registerCleanup({
            label: `Chair package file ${uploadedPath}`,
            run: async () => {
              const { error } = await testData.supabase.storage.from("board-package-documents")
                .remove([uploadedPath!]);
              if (error) throw error;
            },
          });
          const { error: concurrentError } = await testData.supabase.from("template_instances")
            .update({ title: "Admin changed this calendar" }).eq("id", sessionId);
          if (concurrentError) throw concurrentError;
          await calendar.chooseWorkspaceView("Calendar");
          await calendar.calendar.selectDate(date);
          await page.getByTestId("board-calendar-selected-date-panel")
            .getByRole("button", { name: "Agenda and minutes" }).click();
          const staleDialog = page.getByRole("dialog", { name: "Meeting documents: Role boundary meeting" });
          await staleDialog.getByLabel("Consent agenda", { exact: true }).fill("Stale chair change");
          await staleDialog.getByRole("button", { name: "Save draft" }).click();
          await expect(staleDialog.getByRole("alert"))
            .toContainText("The save failed. Reload the page to get the latest changes, then try again.");
          const { data: protectedSession, error: protectedError } = await testData.supabase
            .from("template_instances").select("form_data").eq("id", sessionId).single();
          if (protectedError) throw protectedError;
          expect(JSON.stringify(protectedSession.form_data.meeting_documents)).not.toContain("Stale chair change");
        }
        if (account.userId === executive.userId) {
          await page.getByRole("tab", { name: "Workflows" }).click();
          await page.getByRole("row").filter({ hasText: "Prepare role review" })
            .getByRole("button", { name: /Advance status for task/ }).click();
          await expect.poll(async () => {
            const { data } = await testData.supabase.from("template_instances")
              .select("form_data").eq("id", sessionId).single();
            return (data?.form_data?.tasks as Array<{ id: string; status: string }>)
              ?.find((task) => task.id === "role-task")?.status;
          }).toBe("In Progress");
        }
      } finally {
        await context.close();
      }
    }
    const { data: finalSession, error: finalError } = await testData.supabase.from("template_instances")
      .select("form_data").eq("id", sessionId).single();
    if (finalError) throw finalError;
    expect(finalSession.form_data.organization_name).not.toBe("Unauthorized role change");
  });
});
