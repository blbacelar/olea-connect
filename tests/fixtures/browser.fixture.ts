import { test as base, expect } from "@playwright/test";

const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
const targetOrigin = resolveTargetOrigin();

function resolveTargetOrigin() {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL;
  if (!baseURL) return null;

  try {
    return new URL(baseURL).origin;
  } catch {
    return null;
  }
}

export const test = base.extend({
  page: async ({ page }, use) => {
    if (bypassSecret && targetOrigin) {
      await page.route("**/*", async (route) => {
        const request = route.request();
        const requestOrigin = new URL(request.url()).origin;

        if (requestOrigin !== targetOrigin) {
          await route.continue();
          return;
        }

        await route.continue({
          headers: {
            ...request.headers(),
            "x-vercel-protection-bypass": bypassSecret,
          },
        });
      });
    }

    await use(page);
  },
});

export { expect };
