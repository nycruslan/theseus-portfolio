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

test("search engines and link previews find what they need", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const head = await page.evaluate(() => {
    const content = (selector: string) =>
      document.querySelector(selector)?.getAttribute("content") ?? "";
    const person = document.querySelector(
      'script[type="application/ld+json"]',
    )?.textContent;
    return {
      ogImage: content('meta[property="og:image"]'),
      ogTitle: content('meta[property="og:title"]'),
      canonical:
        document.querySelector('link[rel="canonical"]')?.getAttribute("href") ??
        "",
      icon:
        document.querySelector('link[rel="icon"]')?.getAttribute("href") ?? "",
      person: person
        ? (JSON.parse(person) as { "@type"?: string; name?: string })
        : null,
    };
  });
  expect(head.ogTitle).toContain(profile.name);
  expect(head.canonical).toMatch(/^https:\/\//);
  expect(head.person).toMatchObject({ "@type": "Person", name: profile.name });
  // The tags name the production host; the same paths are served here.
  const image = await request.get(new URL(head.ogImage).pathname);
  expect(image.headers()["content-type"]).toBe("image/png");
  expect((await request.get(head.icon)).ok()).toBe(true);
  expect(await (await request.get("/robots.txt")).text()).toMatch(/Sitemap:/);
  expect((await request.get("/sitemap.xml")).ok()).toBe(true);
});
