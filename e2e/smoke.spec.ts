import { expect, test } from "@playwright/test";
import { profile } from "../content/profile";

// axe, contrast and overflow live in invariants.spec.ts, once per scheme.

test("the home page renders the owner's name as its heading", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    profile.name,
  );
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the page loads and shows its content", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");

    expect(
      await page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const sectionHeadings = page.getByRole("heading", { level: 2 });
    await expect(sectionHeadings).not.toHaveCount(0);
    for (const heading of await sectionHeadings.all()) {
      await expect(heading).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
});
