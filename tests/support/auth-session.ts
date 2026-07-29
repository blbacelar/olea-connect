import type { Browser, Page } from "@playwright/test";

import { createAuthenticatedStorageState } from "../fixtures/authenticated.fixture";

const authenticatedVideoDir =
  process.env.PLAYWRIGHT_VIDEO === "on"
    ? (process.env.PLAYWRIGHT_AUTH_VIDEO_DIR ?? "test-results/authenticated-videos")
    : undefined;

export async function signInPage(
  page: Page,
  baseURL: string,
  email: string,
  password: string,
) {
  const storage = await createAuthenticatedStorageState(email, password, baseURL);
  await page.context().clearCookies();
  await page.context().addCookies(storage.cookies);
}

export async function createAuthenticatedPage(
  browser: Browser,
  baseURL: string,
  email: string,
  password: string,
) {
  const context = await browser.newContext({
    recordVideo: authenticatedVideoDir
      ? {
          dir: authenticatedVideoDir,
          size: { width: 1280, height: 720 },
        }
      : undefined,
    storageState: await createAuthenticatedStorageState(email, password, baseURL),
  });
  const page = await context.newPage();

  return { context, page };
}
