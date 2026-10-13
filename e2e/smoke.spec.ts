import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { profile } from "../content/profile";

test("the home page renders the owner's name as its heading", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    profile.name,
  );
});

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`in the ${colorScheme} color scheme`, () => {
    test.use({ colorScheme });

    test("axe finds no serious or critical violations", async ({ page }) => {
      await page.goto("/");
      const { violations } = await new AxeBuilder({ page }).analyze();
      const blocking = violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => ({
          rule: v.id,
          impact: v.impact,
          help: v.help,
          targets: v.nodes.map((node) => node.target.join(" ")),
        }));
      expect(blocking).toEqual([]);
    });
  });
}

test.describe("on a 390 px wide phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("nothing overflows horizontally", async ({ page }) => {
    await page.goto("/");
    const { scrollWidth, clientWidth } = await page.evaluate(async () => {
      // Web fonts change text widths, so measure after they load.
      await document.fonts.ready;
      const root = document.documentElement;
      return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
    });
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
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
