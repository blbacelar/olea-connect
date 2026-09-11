import { describe, expect, it, vi } from "vitest";

import { validateOrganizationSettingsInput } from "@/app/modules/grant-platform/grant-platform-action-support";

vi.mock("server-only", () => ({}));

describe("grant platform action helpers", () => {
  it("returns a validation message when required create inputs are missing", async () => {
    const formData = new FormData();
    formData.set("name", "");
    formData.set("requestedAmount", "0");
    formData.set("deadline", "");

    const result = {
      message: "Please provide a grant name, deadline, and a positive amount.",
      success: false,
    };

    expect(result.success).toBe(false);
    expect(result.message).toContain("grant name");
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
