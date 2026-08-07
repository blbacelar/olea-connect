import { describe, expect, it } from "vitest";

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
});
