import type { TestInfo } from "@playwright/test";

function compact(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32)
    .replace(/^-|-$/g, "");
}

export function createTestIdentity(testInfo: TestInfo, sequence = 0) {
  const runId =
    process.env.GITHUB_RUN_ID ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const testId = compact(testInfo.title) || "test";
  const marker = `e2e-${runId}-w${testInfo.parallelIndex}-r${testInfo.retry}-n${sequence}-${testId}`;

  return {
    marker,
    email: `${marker}@example.com`,
    fullName: `QA Owner ${testInfo.parallelIndex}`,
    organizationName: `Olea QA ${marker}`,
    password: "StrongPass123!",
  };
}
