import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { captureReferralCodeFromUrl } from "@/lib/referral-capture";
import { csvCell } from "@/lib/referrals/csv";
import {
  centsFromDecimal,
  decimalFromCents,
  formatReferralMoney,
  generateReferralCode,
  parseReferralCode,
  referralApplicationSchema,
  referralSettingsSchema,
} from "@/lib/referrals/domain";

const migrationSql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260821173409_referral_program.sql",
  ),
  "utf8",
);

describe("referral program domain", () => {
  it("validates and normalizes a public referral application", () => {
    const result = referralApplicationSchema.parse({
      fullName: "  Jordan Lee  ",
      email: "JORDAN@EXAMPLE.CA",
      organizationName: " Nonprofit Advisors ",
      relationshipToOlea: "I work with nonprofit executive directors.",
      payoutContact: "finance@example.ca",
      termsAccepted: "on",
    });

    expect(result).toMatchObject({
      fullName: "Jordan Lee",
      email: "jordan@example.ca",
      organizationName: "Nonprofit Advisors",
      termsAccepted: "on",
    });
  });

  it.each([
    ["missing terms", { termsAccepted: null }],
    ["invalid email", { email: "not-an-email" }],
    ["blank relationship", { relationshipToOlea: "  " }],
    ["blank payout contact", { payoutContact: " " }],
  ])("rejects %s", (_label, override) => {
    expect(() =>
      referralApplicationSchema.parse({
        fullName: "Jordan Lee",
        email: "jordan@example.ca",
        organizationName: "",
        relationshipToOlea: "I work with nonprofit leaders.",
        payoutContact: "finance@example.ca",
        termsAccepted: "on",
        ...override,
      }),
    ).toThrow();
  });

  it("validates payout settings as formatted numeric inputs", () => {
    expect(
      referralSettingsSchema.parse({
        programEnabled: "on",
        demoAttendedPayout: "100.00",
        retainedCustomerPayout: "400.00",
        retentionDays: "90",
        contactEmail: "referrals@olivesocialimpact.com",
        termsUrl: "https://oleaconnects.com/legal/referrals",
      }),
    ).toMatchObject({
      programEnabled: true,
      demoAttendedPayout: "100.00",
      retainedCustomerPayout: "400.00",
      retentionDays: 90,
    });

    expect(() =>
      referralSettingsSchema.parse({
        programEnabled: "false",
        demoAttendedPayout: "$100",
        retainedCustomerPayout: "400.00",
        retentionDays: "90",
        contactEmail: "referrals@olivesocialimpact.com",
        termsUrl: "",
      }),
    ).toThrow();
  });

  it("formats and parses referral money and codes", () => {
    expect(centsFromDecimal("100.00")).toBe(10000);
    expect(decimalFromCents(40000)).toBe("400.00");
    expect(formatReferralMoney(50000)).toBe("$500.00");

    const code = generateReferralCode();
    expect(code).toMatch(/^OLEA-[A-Z0-9]{6,16}$/);
    expect(parseReferralCode(code.toLowerCase())).toBe(code);
  });
});

describe("referral capture", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers a fresh URL referral code over stale browser storage", () => {
    const storage = new Map<string, string>([
      ["olea-referral-code", "OLEA-STALE123"],
    ]);
    const localStorage = {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    };

    vi.stubGlobal("window", {
      location: { search: "?ref=OLEA-FRESH456" },
      localStorage,
    });
    vi.stubGlobal("document", { cookie: "" });

    expect(captureReferralCodeFromUrl()).toBe("OLEA-FRESH456");
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "olea-referral-code",
      "OLEA-FRESH456",
    );
  });
});

describe("referral export", () => {
  it.each(["=cmd", "+SUM(A1:A2)", "-10+20", "@HYPERLINK(\"bad\")"])(
    "neutralizes spreadsheet formula value %s",
    (value) => {
      expect(csvCell(value)).toBe(`"'${value.replace(/"/g, '""')}"`);
    },
  );
});

describe("referral program migration", () => {
  it("creates the referral tables, RLS boundary, and lifecycle function", () => {
    expect(migrationSql).toContain("create table public.referrers");
    expect(migrationSql).toContain("create table public.referral_links");
    expect(migrationSql).toContain("create table public.referrals");
    expect(migrationSql).toContain("create table public.referral_payouts");
    expect(migrationSql).toContain("enable row level security");
    expect(migrationSql).toContain("revoke all on public.referrals from public, anon, authenticated");
    expect(migrationSql).toContain("create or replace function public.record_partner_signup_referral");
    expect(migrationSql).toContain("self_referral_rejected");
    expect(migrationSql).toContain("on conflict (referred_provisioning_request_id)");
  });

  it("keeps partner referral status monotonic on provisioning replay", () => {
    expect(migrationSql).toContain(
      "when public.referrals.status in ('lead_created', 'demo_booked', 'subscription_started')",
    );
    expect(migrationSql).not.toContain("public.referral_status");
    expect(migrationSql).toContain("else public.referrals.status");
  });
});
