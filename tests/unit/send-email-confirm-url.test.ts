import { describe, expect, it } from "vitest";

import {
  appConfirmUrl,
  supabaseVerifyType,
} from "@/supabase/functions/send-email/confirm-url";

describe("send email confirmation URL", () => {
  it("routes recovery links through the app confirmation page", () => {
    expect(
      appConfirmUrl(
        {
          email_action_type: "recovery",
          redirect_to:
            "https://staging.oleaconnects.com/auth/callback?next=/update-password",
          site_url: "https://staging.oleaconnects.com",
        },
        "token-hash",
      ),
    ).toBe(
      "https://staging.oleaconnects.com/auth/confirm?token_hash=token-hash&type=recovery&next=%2Fupdate-password",
    );
  });

  it("falls back to dashboard for unsafe next paths", () => {
    expect(
      appConfirmUrl(
        {
          email_action_type: "recovery",
          redirect_to:
            "https://staging.oleaconnects.com/auth/callback?next=https://evil.example",
          site_url: "https://staging.oleaconnects.com",
        },
        "token-hash",
      ),
    ).toContain("next=%2Fdashboard");
  });

  it("maps signup actions to Supabase email verification type", () => {
    expect(supabaseVerifyType("signup")).toBe("email");
    expect(supabaseVerifyType("magiclink")).toBe("magiclink");
    expect(supabaseVerifyType("recovery")).toBe("recovery");
  });

  it("uses the Supabase email verification type in app confirmation links", () => {
    expect(
      appConfirmUrl(
        {
          email_action_type: "signup",
          redirect_to: "https://staging.oleaconnects.com/auth/callback",
          site_url: "https://staging.oleaconnects.com",
        },
        "signup-token-hash",
      ),
    ).toBe(
      "https://staging.oleaconnects.com/auth/confirm?token_hash=signup-token-hash&type=email&next=%2Fdashboard",
    );
  });
});
