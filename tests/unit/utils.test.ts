import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("class name utility", () => {
  it("merges conditional values and resolves Tailwind conflicts", () => {
    const isHidden = false;

    expect(cn("px-2", isHidden && "hidden", "px-4", "font-semibold")).toBe(
      "px-4 font-semibold",
    );
  });
});
