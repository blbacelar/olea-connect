import { expect, test } from "../fixtures/browser.fixture";

test("@smoke opens the demo library and plays both product videos", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Explore all demos" }).click();
  await expect(page).toHaveURL(/\/demos$/);
  await expect(page.getByRole("heading", { name: "See how Olea Connects works" })).toBeVisible();

  for (const [id, src] of [
    ["board-calendar", "/videos/board-calendar-demo.mp4"],
    ["grant-platform", "/videos/grant-platform-demo.mp4"],
  ]) {
    const section = page.locator(`#${id}`);
    const video = section.locator("video");
    await expect(video).toHaveAttribute("controls", "");
    await expect(video.locator("source")).toHaveAttribute("src", src);
    await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).readyState)).toBeGreaterThan(0);
    await video.evaluate(async (element) => {
      const player = element as HTMLVideoElement;
      player.muted = true;
      await player.play();
    });
    await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
    await video.evaluate((element) => (element as HTMLVideoElement).pause());
  }
});

test("@smoke keeps the demo library readable in French on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demos");
  await page.getByTestId("locale-selector").click();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/locale") && response.ok()),
    page.getByRole("option", { name: "Français" }).click(),
  ]);

  await expect(page.locator("html")).toHaveAttribute("lang", "fr-CA");
  await expect(page.getByRole("heading", { name: "Découvrez Olea Connects en action" })).toBeVisible();
  await expect(page.locator("#board-calendar")).toContainText("Calendrier du conseil");
  await expect(page.locator("#grant-platform")).toContainText("Plateforme de subventions");
  await expect(page.locator("#board-calendar")).toContainText("Texte à l'écran en anglais");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
