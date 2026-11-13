import { readFile } from "node:fs/promises";

import { test, expect } from "../fixtures/test-data.fixture";
import { signInPage } from "../support/auth-session";
import { inspectPdf } from "../support/pdf-inspector";

test("Roots exports branded Grant and KPI PDFs", async ({ page, baseURL, testData }) => {
  test.setTimeout(90_000);
  if (!baseURL) throw new Error("Playwright baseURL is required.");
  const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "roots" });
  await signInPage(page, baseURL, owner.email, owner.password);

  await page.goto("/modules/grant-platform");
  await expect(page.getByRole("heading", { name: "Grant platform workspace" })).toBeVisible();
  const grantDownload = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export Board Report" }).click();
  const grantPdf = await inspectPdf(await readFile(await (await grantDownload).path()));
  expect(grantPdf.text).toContain(owner.organizationName);
  expect(grantPdf.pageCount).toBeGreaterThanOrEqual(1);

  await page.goto("/modules/kpi-dashboard");
  await expect(page.getByRole("heading", { name: "KPI Dashboard and Board Reporting" })).toBeVisible();
  const kpiDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export KPI report as PDF" }).click();
  const kpiPdf = await inspectPdf(await readFile(await (await kpiDownload).path()));
  expect(kpiPdf.text).toContain(owner.organizationName);
  expect(kpiPdf.pageCount).toBeGreaterThanOrEqual(1);
});
