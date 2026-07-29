import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  parseSignupCheckoutInput,
  SignupValidationError,
} from "@/lib/signup-flow";

const migrationSql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260724100000_signup_referrals_consents.sql",
  ),
  "utf8",
);

const validPayload = {
  email: "owner@community.ca",
  password: "SecurePass123!",
  fullName: "Community Owner",
  organizationName: "Community Arts Society",
  province: "BC",
  organizationKind: "society",
  annualBudgetRange: "250k-500k",
  boardSizeRange: "6-10",
  phone: "+1 (604) 555-0123",
  acquisitionSource: "referral",
  referralCode: "olea-ab12cd",
  tier: "roots",
  billingCycle: "annual",
  consents: {
    terms: true,
    privacy: true,
    dataOwnership: true,
    confidentiality: true,
  },
};

describe("signup checkout contract", () => {
  it("normalizes approved signup fields before persistence", () => {
    expect(parseSignupCheckoutInput(validPayload)).toMatchObject({
      email: "owner@community.ca",
      fullName: "Community Owner",
      organizationName: "Community Arts Society",
      referralCode: "OLEA-AB12CD",
      billingCycle: "annual",
    });
  });

  it.each([
    ["unexpected top-level fields", { ...validPayload, isAdmin: true }],
    ["missing policy consent", { ...validPayload, consents: { ...validPayload.consents, privacy: false } }],
    ["invalid phone", { ...validPayload, phone: "call me" }],
    ["malformed referral", { ...validPayload, referralCode: "FREE-MONEY" }],
    ["invalid organization type", { ...validPayload, organizationKind: "company" }],
  ])("rejects %s", (_label, payload) => {
    expect(() => parseSignupCheckoutInput(payload)).toThrow(SignupValidationError);
  });

  it("rejects unexpected consent fields instead of silently ignoring them", () => {
    expect(() =>
      parseSignupCheckoutInput({
        ...validPayload,
        consents: { ...validPayload.consents, marketing: true },
      }),
    ).toThrow("Unexpected consent field");
  });
});

describe("signup persistence migration", () => {
  it("includes consent, referral, and atomic founding-member boundaries", () => {
    expect(migrationSql).toContain("create table public.referral_codes");
    expect(migrationSql).toContain("create table public.organization_referrals");
    expect(migrationSql).toContain("create table public.referral_rewards");
    expect(migrationSql).toContain("create table public.founding_member_claims");
    expect(migrationSql).toContain("create or replace function public.reserve_founding_member");
    expect(migrationSql).toContain("pg_advisory_xact_lock");
    expect(migrationSql).toContain("privacy_consents_signup_request_type_uidx");
    expect(migrationSql).toContain("mark_founding_member_paid");
  });
});
