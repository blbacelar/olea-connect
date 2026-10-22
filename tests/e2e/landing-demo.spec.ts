import { expect, test } from "../fixtures/browser.fixture";

test("@smoke opens and plays the Grant Platform demo on mobile in both languages", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("link", { name: "Watch the demo" }).click();
  const demo = page.locator("#demo");
  await expect(demo).toBeInViewport();
  await expect(demo.getByRole("heading", { name: "See the Grant Platform in action." })).toBeVisible();

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
  await expect(demo.getByRole("heading", { name: "Découvrez la plateforme de subventions en action." })).toBeVisible();
  await expect(demo).toContainText("Texte à l'écran en anglais");
});
