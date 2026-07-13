import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRoutes } from "@/lib/api-routes";
import { retryMembershipActivation } from "@/lib/provisioning/client";

describe("provisioning client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("posts to the provisioning retry endpoint and returns the parsed result", async () => {
    const response = new Response(JSON.stringify({ status: "completed" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(response);

    const result = await retryMembershipActivation();

    expect(fetchMock).toHaveBeenCalledWith(apiRoutes.provisioningRetry, {
      method: "POST",
    });
    expect(result.response.status).toBe(200);
    expect(result.result).toEqual({ status: "completed" });
  });
});
