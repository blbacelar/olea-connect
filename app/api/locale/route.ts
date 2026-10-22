import { NextResponse } from "next/server";
import { z } from "zod";

import {
  localeCookieName,
  supportedLocales,
} from "@/lib/i18n/locales";

const localeSchema = z.object({
  locale: z.enum(supportedLocales),
});

export async function POST(request: Request) {
  const payload = localeSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json(
      { error: "Unsupported locale." },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ locale: payload.data.locale });
  response.headers.set("Content-Language", payload.data.locale);
  response.cookies.set(localeCookieName, payload.data.locale, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
