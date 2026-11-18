import { expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";
import { sweptAt } from "../lib/trials-sweep";
import { frameReady, GAP, measureInFrame, type Win } from "./trials";

// Sprint 76: the trials page logs nothing (.crew/sprint/76/contract.md, T36), written before the
// build. The frame is sandboxed without allow-scripts, so each executable script in its document
// is refused with a console error ("Blocked script execution in '…/trials/frame'"): 46 locally on
// main, 48 on production. Playwright's page console carries the frame's messages too.
//
// The frame's main holds /'s JSON-LD (`<script type="application/ld+json">`), which T2 requires
// character for character and which the sandbox never refuses, since a data block doesn't run. So
// "no <script> element" reads as no script but that data block.

const ROUTES: readonly [string, Win][] = [
  ["/trials", [1440, 900]],
  ["/trials/320x568", GAP],
];
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const;
const DATA_BLOCK = /\btype="application\/ld\+json"/;

/** One line per distinct item with its count, so 48 refusals read as one line, not 48. */
function tally(items: readonly string[]) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts].map(([item, n]) => `${n} × ${item}`);
}

const HREFS = profile.links.map((link) => link.href);

/** The frame's name (its header's h1) and the contact links shown in its header. */
function drawnInFrame(page: Page) {
  return page.evaluate((hrefs) => {
    const doc = (
      document.querySelector("main iframe") as HTMLIFrameElement | null
    )?.contentDocument;
    const header = doc?.querySelector("main > header");
    const shown = (el: Element | null | undefined) =>
      Boolean(
        el?.checkVisibility({
          opacityProperty: true,
          visibilityProperty: true,
        }),
      );
    const h1 = header?.querySelector("h1");
    return {
      name: shown(h1) ? (h1?.textContent ?? "").trim() : null,
      links: hrefs.filter((href) =>
        shown(header?.querySelector(`a[href="${href}"]`)),
      ),
    };
  }, HREFS);
}

test("T36 the trials page logs nothing: on /trials and /trials/320x568, at 390x844 and 1440x900, from load to rest + 2 s, no console error or warning and no page error in the page or its frame; /trials/frame's HTML has no script but /'s JSON-LD; the frame still draws / (the name block and the contact links in it, the freeboard the sweep's)", async ({
  browser,
  request,
}) => {
  test.setTimeout(90_000);

  // The frame's document, as the server sends it.
  const frame = await request.get("/trials/frame");
  expect(frame.status(), "status of /trials/frame").toBe(200);
  const scripts = [...(await frame.text()).matchAll(/<script\b[^>]*>/gi)]
    .map((m) => m[0])
    .filter((tag) => !DATA_BLOCK.test(tag));
  expect
    .soft(
      tally(scripts.map((tag) => tag.replace(/\bsrc="[^"]*"/, 'src="…"'))),
      `<script> elements in /trials/frame's HTML other than the JSON-LD data block (${scripts.length})`,
    )
    .toEqual([]);

  for (const viewport of VIEWPORTS) {
    for (const [route, win] of ROUTES) {
      const where = `${route} at ${viewport.width} x ${viewport.height}`;
      const ctx = await browser.newContext({ viewport });
      const page = await ctx.newPage();
      const logged: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error" || m.type() === "warning")
          logged.push(`${m.type()} in ${m.location().url}: ${m.text()}`);
      });
      page.on("pageerror", (e) => logged.push(`page error: ${e.message}`));

      expect(
        (await page.goto(route, { waitUntil: "load" }))?.status(),
        `status of ${where}`,
      ).toBe(200);
      expect
        .soft(await frameReady(page), `the frame parsed, ${where}`)
        .toBe(true);
      // Rest as T8 reads it: loaded, the frame parsed with its fonts ready, then 2 s.
      await new Promise((done) => setTimeout(done, 2000));

      expect
        .soft(
          tally(logged),
          `console errors and warnings and page errors on ${where} (${logged.length})`,
        )
        .toEqual([]);

      // The frame still draws /: the name block and the contact links in its header, visible.
      const drawn = await drawnInFrame(page);
      expect
        .soft(drawn, `the frame's name block and contact links, ${where}`)
        .toEqual({ name: profile.name, links: HREFS });

      // The freeboard unchanged: the readout and the frame's own measure are the sweep's.
      const swept = sweptAt(win[0], win[1]);
      expect.soft(swept, `the sweep holds ${win[0]} x ${win[1]}`).toBeDefined();
      // The readout's, as T3 reads it: the first [data-freeboard] (the chart's pins follow it).
      const shown = await page.evaluate(
        () =>
          document
            .querySelector("[data-freeboard]")
            ?.getAttribute("data-freeboard") ?? null,
      );
      expect
        .soft(
          Number(shown),
          `[data-freeboard] "${shown}" against the sweep's ${swept?.freeboard}, ${where}`,
        )
        .toBeCloseTo(swept?.freeboard ?? Number.NaN, 1);
      const inFrame = await measureInFrame(page);
      expect
        .soft(
          Math.abs(
            (inFrame?.freeboard ?? Number.NaN) - (swept?.freeboard ?? 0),
          ),
          `the measure inside the frame (${inFrame?.freeboard}) against the sweep's ${swept?.freeboard}, ${where}`,
        )
        .toBeLessThanOrEqual(0.5);
      await ctx.close();
    }
  }
});
