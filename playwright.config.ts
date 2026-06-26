import { defineConfig, devices } from "@playwright/test";

const localBaseUrl = "http://127.0.0.1:3011";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? localBaseUrl;

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
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer:
    baseURL === localBaseUrl &&
    process.env.PLAYWRIGHT_SKIP_WEBSERVER !== "true"
      ? {
          command: "npm run build && npm run start -- -p 3011",
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
