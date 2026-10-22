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
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

    const result = await retryMembershipActivation();

    expect(fetchMock).toHaveBeenCalledWith(apiRoutes.provisioningRetry, {
      method: "POST",
    });
    expect(result.response.status).toBe(200);
    expect(result.result).toEqual({ status: "completed" });
  });

  it("does not throw when the retry endpoint returns a non-JSON response", async () => {
    const response = new Response("Service unavailable", {
      status: 503,
      headers: { "content-type": "text/plain" },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

    const result = await retryMembershipActivation();

    expect(result.response.status).toBe(503);
    expect(result.result).toEqual({});
  });
});
