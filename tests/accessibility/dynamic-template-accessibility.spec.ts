import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "../fixtures/authenticated.fixture";

test.describe("@a11y dynamic template accessibility", () => {
  test("board self-evaluation editor has no serious accessibility violations", async ({
    page,
  }) => {
    await page.goto("/templates/board-self-evaluation");
    await expect(
      page.getByRole("heading", { name: "Board Self-Evaluation" }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blockingViolations = results.violations.filter(({ impact }) =>
      ["serious", "critical"].includes(impact ?? ""),
    );
    const violationSummary = blockingViolations
      .map(({ help, id, impact, nodes }) => {
        const targets = nodes.map(({ target }) => target.join(" ")).join(", ");
        return `${id} (${impact ?? "unknown"}): ${help} [${targets}]`;
      })
      .join("\n");

    expect(
      blockingViolations,
      violationSummary || "No serious or critical violations found.",
    ).toHaveLength(0);
  });
});
