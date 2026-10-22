import type { BeforeSendEvent } from "@vercel/analytics/next";

const privatePaths = [
  "/modules/board-recruitment/survey/",
  "/modules/ed-review/survey/",
  "/ref/",
  "/team/invitations/accept",
];

export function sanitizeAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const url = new URL(event.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    let path = url.pathname;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const decoded = decodeURIComponent(path);
      if (decoded === path) break;
      path = decoded;
    }
    if (path.includes("%")) return null;
    if (privatePaths.some((privatePath) => path.toLowerCase().startsWith(privatePath))) return null;

    return { ...event, url: `${url.origin}${url.pathname}` };
  } catch {
    return null;
  }
}
