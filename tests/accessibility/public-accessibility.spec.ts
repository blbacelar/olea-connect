import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicRoutes = [
  { path: "/", name: "landing page" },
  { path: "/login", name: "login page" },
  { path: "/signup/account", name: "account creation page" },
];

test.describe("@a11y @regression public accessibility", () => {
  for (const route of publicRoutes) {
    test(`${route.name} has no serious accessibility violations`, async ({
      page,
    }) => {
      await page.goto(route.path);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blockingViolations = results.violations.filter(({ impact }) =>
        ["serious", "critical"].includes(impact ?? ""),
      );

      expect(blockingViolations).toEqual([]);
    });
  }
});
