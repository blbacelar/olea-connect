import { expect, test } from "../fixtures/browser.fixture";

test("@smoke opens and plays the Grant Platform demo on mobile in both languages", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("link", { name: "Watch module demos" }).click();
  await expect(page).toHaveURL(/\/demos$/);
  const demo = page.locator("#grant-platform");
  await expect(page.getByRole("heading", { name: "See how Olea Connects works" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Board Calendar" })).toBeVisible();
  await expect(demo.getByRole("heading", { name: "Grant Platform" })).toBeVisible();

  const video = demo.locator("video");
  await expect(video).toHaveAttribute("controls", "");
  await expect(video.locator("source")).toHaveAttribute("src", "/videos/grant-platform-demo.mp4");
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).readyState)).toBeGreaterThan(0);
  await video.evaluate(async (element) => {
    const player = element as HTMLVideoElement;
    player.muted = true;
    await player.play();
  });
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await video.evaluate((element) => (element as HTMLVideoElement).pause());
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  await page.getByTestId("locale-selector").click();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/locale") && response.ok()),
    page.getByRole("option", { name: "Français" }).click(),
  ]);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr-CA");
  await expect(demo.getByRole("heading", { name: "Plateforme de subventions" })).toBeVisible();
  await expect(demo).toContainText("Texte à l'écran en anglais");
});
