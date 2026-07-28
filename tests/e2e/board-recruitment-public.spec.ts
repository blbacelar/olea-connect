import { expect, test } from "@playwright/test";

test("rejects an invalid or expired board recruitment survey token", async ({
  page,
}) => {
  await page.goto("/modules/board-recruitment/survey/not-a-real-token");

  await expect(
    page.getByRole("heading", { name: "Survey link unavailable" }),
  ).toBeVisible();
  await expect(page.getByText(/expired or is no longer active/i)).toBeVisible();
});
