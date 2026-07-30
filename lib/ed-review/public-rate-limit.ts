import "server-only";

type Bucket = {
  count: number;
  resetAt: number;
};

// This intentionally keys only on a hashed public campaign capability. It does
// not accept or retain an IP address, user agent, account ID, or device data.
// The small in-memory guard protects a single function instance; platform-wide
// traffic protections should additionally be configured at the edge.
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 2_000;
const WINDOW_MS = 60_000;

export function allowPublicSurveyRequest(input: {
  campaignTokenHash: string;
  operation: "load" | "submit";
}) {
  const now = Date.now();
  const key = `${input.operation}:${input.campaignTokenHash}`;
  const limit = input.operation === "submit" ? 15 : 60;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [candidateKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(candidateKey);
      }
      const oldestKey = buckets.keys().next().value;
      if (buckets.size >= MAX_BUCKETS && oldestKey) buckets.delete(oldestKey);
    }
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}
