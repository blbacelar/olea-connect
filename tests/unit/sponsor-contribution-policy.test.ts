import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildSponsorContributionValues } from "@/app/sponsors/action-support";

function contributionForm(status: string) {
  const form = new FormData();
  form.set("sponsorshipId", "00000000-0000-4000-8000-000000000001");
  form.set("status", status);
  form.set("amount", "100.00");
  return form;
}

describe("sponsor contribution policy", () => {
  it("rejects new grant allocations while preserving historical records", () => {
    expect(() => buildSponsorContributionValues(contributionForm("allocated"))).toThrow(
      "Choose a supported contribution status.",
    );
  });

  it("records a received contribution without allocating it", () => {
    expect(buildSponsorContributionValues(contributionForm("received"))).toEqual(
      expect.objectContaining({ status: "received", amount_cents: 10_000 }),
    );
    expect(buildSponsorContributionValues(contributionForm("received"))).not.toHaveProperty(
      "allocated_on",
    );
  });
});
