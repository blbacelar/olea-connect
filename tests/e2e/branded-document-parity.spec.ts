import { readFile, writeFile } from "node:fs/promises";

import { expect, test } from "../fixtures/test-data.fixture";
import { BoardCalendarPage, getFutureDateKey } from "../pages/board-calendar.page";
import { createAuthenticatedPage } from "../support/auth-session";
import { inspectPdf } from "../support/pdf-inspector";

const name = "Blue Cedar Governance QA";
const address = "77 Cedar Lane, Vancouver, BC";
const phone = "+1 (604) 555-0147";
const email = "qa@bluecedar.org";
const website = "https://bluecedar.org/";
const logo = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#17365D"/><circle cx="48" cy="48" r="27" fill="#D46A38"/></svg>');

async function setBrand(page: import("@playwright/test").Page) {
  await page.goto("/settings/brand");
  await page.getByLabel("Organization name").fill(name);
  await page.getByLabel("Upload organization logo").first().setInputFiles({
    name: "blue-cedar.svg", mimeType: "image/svg+xml", buffer: logo,
  });
  await expect(page.getByText("Logo uploaded")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Primary color hex value").first().fill("#17365d");
  await page.getByLabel("Secondary color hex value").first().fill("#d46a38");
  await page.getByLabel("Footer address").fill(address);
  await page.getByLabel("Footer phone").fill(phone);
  await page.getByLabel("Footer email").fill(email);
  await page.getByLabel("Footer website").fill(website);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("button", { name: "Changes saved" })).toBeVisible();
}

test.describe("@critical branded governance documents", () => {
  test.setTimeout(180_000);

  test("Board Evaluation PDF uses the organization's complete brand", async ({
    baseURL, browser, testData,
  }, testInfo) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const session = await createAuthenticatedPage(browser, baseURL, owner.email, owner.password);
    try {
      const page = session.page;
      await setBrand(page);
      await page.goto("/modules/board-evaluation");
      await page.getByRole("button", { name: "Open evaluation" }).click();
      await page.getByRole("button", { name: "Close survey and calculate results" }).click();
      await page.getByRole("tab", { name: "Summary & action plan" }).click();
      await page.getByRole("button", { name: "Save summary" }).click();
      await expect(page.getByText("Summary and action plan saved.")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole("button", { name: "Download branded PDF" })).toBeEnabled();
      await page.getByRole("textbox", { name: "Prepared by" }).fill("Blue Cedar reviewer");
      await expect(page.getByRole("button", { name: "Download branded PDF" })).toBeDisabled();
      await page.getByRole("button", { name: "Save summary" }).click();
      await expect(page.getByRole("button", { name: "Download branded PDF" })).toBeEnabled({ timeout: 30_000 });
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("button", { name: "Download branded PDF" }).click(),
      ]);
      const path = testInfo.outputPath("board-evaluation-blue-cedar.pdf");
      await download.saveAs(path);
      const pdf = await inspectPdf(await readFile(path));
      for (const value of [name, address, phone, email, website]) {
        expect(pdf.text.replace(/\s+/g, "")).toContain(value.replace(/\s+/g, ""));
      }
    } finally {
      await session.context.close();
    }
  });

  test("Board Calendar consent agenda PDF uses the organization's complete brand", async ({
    baseURL, browser, testData,
  }, testInfo) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const session = await createAuthenticatedPage(browser, baseURL, owner.email, owner.password);
    try {
      const page = session.page;
      await setBrand(page);
      const calendar = new BoardCalendarPage(page);
      await calendar.openNewModuleCalendar();
      const brandHeader = page.getByTestId("board-calendar-brand-header");
      await expect(brandHeader.getByText(name)).toBeVisible();
      await expect(brandHeader.getByRole("img", { name: `${name} logo` })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Dashboard" })).toHaveCSS("background-color", "rgb(23, 54, 93)");
      await calendar.calendar.selectDate(getFutureDateKey(14));
      await calendar.calendar.addMeeting({ title: "Blue Cedar board meeting", category: "Board Meeting", time: "13:00" });
      await calendar.waitForSaved();
      await page.getByTestId("board-calendar-selected-date-panel").getByRole("button", { name: "Agenda and minutes" }).click();
      const dialog = page.getByRole("dialog", { name: "Meeting documents: Blue Cedar board meeting" });
      await dialog.getByLabel("Consent agenda", { exact: true }).fill("Approve previous minutes.");
      await dialog.getByRole("button", { name: "Approve for package" }).click();
      await calendar.waitForSaved();
      await dialog.getByLabel("I acknowledge that this board document is confidential before exporting it.").check();
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        dialog.getByRole("button", { name: "Export PDF" }).click(),
      ]);
      const path = testInfo.outputPath("consent-agenda-blue-cedar.pdf");
      await download.saveAs(path);
      const pdf = await inspectPdf(await readFile(path));
      for (const value of [name, address, phone, email, website]) {
        expect(pdf.text.replace(/\s+/g, "")).toContain(value.replace(/\s+/g, ""));
      }
    } finally {
      await session.context.close();
    }
  });

  test("Board Calendar security controls persist and change generated PDF access", async ({
    baseURL, browser, testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const session = await createAuthenticatedPage(browser, baseURL, owner.email, owner.password);
    try {
      const page = session.page;
      const calendar = new BoardCalendarPage(page);
      await calendar.openNewModuleCalendar();
      await page.getByRole("tab", { name: "Settings" }).click();
      const labels = ["Require acknowledgment before download", "Log every download", "Watermark exported PDFs"];
      for (const label of labels) {
        await expect(page.getByRole("checkbox", { name: label })).toBeChecked();
        await page.getByRole("checkbox", { name: label }).uncheck();
      }
      await calendar.waitForSaved();
      await page.reload();
      await page.getByRole("tab", { name: "Settings" }).click();
      for (const label of labels) await expect(page.getByRole("checkbox", { name: label })).not.toBeChecked();
      await page.getByRole("tab", { name: "Calendar" }).click();
      await calendar.calendar.selectDate(getFutureDateKey(16));
      await calendar.calendar.addMeeting({ title: "Security settings meeting", category: "Board Meeting", time: "13:00" });
      await calendar.waitForSaved();
      await page.getByTestId("board-calendar-selected-date-panel").getByRole("button", { name: "Agenda and minutes" }).click();
      const dialog = page.getByRole("dialog", { name: "Meeting documents: Security settings meeting" });
      await dialog.getByLabel("Consent agenda", { exact: true }).fill("Consent item.");
      await dialog.getByRole("button", { name: "Approve for package" }).click();
      await calendar.waitForSaved();
      await expect(dialog.getByLabel("I acknowledge that this board document is confidential before exporting it.")).toHaveCount(0);
      const [download] = await Promise.all([
        page.waitForEvent("download"), dialog.getByRole("button", { name: "Export PDF" }).click(),
      ]);
      const pdf = await inspectPdf(await readFile(await download.path()));
      expect(pdf.text).not.toContain("Prepared for");
      const { count, error } = await testData.supabase.from("audit_logs")
        .select("id", { head: true, count: "exact" })
        .eq("organization_id", owner.organizationId)
        .eq("action", "board_package.document_downloaded");
      if (error) throw error;
      expect(count).toBe(0);
      await session.context.addCookies([{ name: "olea_locale", value: "fr-CA", url: baseURL }]);
      await page.reload();
      await page.getByRole("tab", { name: "Paramètres" }).click();
      await expect(page.getByRole("checkbox", { name: "Demander une confirmation avant le téléchargement" })).not.toBeChecked();
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByRole("checkbox", { name: "Filigraner les PDF exportés" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    } finally {
      await session.context.close();
    }
  });

  test("Board Recruitment PDF uses the organization's complete brand", async ({
    baseURL, browser, testData,
  }, testInfo) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const session = await createAuthenticatedPage(browser, baseURL, owner.email, owner.password);
    try {
      await setBrand(session.page);
      const response = await session.page.request.get("/api/board-recruitment/export?view=identified");
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("application/pdf");
      const path = testInfo.outputPath("recruitment-blue-cedar.pdf");
      const bytes = await response.body();
      await writeFile(path, bytes);
      const pdf = await inspectPdf(bytes);
      for (const value of [name, address, phone, email, "bluecedar.org"]) {
        expect(pdf.text.replace(/\s+/g, "")).toContain(value.replace(/\s+/g, ""));
      }
    } finally {
      await session.context.close();
    }
  });

  test("Strategic Planning workbook PDF uses the organization's complete brand", async ({
    baseURL, browser, testData,
  }, testInfo) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    testData.registerCleanup({ label: `strategic workbook ${owner.organizationId}`, run: async () => {
      const { error } = await testData.supabase.from("strategic_workbooks")
        .delete().eq("organization_id", owner.organizationId);
      if (error) throw error;
    } });
    const session = await createAuthenticatedPage(browser, baseURL, owner.email, owner.password);
    try {
      const page = session.page;
      await setBrand(page);
      await page.goto("/modules/strategic-planning/workbook");
      await page.getByRole("tab", { name: "Template" }).click();
      await page.getByLabel("Organization name").fill(name);
      await expect(page.getByRole("button", { name: "Saved" })).toBeVisible({ timeout: 30_000 });
      const response = await page.request.get("/api/strategic-planning/workbook/print?scope=all&format=pdf");
      expect(response.status()).toBe(200);
      const bytes = await response.body();
      await writeFile(testInfo.outputPath("strategic-blue-cedar.pdf"), bytes);
      const pdf = await inspectPdf(bytes);
      for (const value of [name, address, phone, email, website]) {
        expect(pdf.text.replace(/\s+/g, "")).toContain(value.replace(/\s+/g, ""));
      }
    } finally {
      await session.context.close();
    }
  });

  test("ED Review annual PDF uses the organization's complete brand", async ({
    baseURL, browser, testData,
  }, testInfo) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const session = await createAuthenticatedPage(browser, baseURL, owner.email, owner.password);
    try {
      const page = session.page;
      await setBrand(page);
      await page.goto("/modules/ed-review");
      await page.getByRole("link", { name: "Open ED / CEO annual evaluation document" }).click();
      await page.getByRole("combobox", { name: "Member to assign" }).click();
      await page.getByRole("option", { name: owner.fullName }).click();
      await page.getByRole("combobox", { name: "Annual review role" }).click();
      await page.getByRole("option", { name: "Full template editor" }).click();
      await page.getByRole("button", { name: "Assign access" }).click();
      await expect(page.getByText("full access")).toBeVisible({ timeout: 30_000 });
      const response = await page.request.get("/api/ed-review/annual/export");
      expect(response.status()).toBe(200);
      const bytes = await response.body();
      await writeFile(testInfo.outputPath("ed-annual-blue-cedar.pdf"), bytes);
      const pdf = await inspectPdf(bytes);
      for (const value of [name, address, phone, email, website]) {
        expect(pdf.text.replace(/\s+/g, "")).toContain(value.replace(/\s+/g, ""));
      }
    } finally {
      await session.context.close();
    }
  });
});
