import { describe, expect, it, vi } from "vitest";

import { parseGrantCreationForm, validateOrganizationSettingsInput } from "@/app/modules/grant-platform/grant-platform-action-support";

vi.mock("server-only", () => ({}));

describe("grant platform action helpers", () => {
  it("returns a validation message when required create inputs are missing", () => {
    const formData = new FormData();
    formData.set("name", "");
    formData.set("requestedAmount", "0");
    formData.set("deadline", "");

    const result = parseGrantCreationForm(formData);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("grant name");
  });

  it("rejects malformed amounts and dates before persistence", () => {
    const formData = new FormData();
    formData.set("name", "Community Grant");
    formData.set("deadline", "2027-05-20");
    formData.set("requestedAmount", "1,000abc");
    expect(parseGrantCreationForm(formData).ok).toBe(false);
    formData.set("requestedAmount", "1000.25");
    formData.set("deadline", "2027-02-30");
    expect(parseGrantCreationForm(formData)).toMatchObject({ ok: false, message: "Choose a valid application deadline." });
    formData.set("deadline", "2020-01-01");
    expect(parseGrantCreationForm(formData)).toMatchObject({ ok: false, message: "The application deadline cannot be in the past." });
    formData.set("deadline", "2027-05-20");
    expect(parseGrantCreationForm(formData)).toMatchObject({ ok: true, requestedAmountCents: 100025 });
  });

  it("validates and normalizes grant organization profile fields", () => {
    const result = validateOrganizationSettingsInput({
      boardChairEmail: "CHAIR@EXAMPLE.ORG",
      boardChairName: "Sam Chair",
      boardChairPhone: "6045550123",
      boardChairUserId: "11111111-1111-4111-8111-111111111111",
      charityRegistrationNumber: "123456789rr0001",
      fundingSources: ["Government Funding", "Unsupported Source"],
      organizationType: "Growing ($250K-$1M)",
      revenueCents: 12500000,
      revenueText: "$125,000.00",
      societyNumber: "s-12345",
    });

    expect(result).toMatchObject({
      boardChairEmail: "chair@example.org",
      boardChairName: "Sam Chair",
      boardChairUserId: "11111111-1111-4111-8111-111111111111",
      charityRegistrationNumber: "123456789RR0001",
      fundingSources: ["Government Funding"],
      ok: true,
      societyNumber: "S-12345",
    });
  });

  it("rejects malformed charity numbers", () => {
    expect(
      validateOrganizationSettingsInput({
        boardChairEmail: "",
        boardChairName: "Sam Chair",
        boardChairPhone: "letters",
        boardChairUserId: null,
        charityRegistrationNumber: "abc",
        fundingSources: [],
        organizationType: "Growing ($250K-$1M)",
        revenueCents: null,
        revenueText: "",
        societyNumber: "",
      }),
    ).toMatchObject({
      ok: false,
      message: "Enter a valid CRA charity number, for example 123456789RR0001.",
    });
  });

  it("rejects malformed board chair phone numbers", () => {
    expect(
      validateOrganizationSettingsInput({
        boardChairEmail: "",
        boardChairName: "Sam Chair",
        boardChairPhone: "letters",
        boardChairUserId: null,
        charityRegistrationNumber: "123456789RR0001",
        fundingSources: [],
        organizationType: "Growing ($250K-$1M)",
        revenueCents: null,
        revenueText: "",
        societyNumber: "",
      }),
    ).toMatchObject({
      ok: false,
      message: "Board chair phone must be a valid phone number.",
    });
  });
});
