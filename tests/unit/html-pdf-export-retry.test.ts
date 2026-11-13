import { afterEach, describe, expect, it, vi } from "vitest";

import { retryWhenExecutableBusy } from "@/lib/template-renderer/html-pdf-export";

afterEach(() => vi.useRealTimers());

describe("Chromium launch on serverless", () => {
  it("retries when another invocation is still extracting the executable", async () => {
    vi.useFakeTimers();
    const launch = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("Text file busy"), { code: "ETXTBSY" }))
      .mockResolvedValue("browser");
    const pending = retryWhenExecutableBusy(launch);
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toBe("browser");
    expect(launch).toHaveBeenCalledTimes(2);
  });

  it("does not retry unrelated launch errors", async () => {
    const error = Object.assign(new Error("Missing executable"), { code: "ENOENT" });
    const launch = vi.fn().mockRejectedValue(error);
    await expect(retryWhenExecutableBusy(launch)).rejects.toBe(error);
    expect(launch).toHaveBeenCalledTimes(1);
  });

  it("stops after five busy attempts", async () => {
    vi.useFakeTimers();
    const error = Object.assign(new Error("Text file busy"), { code: "ETXTBSY" });
    const launch = vi.fn().mockRejectedValue(error);
    const pending = retryWhenExecutableBusy(launch);
    const result = expect(pending).rejects.toBe(error);
    await vi.runAllTimersAsync();
    await result;
    expect(launch).toHaveBeenCalledTimes(5);
  });
});
