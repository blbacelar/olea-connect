import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const [sourceFile, outputFile] = process.argv.slice(2);
if (!sourceFile || !outputFile) {
  throw new Error("Usage: node scripts/qa-board-calendar-final-views.mjs <html> <output.json>");
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve(sourceFile)).href);
  await page.locator("a[data-view]").first().waitFor();
  const views = await page.locator("a[data-view]").evaluateAll((links) => links.map((link) => ({
    key: link.getAttribute("data-view"),
    label: link.textContent?.replace(/\s+/g, " ").trim(),
  })).filter((view, index, all) => all.findIndex((item) => item.key === view.key) === index));
  const inventory = [];
  for (const view of views) {
    await page.locator(`a[data-view="${view.key}"]`).first().click();
    inventory.push({
      ...view,
      controls: await page.locator("main input, main select, main textarea, #main input, #main select, #main textarea")
        .evaluateAll((elements) => elements.map((element) => ({
          tag: element.tagName.toLowerCase(),
          type: element.getAttribute("type"),
          name: element.getAttribute("name"),
          id: element.id,
          field: element.getAttribute("data-field"),
          label: element.closest("label")?.textContent?.replace(/\s+/g, " ").trim()
            || element.getAttribute("aria-label") || element.getAttribute("placeholder") || "",
          context: element.parentElement?.textContent?.replace(/\s+/g, " ").trim().slice(0, 140) || "",
          markup: element.outerHTML.slice(0, 350),
        }))),
      actions: await page.locator("main button, #main button")
        .evaluateAll((buttons) => buttons.map((button) => button.textContent?.replace(/\s+/g, " ").trim()).filter(Boolean)),
    });
  }
  await writeFile(resolve(outputFile), `${JSON.stringify(inventory, null, 2)}\n`);
  process.stdout.write(inventory.map((view) => `${view.label}: ${view.controls.length} controls, ${view.actions.length} actions`).join("\n") + "\n");
} finally {
  await browser.close();
}
