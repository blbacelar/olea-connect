import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const localBaseUrl = "http://127.0.0.1:3011";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? localBaseUrl;
const videoMode = process.env.PLAYWRIGHT_VIDEO === "on" ? "on" : "retain-on-failure";
const slowMo = Number.parseInt(process.env.PLAYWRIGHT_SLOWMO_MS ?? "0", 10);

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  outputDir: "test-results",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],
  use: {
    baseURL,
    launchOptions: Number.isFinite(slowMo) && slowMo > 0 ? { slowMo } : undefined,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: videoMode,
  },
  webServer:
    baseURL === localBaseUrl &&
    process.env.PLAYWRIGHT_SKIP_WEBSERVER !== "true"
      ? {
          command: "npm run build && npm run start -- -p 3011",
          env: {
            ...process.env,
            NEXT_PUBLIC_SITE_URL: localBaseUrl,
          },
          url: localBaseUrl,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        }
      : undefined,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
