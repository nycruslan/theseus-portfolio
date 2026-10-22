import { expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";

// Sprint 23, B2.8: a mistyped address gets a page in the site's own style with one way back
// (.crew/sprint/23/contract.md, data rules: "The not-found page"), written before the build. Its
// canonical and og:url are smoke.spec.ts's, unedited; its invariants are B2.9's, with /read's.

const MISSING = "/no-such-page";

/** The 404 as the browser has it (page.evaluate only, so it works with scripts off). */
function readNotFound(page: Page) {
  return page.evaluate(() => {
    const squashed = (el: Element | null) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const main = document.querySelector("main");
    return {
      mains: document.querySelectorAll("main").length,
      mainId: main?.id ?? null,
      h1s: [...document.querySelectorAll("h1")].map((h) => ({
        text: squashed(h),
        inMain: Boolean(main?.contains(h)),
      })),
      lines: [...(main?.querySelectorAll("p") ?? [])]
        .map((p) => squashed(p))
        .filter(Boolean),
      links: [...document.querySelectorAll("a[href]")]
        .filter((a) => a.getAttribute("href") !== "#main")
        .map((a) => ({ text: squashed(a), href: a.getAttribute("href") })),
      bar: document.querySelectorAll("header nav").length,
      text: squashed(main),
      robots: [...document.querySelectorAll('meta[name="robots"]')].map(
        (m) => m.getAttribute("content") ?? "",
      ),
    };
  });
}

test('B2.8 the not-found page: 404 and noindex, its own title, main#main with the h1 "Page not found" and one line, Back to the ship then Read as page, landing home, and the same without scripts', async ({
  page,
  browser,
  request,
}) => {
  const response = await request.get(MISSING);
  expect(response.status(), `status of ${MISSING}`).toBe(404);

  await page.goto("/");
  const homeTitle = await page.title();
  const missing = await page.goto(MISSING);
  expect(missing?.status(), `status of ${MISSING} in the browser`).toBe(404);
  expect.soft(await page.title(), "the 404's title vs /'s").not.toBe(homeTitle);
  expect.soft((await page.title()).trim(), "the 404's title").not.toBe("");

  const found = await readNotFound(page);
  expect
    .soft(
      found.robots.some((content) => /\bnoindex\b/i.test(content)),
      `robots meta says noindex: ${JSON.stringify(found.robots)}`,
    )
    .toBe(true);
  expect.soft(found.mains, "main elements").toBe(1);
  expect.soft(found.mainId, "main's id").toBe("main");
  expect
    .soft(found.h1s, "the h1")
    .toEqual([{ text: "Page not found", inMain: true }]);
  expect.soft(found.lines, "lines of copy in main").toHaveLength(1);
  expect.soft(found.links, "the page's links, in order").toEqual([
    { text: "Back to the ship", href: "/" },
    { text: "Read as page", href: "/read" },
  ]);
  expect.soft(found.bar, "the bar on the 404").toBe(0);

  // Back to the ship goes home.
  const back = page.getByRole("link", {
    name: "Back to the ship",
    exact: true,
  });
  await expect.soft(back, "the Back to the ship link").toHaveCount(1);
  if ((await back.count()) === 1) {
    await back.click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.locator("h1"), "after Back to the ship").toHaveText(
      profile.name,
    );
  }

  // The same without scripts.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const bare = await context.newPage();
  const offResponse = await bare.goto(MISSING);
  const off = await readNotFound(bare);
  await context.close();
  expect.soft(offResponse?.status(), "status without scripts").toBe(404);
  expect
    .soft(
      { h1s: off.h1s, lines: off.lines, links: off.links, text: off.text },
      "the 404 without scripts",
    )
    .toEqual({
      h1s: found.h1s,
      lines: found.lines,
      links: found.links,
      text: found.text,
    });
});
