import { describe, expect, it } from "vitest";

import {
  applyAuthCookieDuration,
  AUTH_REMEMBER_MAX_AGE_SECONDS,
  getRememberPreferenceCookieOptions,
} from "@/utils/supabase/auth-cookie-options";

describe("auth cookie duration", () => {
  it("sets a 30-day max age when remember me is enabled", () => {
    expect(
      applyAuthCookieDuration(
        {
          expires: new Date("2030-01-01T00:00:00.000Z"),
          maxAge: 400 * 24 * 60 * 60,
          path: "/",
          sameSite: "lax",
        },
        true,
      ),
    ).toEqual({
      maxAge: AUTH_REMEMBER_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
    });
  });

  it("removes persistent expiry when remember me is disabled", () => {
    expect(
      applyAuthCookieDuration(
        {
          expires: new Date("2030-01-01T00:00:00.000Z"),
          maxAge: 400 * 24 * 60 * 60,
          path: "/",
          sameSite: "lax",
        },
        false,
      ),
    ).toEqual({
      path: "/",
      sameSite: "lax",
    });
  });

  it("keeps deletion cookies intact so stale auth chunks are removed", () => {
    const expires = new Date("1970-01-01T00:00:00.000Z");

    expect(
      applyAuthCookieDuration(
        {
          expires,
          maxAge: 0,
          path: "/",
          sameSite: "lax",
        },
        false,
      ),
    ).toEqual({
      expires,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
    });
  });

  it("persists the remember preference for 30 days", () => {
    expect(getRememberPreferenceCookieOptions(true)).toEqual({
      maxAge: AUTH_REMEMBER_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
    });
  });

  it("clears the remember preference when it is disabled", () => {
    expect(getRememberPreferenceCookieOptions(false)).toEqual({
      maxAge: 0,
      path: "/",
      sameSite: "lax",
    });
  });
});
