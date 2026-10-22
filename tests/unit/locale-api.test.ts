import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/locale/route";
import { localeCookieName } from "@/lib/i18n/locales";

describe("locale API", () => {
  it("stores a supported manual locale", async () => {
    const response = await POST(
      new Request("http://localhost/api/locale", {
        method: "POST",
        body: JSON.stringify({ locale: "fr-CA" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ locale: "fr-CA" });
    expect(response.headers.get("Content-Language")).toBe("fr-CA");

    const cookie = response.headers.get("Set-Cookie") ?? "";
    expect(cookie).toContain(`${localeCookieName}=fr-CA`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
  });

  it("rejects unsupported locales", async () => {
    const response = await POST(
      new Request("http://localhost/api/locale", {
        method: "POST",
        body: JSON.stringify({ locale: "pt-BR" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Unsupported locale.",
    });
  });
});
