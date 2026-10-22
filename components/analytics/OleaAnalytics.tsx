"use client";

import { Analytics } from "@vercel/analytics/next";

import { sanitizeAnalyticsEvent } from "@/lib/analytics";

export function OleaAnalytics() {
  return <Analytics beforeSend={sanitizeAnalyticsEvent} />;
}
