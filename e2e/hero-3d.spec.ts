import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { parseColor, type Rgb, resolvedBackground, SCHEMES } from "./helpers";
import { readPlanks } from "./hull";
import {
  type Bounds,
  bounds,
  decodePng,
  type Image,
  litMask,
  meanDifference,
  medianAt,
  pixel,
  unmatched,
} from "./pixels";
import {
  BOX,
  boxRect,
  CANVAS,
  drawCount,
  type HarnessWindow,
  HULL,
  openRun,
  type RunOptions,
  sleep,
} from "./webgl";

// Sprint 10, Part B of the hero: the WebGL upgrade. The contract is .studio/sprint/9/contract.md
// (C10 to C15 and C17; C16 is process), standing on .studio/sprint/9/spike-probe.md. One test per
// check, named by its number. Hooks the build has to give: `[data-hero] canvas` (the upgrade),
// `data-hero-shear` on the box (the current shear, 3 decimals, gone with the canvas), and the
// `[data-hero-hull]` / `[data-hero-plank]` / `[data-hero-copper]` in the SVG. How each check is
// read, and what the build can rely on: .studio/sprint/10/probe-checks.md. Sprint 16 (B1.10) moved
// C11's air numbers and C13's copper reading to the new hull, retired C13.4's loudness ceiling and
// C11's air ceiling and centring, and added C12's draws per frame and C15's chunk size; the list is
// .studio/sprint/16/specs-probe.md.
//
// These specs do not depend on whether the browser itself refuses `failIfMajorPerformanceCaveat:
// true` (the sandbox's Chromium 141 does, CI's 156 grants it; C17 reports which). They strip the
// flag where a run needs a context and simulate the refusal with `refuseCaveat` where one is
// needed. Every run uses devicePixelRatio 1 and reads pixels from `page.screenshot` only. Where a test hides the SVG, it is to measure the canvas alone, whatever
// the build does with the SVG once the canvas is up.

const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

/** The soft form of `expect.poll`, so one wrong reading doesn't hide the next. */
const softly = expect.configure({ soft: true });

type Rect = { left: number; top: number; right: number; bottom: number };

// The runs a test opened are closed after it, pass or fail.
const opened: { close(): Promise<unknown> }[] = [];
test.afterEach(async () => {
  for (const run of opened.splice(0)) await run.close().catch(() => undefined);
});

async function open(
  browser: Parameters<typeof openRun>[0],
  options?: RunOptions,
) {
  const run = await openRun(browser, options);
  opened.push(run);
  return run;
}

/** A run with the canvas up: the control run of the contract (1440 x 900, 8 cores, 8 GB, granted). */
async function upRun(
  browser: Parameters<typeof openRun>[0],
  options?: RunOptions,
) {
  const run = await open(browser, options);
  await run.load();
  await expect(
    run.page.locator(CANVAS),
    "a canvas in [data-hero] after load (the control run)",
  ).toHaveCount(1, { timeout: 10_000 });
  return run;
}

const clipOf = (r: Rect) => ({
  x: Math.round(r.left),
  y: Math.round(r.top),
  width: Math.round(r.right - r.left),
  height: Math.round(r.bottom - r.top),
});

const shearOf = async (page: Page) => {
  const value = await page.locator(BOX).getAttribute("data-hero-shear");
  // Number(null) is 0, which would pass for the middle of the turn.
  return value === null ? Number.NaN : Number(value);
};

/** The hero's box, from a page with scripts off, where `boundingBox()` would hang. */
async function plainBox(page: Page) {
  return page.evaluate((box) => {
    const r = document.querySelector(box)?.getBoundingClientRect();
    return r
      ? {
          left: r.left + scrollX,
          top: r.top + scrollY,
          right: r.right + scrollX,
          bottom: r.bottom + scrollY,
        }
      : null;
  }, BOX);
}

async function ground(page: Page): Promise<Rgb> {
  const parsed = parseColor(await resolvedBackground(page));
  expect(parsed, "--background resolves").not.toBeNull();
  return [parsed?.[0] ?? 0, parsed?.[1] ?? 0, parsed?.[2] ?? 0];
}

/** Hides the SVG and waits out any fade, so a screenshot shows the canvas and nothing under it. */
async function isolateCanvas(page: Page) {
  await page.addStyleTag({
    content: `${BOX} svg { visibility: hidden !important; }`,
  });
  await page.waitForFunction(
    (box) =>
      document.querySelector(box)?.getAnimations({ subtree: true }).length ===
      0,
    BOX,
  );
}

async function scrollAndSettle(page: Page, y: number, shear: number) {
  await page.evaluate((top) => scrollTo(0, top), y);
  await softly
    .poll(() => shearOf(page), {
      message: `data-hero-shear at scrollY ${y.toFixed(1)}, want ${shear}`,
      timeout: 4000,
    })
    .toBeCloseTo(shear, 2);
  // The frame that draws the pose has to reach the compositor before a screenshot.
  await sleep(150);
}

type Pose = {
  shear: number;
  image: Image;
  mask: Uint8Array;
  lit: Bounds | null;
};

/** The canvas at shear +0.24, 0 and -0.24, as the lit silhouette of a full-page screenshot clip. */
async function poses(page: Page, box: Rect, background: Rgb): Promise<Pose[]> {
  const out: Pose[] = [];
  for (const [f, shear] of [
    [0, 0.24],
    [0.5, 0],
    [1, -0.24],
  ] as const) {
    await scrollAndSettle(page, f * box.bottom, shear);
    // fullPage with a clip in document coordinates: at -0.24 the box is above the viewport.
    const image = decodePng(
      await page.screenshot({ fullPage: true, clip: clipOf(box) }),
    );
    const mask = litMask(image, background);
    out.push({ shear, image, mask, lit: bounds(mask, image.width) });
  }
  return out;
}

const within = (a: number[] | null, b: number[] | null, limit: number) =>
  a && b
    ? Math.max(...a.map((v, i) => Math.abs(v - (b[i] ?? 0)))) <= limit
    : false;

// ---------------------------------------------------------------------------------------------

test("C10. The upgrade: a canvas after load, the box doesn't move, aria-hidden, one short fade, and only when near", async ({
  browser,
}) => {
  test.setTimeout(240_000);
  let chunkUrl = "";

  for (const cpu of [1, 4]) {
    const run = await open(browser, { watch: true, cpu });
    await run.load();
    const where = cpu === 1 ? "" : ` at ${cpu}x CPU`;
    await expect
      .soft(
        run.page.locator(CANVAS),
        `a canvas in [data-hero] within 5 s of the chunk request${where}`,
      )
      .toHaveCount(1, { timeout: 10_000 });
    // Load plus 3 s: long enough for the swap, and the window CLS is read over.
    await sleep(3000);

    // 1. Requested after load, and the canvas soon after.
    const report = await run.scripts();
    const shaderScripts = report.list.filter((s) => s.hasShader);
    expect
      .soft(
        shaderScripts.length,
        `scripts containing createShader${where}: ${JSON.stringify(report.list.map((s) => [s.url.split("/").pop(), s.start, s.hasShader]))}`,
      )
      .toBe(1);
    const chunk = shaderScripts[0];
    if (chunk && cpu === 1) chunkUrl = chunk.url;
    if (chunk?.start != null) {
      const gap = chunk.start - report.loadEventEnd;
      expect
        .soft(gap, `chunk startTime minus loadEventEnd, ms${where}`)
        .toBeGreaterThanOrEqual(0);
      expect
        .soft(gap, `chunk startTime minus loadEventEnd, ms${where}`)
        .toBeLessThanOrEqual(5000);
      const canvasAt = await run.page.evaluate(
        () => (window as HarnessWindow).__canvasAt,
      );
      expect
        .soft(canvasAt ?? Number.NaN, `the canvas appeared${where}`)
        .toBeGreaterThanOrEqual(chunk.start);
      expect
        .soft(
          (canvasAt ?? Number.NaN) - chunk.start,
          `canvas minus chunk request, ms${where}`,
        )
        .toBeLessThanOrEqual(5000);
    }
    // Nothing below can be read without a canvas; the failures above already say so.
    if (cpu !== 1 || (await run.page.locator(CANVAS).count()) !== 1) continue;

    // 2. The box does not move, and nothing shifts.
    const state = await run.page.evaluate(() => {
      const w = window as HarnessWindow;
      return { cls: w.__cls, rects: w.__rects };
    });
    expect
      .soft(
        within(state.rects?.before ?? null, state.rects?.after ?? null, 0.5),
        `box rect before the swap ${JSON.stringify(state.rects?.before)} and after ${JSON.stringify(state.rects?.after)}`,
      )
      .toBe(true);
    expect.soft(state.cls, "layout shift over load plus 3 s").toBe(0);

    // 3. C1's role clauses, with the canvas up.
    const role = await run.page.evaluate((box) => {
      const root = document.querySelector(box);
      const canvas = root?.querySelector("canvas");
      if (!(root && canvas)) return null;
      const everything = [root, ...root.querySelectorAll("*")];
      const text: string[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if ((n.textContent ?? "").trim() !== "") text.push(n.textContent ?? "");
      }
      const takesFocus: string[] = [];
      for (const el of everything) {
        (el as HTMLElement | SVGElement).focus?.();
        if (root.contains(document.activeElement)) {
          takesFocus.push(el.tagName.toLowerCase());
          (document.activeElement as HTMLElement).blur();
        }
      }
      return {
        canvasAriaHidden: canvas.getAttribute("aria-hidden"),
        textNodes: text,
        tabindex: everything
          .filter((el) => el.hasAttribute("tabindex"))
          .map((el) => el.tagName.toLowerCase()),
        focusable: [
          ...root.querySelectorAll(
            "a, area, button, input, select, textarea, summary, iframe, audio, video, object, embed, [contenteditable], [tabindex], [focusable=true]",
          ),
        ].map((el) => el.tagName.toLowerCase()),
        takesFocus,
        pointerEventsOn: everything
          .filter((el) => getComputedStyle(el).pointerEvents !== "none")
          .map((el) => el.tagName.toLowerCase()),
      };
    }, BOX);
    expect.soft(role, "the canvas is in the box").not.toBeNull();
    expect
      .soft(role?.canvasAriaHidden, "the canvas's aria-hidden")
      .toBe("true");
    expect.soft(role?.textNodes, "text nodes in the box").toEqual([]);
    expect.soft(role?.tabindex, "tabindex in the box").toEqual([]);
    expect.soft(role?.focusable, "focusable elements in the box").toEqual([]);
    expect.soft(role?.takesFocus, "elements that took focus").toEqual([]);
    expect
      .soft(role?.pointerEventsOn, "elements with pointer events on")
      .toEqual([]);
    for (const scheme of SCHEMES) {
      await run.page.emulateMedia({ colorScheme: scheme });
      const results = await new AxeBuilder({ page: run.page })
        .withTags(AXE_TAGS)
        .analyze();
      expect
        .soft(
          results.violations.map((v) => ({
            rule: v.id,
            targets: v.nodes.map((node) => node.target.join(" ")),
          })),
          `axe violations with the canvas up (${scheme})`,
        )
        .toEqual([]);
    }

    // 4. The one animation over the swap: a CSS transition on opacity, at most 200 ms.
    const anims = await run.page.evaluate(
      () => (window as HarnessWindow).__anims ?? [],
    );
    expect
      .soft(
        anims.length,
        `animations seen in the box over the swap: ${JSON.stringify(anims)}`,
      )
      .toBe(1);
    expect.soft(anims[0]?.kind, "its kind").toBe("CSSTransition");
    expect.soft(anims[0]?.property, "its property").toBe("opacity");
    expect
      .soft(anims[0]?.endTime ?? Number.NaN, "its end time, ms")
      .toBeLessThanOrEqual(200);
  }

  // 5. Proximity: with the box more than a viewport below the fold, nothing; closer, the upgrade.
  expect(chunkUrl, "the chunk's URL from the control run").not.toBe("");
  const far = await open(browser, { spacer: true });
  await far.load();
  const { top, height } = await far.page.evaluate(async (box) => {
    await document.fonts.ready;
    const el = document.querySelector(box);
    return {
      top: (el?.getBoundingClientRect().top ?? 0) + scrollY,
      height: innerHeight,
    };
  }, BOX);
  expect(
    top - height,
    `premise: box top ${top} minus innerHeight ${height} is more than innerHeight`,
  ).toBeGreaterThan(height);
  await sleep(3000);
  expect
    .soft(
      await far.page.locator(CANVAS).count(),
      "canvases 3 s after load, box far",
    )
    .toBe(0);
  expect
    .soft(
      far.requests.includes(chunkUrl),
      "chunk requested 3 s after load, box far",
    )
    .toBe(false);
  await far.page.evaluate((y) => scrollTo(0, y), top - 2.2 * height);
  await sleep(1500);
  expect
    .soft(
      await far.page.locator(CANVAS).count(),
      "canvases with the box 2.2 viewports down",
    )
    .toBe(0);
  expect
    .soft(
      far.requests.includes(chunkUrl),
      "chunk requested with the box 2.2 viewports down",
    )
    .toBe(false);
  await far.page.evaluate((y) => scrollTo(0, y), top - 1.8 * height);
  await expect
    .soft(far.page.locator(CANVAS), "a canvas with the box 1.8 viewports down")
    .toHaveCount(1, { timeout: 5000 });
  expect
    .soft(
      far.requests.includes(chunkUrl),
      "chunk requested with the box 1.8 viewports down",
    )
    .toBe(true);
});

// ---------------------------------------------------------------------------------------------

/** The air above the first lit row and below the last, in px, for a pose. */
function air(pose: Pose) {
  const rows = pose.image.height;
  return {
    top: pose.lit?.top ?? Number.NaN,
    bottom: rows - 1 - (pose.lit?.bottom ?? Number.NaN),
  };
}

// Never clipped: some air under the keel in every pose, and above the gunwale at the end of the
// turn. The old box was the turn plus 4 px, so these were also capped at 7 px and the hull centred
// at +0.24; the new box holds a ruler and a ruled band's worth of space (B1.10), so a cap and a
// centring would be the box's design, not the turn's.
function checkAir(set: Pose[], at: string) {
  for (const pose of set) {
    const a = air(pose);
    expect
      .soft(
        a.bottom,
        `air below the keel at shear ${pose.shear} at ${at}, px (rows ${pose.image.height})`,
      )
      .toBeGreaterThanOrEqual(2);
    if (pose.shear === -0.24) {
      expect
        .soft(a.top, `air above the gunwale at -0.24 at ${at}, px`)
        .toBeGreaterThanOrEqual(2);
    }
  }
}

test("C11. The pose: shear follows the scroll, the silhouette keeps its length and fits the box", async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const run = await upRun(browser, { watch: true });
  const page = run.page;
  await isolateCanvas(page);
  const box = await boxRect(page);
  expect(box, "the box").not.toBeNull();
  if (!box) return;
  const background = await ground(page);
  const room = await page.evaluate(
    () => document.documentElement.scrollHeight - innerHeight,
  );
  expect(
    room,
    `premise: scroll room ${room} reaches the box's bottom ${box.bottom}`,
  ).toBeGreaterThanOrEqual(box.bottom);

  // 1. The shear at five places in the turn, and never past the end.
  for (const [f, shear] of [
    [0, 0.24],
    [0.25, 0.12],
    [0.5, 0],
    [0.75, -0.12],
    [1, -0.24],
  ] as const) {
    await page.evaluate((y) => scrollTo(0, y), f * box.bottom);
    await softly
      .poll(() => shearOf(page), {
        message: `data-hero-shear with the box's bottom edge ${f} of the way up (scrollY ${(f * box.bottom).toFixed(1)})`,
        timeout: 4000,
      })
      .toBeCloseTo(shear, 2);
  }
  await page.evaluate(() => scrollTo(0, 3000));
  await softly
    .poll(() => shearOf(page), {
      message: "data-hero-shear at scrollY 3000",
      timeout: 4000,
    })
    .toBeCloseTo(-0.24, 2);

  // 2. The same extent left and right at the three poses; 3. at 1440, the air.
  const shots = await poses(page, box, background);
  const lefts = shots.map((s) => s.lit?.left ?? Number.NaN);
  const rights = shots.map((s) => s.lit?.right ?? Number.NaN);
  expect
    .soft(
      Math.max(...lefts) - Math.min(...lefts),
      `lit left edge at +0.24, 0, -0.24: ${lefts.join(", ")}`,
    )
    .toBeLessThanOrEqual(1);
  expect
    .soft(
      Math.max(...rights) - Math.min(...rights),
      `lit right edge at +0.24, 0, -0.24: ${rights.join(", ")}`,
    )
    .toBeLessThanOrEqual(1);
  checkAir(shots, "1440");

  // 4. The box stays where it was.
  const before = await page.evaluate(
    () => (window as HarnessWindow).__rects?.before ?? null,
  );
  for (const f of [0, 0.5, 1]) {
    await page.evaluate((y) => scrollTo(0, y), f * box.bottom);
    const now = await boxRect(page);
    expect
      .soft(
        within(
          before,
          now ? [now.left, now.top, now.right, now.bottom] : null,
          0.5,
        ),
        `box rect before the canvas ${JSON.stringify(before)} and with it at ${f}: ${JSON.stringify(now)}`,
      )
      .toBe(true);
  }

  for (const width of [320, 390, 600, 768]) {
    const narrow = await upRun(browser, { width });
    await isolateCanvas(narrow.page);
    const rect = await boxRect(narrow.page);
    if (!rect) continue;
    checkAir(
      await poses(narrow.page, rect, await ground(narrow.page)),
      String(width),
    );
  }
});

// ---------------------------------------------------------------------------------------------

test("C12. Nothing moves at rest: no draw for 2 s, one after a wheel, at most 4 draw calls in any frame", async ({
  browser,
}) => {
  const run = await upRun(browser);
  const page = run.page;
  // From a second after the swap, with no scroll.
  await sleep(1000);
  const start = await drawCount(page);
  await sleep(2000);
  const rest = await drawCount(page);
  expect(
    rest,
    `draw calls at 1 s after the swap ${start} and 2 s later ${rest}`,
  ).toBe(start);
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 120);
  await sleep(500);
  const moved = await drawCount(page);
  expect(
    moved,
    `draw calls at rest ${rest} and 500 ms after one wheel ${moved} (a count that never changes is a dead canvas)`,
  ).not.toBe(rest);

  // B1.10: a frame draws the hull in at most 4 calls, however it is built (deck, seams, planks).
  await page.evaluate(() => {
    const w = window as HarnessWindow & { __perFrame?: number[] };
    w.__perFrame = [];
    let last = w.__draws?.total ?? 0;
    const sample = () => {
      const now = w.__draws?.total ?? 0;
      w.__perFrame?.push(now - last);
      last = now;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  for (const end = Date.now() + 800; Date.now() < end; ) {
    await page.mouse.wheel(0, 40);
    await sleep(30);
  }
  const perFrame = await page.evaluate(
    () =>
      (window as HarnessWindow & { __perFrame?: number[] }).__perFrame ?? [],
  );
  expect(
    perFrame.some((n) => n > 0),
    "some frame drew during the wheel (a count that never changes is a dead canvas)",
  ).toBe(true);
  expect(
    Math.max(...perFrame),
    `draw calls in the busiest frame over 0.8 s of wheel: ${perFrame.join(",")}`,
  ).toBeLessThanOrEqual(4);
});

// ---------------------------------------------------------------------------------------------

test("C13. The same object: the canvas at scroll 0 matches the SVG, light and dark, at 1440 and 390", async ({
  browser,
}) => {
  test.setTimeout(240_000);
  for (const scheme of SCHEMES) {
    for (const width of [1440, 390]) {
      const where = `(${scheme}, ${width})`;
      // The SVG as Part A draws it, with scripts off so no upgrade can replace it.
      const bare = await browser.newContext({
        javaScriptEnabled: false,
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
        colorScheme: scheme,
      });
      opened.push(bare);
      const svgPage = await bare.newPage();
      await svgPage.goto("/");
      await svgPage.evaluate(() => document.fonts.ready);
      const plainRect = await plainBox(svgPage);
      // The copper plank's heart: points well inside its real shape, which is not its element's
      // box when the plank is a clipped rect.
      const heart = (await readPlanks(svgPage, { heart: true })).find(
        (plank) => plank.copper,
      )?.heart;
      expect(
        plainRect && heart && heart.length > 0,
        `the SVG's box and a copper plank with a heart ${where}`,
      ).toBeTruthy();
      if (!(plainRect && heart)) continue;
      const svgImage = decodePng(
        await svgPage.screenshot({ clip: clipOf(plainRect) }),
      );

      const run = await upRun(browser, { width, scheme });
      await isolateCanvas(run.page);
      const rect = await boxRect(run.page);
      expect(
        rect &&
          within(
            [rect.left, rect.top, rect.right, rect.bottom],
            [plainRect.left, plainRect.top, plainRect.right, plainRect.bottom],
            0.5,
          ),
        `the box with the canvas is where the SVG's was ${where}`,
      ).toBeTruthy();
      if (!rect) continue;
      await scrollAndSettle(run.page, 0, 0.24);
      const canvasImage = decodePng(
        await run.page.screenshot({ clip: clipOf(rect) }),
      );
      const background = await ground(run.page);
      expect(
        [canvasImage.width, canvasImage.height],
        `canvas and SVG screenshots are the same size ${where}`,
      ).toEqual([svgImage.width, svgImage.height]);
      const { width: w, height: h } = svgImage;
      const svgMask = litMask(svgImage, background);
      const canvasMask = litMask(canvasImage, background);

      // 1. The two silhouettes' bounding boxes.
      const [a, b] = [bounds(svgMask, w), bounds(canvasMask, w)];
      expect.soft(a && b, `both images have lit pixels ${where}`).toBeTruthy();
      if (a && b) {
        for (const edge of ["left", "top", "right", "bottom"] as const) {
          expect
            .soft(
              Math.abs(a[edge] - b[edge]),
              `lit ${edge} edge, SVG ${a[edge]} and canvas ${b[edge]} ${where}`,
            )
            .toBeLessThanOrEqual(1);
        }
      }

      // 2. Lit in one with nothing lit in the other within a pixel: at most 0.1% of the box.
      const stray =
        unmatched(svgMask, canvasMask, w, h) +
        unmatched(canvasMask, svgMask, w, h);
      expect
        .soft(
          stray,
          `pixels with no lit pixel of the other image within 1 px, of ${w * h} ${where} (limit ${Math.floor(w * h * 0.001)})`,
        )
        .toBeLessThanOrEqual(w * h * 0.001);

      // 3. The tones agree where both are lit, and the copper plank's heart in particular.
      const mean = meanDifference(svgImage, canvasImage, svgMask, canvasMask);
      expect
        .soft(
          mean,
          `mean absolute channel difference over pixels lit in both ${where}`,
        )
        .not.toBeNull();
      expect
        .soft(
          mean ?? Number.NaN,
          `mean absolute channel difference over pixels lit in both ${where}`,
        )
        .toBeLessThanOrEqual(8);
      const origin = clipOf(plainRect);
      const inBox = heart.map(
        ([x, y]) => [x - origin.x, y - origin.y] as [number, number],
      );
      const [fromSvg, fromCanvas] = [
        medianAt(svgImage, inBox),
        medianAt(canvasImage, inBox),
      ];
      fromSvg.forEach((channel, i) => {
        expect
          .soft(
            Math.abs(channel - (fromCanvas[i] ?? Number.NaN)),
            `copper interior median, channel ${i}: SVG ${fromSvg.join(",")} canvas ${fromCanvas.join(",")} ${where}`,
          )
          .toBeLessThanOrEqual(6);
      });
    }
  }
});

// ---------------------------------------------------------------------------------------------

test("C14. It falls back: reduced motion, Save-Data, a weak device, no context, no cheap GPU, slow frames, a lost context", async ({
  browser,
}) => {
  test.setTimeout(300_000);
  // The control: with every gate open, the chunk is requested exactly once.
  const control = await upRun(browser);
  const report = await control.scripts();
  const chunks = report.list.filter((s) => s.hasShader);
  expect(
    chunks.length,
    "scripts containing createShader in the control run",
  ).toBe(1);
  const chunkUrl = chunks[0]?.url ?? "";
  expect(
    control.requests.filter((url) => url === chunkUrl).length,
    "requests for the chunk in the control run",
  ).toBe(1);

  const refusals: {
    name: string;
    options: RunOptions;
    scrolled?: boolean;
  }[] = [
    {
      name: "reduced motion",
      options: { reducedMotion: "reduce" },
      scrolled: true,
    },
    { name: "Save-Data", options: { saveData: true } },
    { name: "deviceMemory 2", options: { memory: 2 } },
    { name: "hardwareConcurrency 2", options: { cores: 2 } },
    { name: "getContext returning null", options: { refuseWebGl: true } },
    { name: "the caveat flag refused", options: { refuseCaveat: true } },
  ];
  for (const refusal of refusals) {
    const run = await open(browser, refusal.options);
    await run.load();
    if (refusal.scrolled) {
      for (let y = 0; y <= 3000; y += 500) {
        await run.page.evaluate((to) => scrollTo(0, to), y);
        await sleep(100);
      }
    }
    await sleep(3000);
    const where = `with ${refusal.name}`;
    expect
      .soft(await run.page.locator(CANVAS).count(), `canvases ${where}`)
      .toBe(0);
    await expect
      .soft(run.page.locator(HULL), `the SVG hull is visible ${where}`)
      .toBeVisible();
    expect
      .soft(run.requests.includes(chunkUrl), `chunk requested ${where}`)
      .toBe(false);
    if (refusal.options.refuseCaveat) {
      // Proves the flag is passed: one request, with the flag, and no other.
      const requests = await run.page.evaluate(
        () => (window as HarnessWindow).__ctxReqs ?? [],
      );
      expect
        .soft(
          requests.map((r) => [r.type, r.attrs?.failIfMajorPerformanceCaveat]),
          `WebGL context requests ${where}`,
        )
        .toHaveLength(1);
      expect
        .soft(
          requests[0]?.attrs?.failIfMajorPerformanceCaveat,
          `the flag in the one request ${where}`,
        )
        .toBe(true);
    }
  }

  // 1. Slow frames: three in a row freeze the canvas where it is.
  const slow = await upRun(browser, { slowClock: true });
  const page = slow.page;
  await page.mouse.move(720, 450);
  await sleep(1000);
  const wheel = async () => {
    await page.mouse.wheel(0, 3);
    await sleep(25);
  };
  const grown0 = await drawCount(page);
  for (const end = Date.now() + 500; Date.now() < end; ) await wheel();
  const grown1 = await drawCount(page);
  expect
    .soft(
      grown1 - grown0,
      `draw calls added in 0.5 s of wheel with the clock normal (${grown0} to ${grown1})`,
    )
    .toBeGreaterThanOrEqual(10);
  await page.evaluate(() => {
    (window as HarnessWindow).__slow = true;
  });
  const switched = await drawCount(page);
  const samples: number[] = [];
  const scrolls: number[] = [];
  for (const start = Date.now(); samples.length < 4; ) {
    await wheel();
    if (Date.now() - start >= (samples.length + 1) * 400) {
      samples.push(await drawCount(page));
      scrolls.push(await page.evaluate(() => scrollY));
    }
  }
  expect
    .soft(
      (samples.at(-1) ?? Number.NaN) - switched,
      `draw calls added after the slow clock came on: ${switched}, then ${samples.join(", ")}`,
    )
    .toBeLessThanOrEqual(8);
  expect
    .soft(
      new Set(samples).size,
      `draw counts flat across four samples 400 ms apart: ${samples.join(", ")}`,
    )
    .toBe(1);
  expect
    .soft(
      scrolls.at(-1) ?? 0,
      `scrollY kept moving while the canvas was frozen: ${scrolls.join(", ")}`,
    )
    .toBeGreaterThan(scrolls[0] ?? Number.POSITIVE_INFINITY);
  expect
    .soft(await page.locator(CANVAS).count(), "the canvas stays, frozen")
    .toBe(1);

  // 2. A real context loss removes the canvas and brings the SVG back, in the same box.
  const lost = await upRun(browser, { watch: true });
  const before = await boxRect(lost.page);
  expect(
    await lost.page.evaluate((canvasSelector) => {
      const canvas = document.querySelector<HTMLCanvasElement>(canvasSelector);
      const gl =
        canvas?.getContext("webgl") ?? canvas?.getContext("webgl2") ?? null;
      const extension = gl?.getExtension("WEBGL_lose_context");
      extension?.loseContext();
      return Boolean(extension);
    }, CANVAS),
    "the canvas has a context with WEBGL_lose_context to lose",
  ).toBe(true);
  await expect
    .soft(
      lost.page.locator(CANVAS),
      "the canvas after a lost context (within 1 s)",
    )
    .toHaveCount(0, { timeout: 1000 });
  await expect
    .soft(lost.page.locator(HULL), "the SVG hull after a lost context")
    .toBeVisible();
  const after = await boxRect(lost.page);
  expect
    .soft(
      within(
        before ? [before.left, before.top, before.right, before.bottom] : null,
        after ? [after.left, after.top, after.right, after.bottom] : null,
        0.5,
      ),
      `box rect before the loss ${JSON.stringify(before)} and after ${JSON.stringify(after)}`,
    )
    .toBe(true);
  expect
    .soft(
      await lost.page.locator(BOX).getAttribute("data-hero-shear"),
      "data-hero-shear after a lost context",
    )
    .toBeNull();
});

// ---------------------------------------------------------------------------------------------

test("C15. Weight: at most 15,360 B after load, one chunk with the shaders of at most 12,288 B, 2,048 B more than /_not-found at first load, the markup within 8192 B", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const run = await upRun(browser);
  await sleep(1000);
  const { list } = await run.scripts();
  const listing = (items: typeof list) =>
    JSON.stringify(
      items.map((s) => [s.url.split("/").pop(), s.gz, s.hasShader]),
    );

  // 1. Everything first requested after load.
  const late = list.filter((s) => s.afterLoad);
  const lateTotal = late.reduce((sum, s) => sum + s.gz, 0);
  expect
    .soft(late.length, `scripts first requested after load: ${listing(late)}`)
    .toBeGreaterThan(0);
  expect
    .soft(
      lateTotal,
      `gzip bytes of all JS first requested after load: ${listing(late)}`,
    )
    .toBeLessThanOrEqual(15_360);
  expect
    .soft(
      late.filter((s) => s.hasShader).length,
      "scripts after load containing createShader",
    )
    .toBe(1);
  // B1.10: the hero chunk on its own, which now draws 22 planks.
  const heroChunk = late.find((s) => s.hasShader);
  expect
    .soft(
      heroChunk?.gz ?? Number.NaN,
      `gzip bytes of the chunk with the shaders: ${listing(late)}`,
    )
    .toBeLessThanOrEqual(12_288);
  expect
    .soft(
      listing(list.filter((s) => !s.afterLoad && s.hasShader)),
      "scripts fetched before load containing createShader",
    )
    .toBe("[]");

  // 2. The first load, against /_not-found in the same build and run: what the browser fetched.
  const firstLoad = (items: typeof list) =>
    items.filter((s) => !s.afterLoad).reduce((sum, s) => sum + s.gz, 0);
  const plain = await open(browser);
  await plain.page.goto("/_not-found");
  await sleep(1000);
  const notFound = (await plain.scripts()).list;
  expect(
    firstLoad(notFound),
    "first-load JS of /_not-found, gzip bytes",
  ).toBeGreaterThan(0);
  expect
    .soft(
      firstLoad(list) - firstLoad(notFound),
      `first-load JS of / (${firstLoad(list)}) minus /_not-found (${firstLoad(notFound)}), gzip bytes`,
    )
    .toBeLessThanOrEqual(2048);

  // 3. C6 stands, canvas up or not: the hero's markup is at most 8192 B.
  const bytes = (page: Page) =>
    page.evaluate(
      (box) =>
        new TextEncoder().encode(document.querySelector(box)?.outerHTML ?? "")
          .length,
      BOX,
    );
  const served = await browser.newContext({ javaScriptEnabled: false });
  opened.push(served);
  const servedPage = await served.newPage();
  await servedPage.goto("/");
  expect
    .soft(await bytes(servedPage), "[data-hero] outerHTML as served, bytes")
    .toBeLessThanOrEqual(8192);
  expect
    .soft(
      await bytes(run.page),
      "[data-hero] outerHTML with the canvas up, bytes",
    )
    .toBeLessThanOrEqual(8192);
});

// ---------------------------------------------------------------------------------------------

test("C17. The harness holds: the caveat flag is refused, the strip grants a context, the recorder and the draw counter see it, a screenshot shows it", async ({
  browser,
}) => {
  const askAll = (page: Page) =>
    page.evaluate(() =>
      ["webgl", "webgl2", "experimental-webgl"].map(
        (type) =>
          document
            .createElement("canvas")
            .getContext(type, { failIfMajorPerformanceCaveat: true }) === null,
      ),
    );

  // What this browser does by itself is reported, not asserted: the sandbox's Chromium 141 refuses
  // the flag (a software renderer), CI's 156 grants it.
  const bare = await open(browser, { stripCaveat: false });
  await bare.page.goto("about:blank");
  test.info().annotations.push({
    type: "native-caveat-refusal",
    description: `[webgl, webgl2, experimental-webgl] refused by the browser itself: ${JSON.stringify(await askAll(bare.page))}`,
  });

  // The harness's own refusal, which C14 relies on: null for all three types.
  const refusing = await open(browser, { refuseCaveat: true });
  await refusing.page.goto("about:blank");
  expect(
    await askAll(refusing.page),
    "failIfMajorPerformanceCaveat: true refused by the harness for webgl, webgl2 and experimental-webgl",
  ).toEqual([true, true, true]);

  const granted = await open(browser);
  await granted.page.goto("about:blank");
  const result = await granted.page.evaluate(() => {
    const w = window as HarnessWindow;
    document.body.style.margin = "0";
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    canvas.style.cssText =
      "position:fixed;left:0;top:0;width:100px;height:100px";
    document.body.append(canvas);
    const gl = canvas.getContext("webgl", {
      failIfMajorPerformanceCaveat: true,
    });
    if (!gl) return { context: false };
    const shader = (type: number, source: string) => {
      const s = gl.createShader(type);
      if (!s) throw new Error("no shader");
      gl.shaderSource(s, source);
      gl.compileShader(s);
      return s;
    };
    const program = gl.createProgram();
    gl.attachShader(
      program,
      shader(
        gl.VERTEX_SHADER,
        "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }",
      ),
    );
    gl.attachShader(
      program,
      shader(
        gl.FRAGMENT_SHADER,
        "void main(){ gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); }",
      ),
    );
    gl.linkProgram(program);
    gl["useProgram"](program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const at = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    const drawsBefore = w.__draws?.total;
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return {
      context: true,
      attribute: gl.getContextAttributes()?.failIfMajorPerformanceCaveat,
      requests: w.__ctxReqs,
      drawsBefore,
      drawsAfter: w.__draws?.total,
    };
  });
  expect(result.context, "a context with the strip on").toBe(true);
  expect(
    result.attribute,
    "the context's own failIfMajorPerformanceCaveat",
  ).toBe(false);
  expect(
    result.requests?.map((r) => [
      r.type,
      r.attrs?.failIfMajorPerformanceCaveat,
    ]),
    "the recorder still reports what the page asked for",
  ).toEqual([["webgl", true]]);
  expect(
    [result.drawsBefore, result.drawsAfter],
    "the draw counter before and after one drawArrays",
  ).toEqual([0, 1]);
  await granted.page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const image = decodePng(
    await granted.page.screenshot({
      clip: { x: 0, y: 0, width: 100, height: 100 },
    }),
  );
  expect(
    pixel(image, 50, 50),
    "the screenshot's colour at the middle of the canvas (the program draws rgb(0,255,0))",
  ).toEqual([0, 255, 0]);
});
