import { createHash } from "node:crypto";

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
  const titleHash = createHash("sha256")
    .update(testInfo.title)
    .digest("hex")
    .slice(0, 8);
  const shortTitle = (compact(testInfo.title) || "test")
    .slice(0, 23)
    .replace(/-$/, "");
  const testId = `${shortTitle}-${titleHash}`;
  const marker = `e2e-${runId}-w${testInfo.parallelIndex}-r${testInfo.retry}-n${sequence}-${testId}`;
  const emailHash = createHash("sha256").update(marker).digest("hex").slice(0, 8);
  const emailLocalPart = `${marker.slice(0, 55)}-${emailHash}`;

  return {
    marker,
    email: `${emailLocalPart}@example.com`,
    fullName: `QA Owner ${testInfo.parallelIndex}`,
    organizationName: `Olea QA ${marker}`,
    password: "StrongPass123!",
  };
}
