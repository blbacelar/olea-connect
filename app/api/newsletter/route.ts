import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const inputSchema = z.object({
  email: z.email().max(254),
  consent: z.literal(true),
  website: z.string().max(200).optional().default(""),
});

const buckets = new Map<string, { count: number; resetAt: number }>();
const windowMs = 60_000;

function allowSubmission(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = createHash("sha256").update(ip).digest("hex");
  const now = Date.now();
  const bucket = buckets.get(key);
  if (buckets.size > 2_000) {
    for (const [id, item] of buckets) if (item.resetAt <= now) buckets.delete(id);
    if (buckets.size > 2_000) buckets.delete(buckets.keys().next().value!);
  }
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= 5) return false;
  bucket.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  if (!allowSubmission(request)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  let input: z.infer<typeof inputSchema>;
  try {
    input = inputSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_email_or_consent" }, { status: 400 });
  }
  if (input.website) return NextResponse.json({ ok: true });

  try {
    const response = await fetch("https://www.olivesocialimpact.com/api/newsletter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: input.email.trim().toLowerCase(), website: "" }),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Newsletter provider returned ${response.status}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "provider_unavailable" }, { status: 502 });
  }
}
