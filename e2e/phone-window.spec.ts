import { expect, type Page } from "@playwright/test";
import { PENCIL } from "../lib/hull-layouts";
import { expected } from "./crew";
import {
  type Crew,
  crewOf,
  STATE_WAIT,
  crewTest as test,
  untilHome,
  untilState,
} from "./crew-feed";
import { type Box, firstScreen, textSizes } from "./first-screen";
import {
  installRgba,
  MODES,
  MOTION,
  SCHEMES,
  watchLayoutShift,
} from "./helpers";
import { layerFor, pencilSeat } from "./live-layer";
import {
  box,
  drawingAt,
  FIRST,
  profile as hullOf,
  modelCoverage,
  note,
  outlineCoverage,
  pause,
  REST,
  SHOWN,
  whole,
} from "./model";
import {
  decodePng,
  deltaE,
  edges,
  hausdorff,
  type Image,
  pixel,
} from "./pixels";
import { PLAN } from "./plan";
import { openModel, refuseWebGl } from "./webgl";

// Sprint 44, Wb: the sheet fits a phone window (.crew/sprint/44/contract.md, W8 to W12), written
// before the build. `/`'s first window on a phone with the toolbars showing holds the name, the
// role, the bio's lead, the contact links and (at the first four windows) the particulars, 8 px
// clear of the fold; the narrow drawing stays whole and no shorter than Iris's floor; the motion
// control keeps its group, targets and Tab order wherever it sits; nothing shifts; and on Full the
// 3D number label leaves the copper dot's centre showing where P13's 2D chip does. Each check reads
// the contract's hooks wherever Iris places them: the first screen through B1.1's reads
// (e2e/first-screen.ts), the feed states through B4.22's harness (e2e/crew-feed.ts, the kept sites
// live-layer.spec.ts names), the model through B3.1's measure (e2e/model.ts), CLS through B1.8's
// read (e2e/helpers.ts). The 2D reads refuse WebGL; W9's Full pass and W12 run the model.

/** The contract's windows that hold the facts and the particulars (item 2), word for word. */
const PARTICULARS_HELD = [
  [390, 664],
  [393, 659],
  [412, 780],
  [430, 746],
] as const;
/** The windows that hold the facts; the particulars may follow below the fold. */
const FACTS_HELD = [
  [375, 548],
  [360, 560],
] as const;
/**
 * The contract's "unchanged where kept checks pin them" windows below 768. W8 asserts 390 x 844
 * (it holds items 1 to 3 on main, and a phone window must keep doing so), and reports 320 x 568,
 * whose contact links sit at 592 to 680 on main: it is outside Wb's set, and "unchanged" there
 * means only what kept checks pin (B3.1's whole-pixel canvas), so it is reported, not asserted
 * (Atlas's ruling, sprint 44).
 */
const UNCHANGED = [
  [390, 844],
  [320, 568],
] as const;
const REPORTED_ONLY = new Set(["320 x 568"]);
/** Every window below 768 the contract names, for W9 and W10. */
const PHONES = [...PARTICULARS_HELD, ...FACTS_HELD, ...UNCHANGED] as const;

/** The contract's margin above the fold, in CSS px ("The margin is 8 px above the fold"). */
const FOLD_MARGIN = 8;

/**
 * Iris's floor for the narrow drawing's height, in CSS px, measured on the shown drawing
 * (`.plan-narrow`): 224 x 149.3, 0.574 of its 390 size (.crew/sprint/44/placement.md,
 * `--narrow-floor`). `[data-plan]`'s own height is reported beside it.
 */
const NARROW_FLOOR_PX = 149;

/**
 * Where the shown motion slot sits below 768 px, in document order: after `after`, before `before`
 * (B3.16's place clause: in main between [data-model] and the title block). Iris's call keeps it
 * (.crew/sprint/44/placement.md: `[data-model]`, then `.foot`, Read as page then the slot, then
 * `main > header`); on screen the row moves to the drawing area's top right, so B3.16's clause
 * (e2e/motion.spec.ts:431) needs no rewrite.
 */
const CONTROL_PLACE = {
  after: "main [data-model]",
  before: "main > header",
  words: "in main between [data-model] and the title block",
} as const;

const BLOCK = "dl[data-particulars]";
const NAMED = ':is(fieldset, [role="group"])[aria-label="Motion"]';
/** The drawing's lettering, HTML spans over its SVG (.crew/sprint/39/decisions.md, 5). */
const LETTERING = "[data-plan] .plan-view > span";

const at = (width: number, height: number) => `${width} x ${height}`;

/** `/` from `base` at a size, with the web fonts in. */
async function openHome(page: Page, width: number, height: number, base = "") {
  await page.setViewportSize({ width, height });
  const response = await page.goto(`${base}/`);
  expect(
    response?.status(),
    `status of ${base || "the default server"}/ at ${at(width, height)}`,
  ).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

/** Wholly inside the viewport, its bottom `margin` px above the fold (B1.1's 0.5 px rounding). */
const aboveFold = (
  b: Box | null,
  viewport: { width: number; height: number },
  margin: number,
) =>
  b !== null &&
  b.left >= -0.5 &&
  b.top >= -0.5 &&
  b.right <= viewport.width + 0.5 &&
  b.bottom <= viewport.height - margin + 0.5;

/** Items 1 to 3 against the viewport less the margin; item 2 only where `particulars` is set. */
async function phoneWindow(page: Page, particulars: boolean) {
  const found = await firstScreen(page);
  const dl = await page.evaluate((block) => {
    const el = document.querySelector(block);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  }, BLOCK);
  const items = [
    ...found.items,
    ...(particulars ? [{ what: `${BLOCK}, whole`, box: dl }] : []),
  ];
  const sizes = await textSizes(page);
  return {
    outside: items
      .filter(({ box: b }) => !aboveFold(b, found.viewport, FOLD_MARGIN))
      .map(({ what, box: b }) => `${what}: ${JSON.stringify(b)}`),
    lowest: Math.max(...found.items.map(({ box: b }) => b?.bottom ?? Infinity)),
    dlBottom: dl?.bottom ?? Number.NaN,
    h1: sizes.h1,
    larger: sizes.others.filter(({ size }) => size >= sizes.h1),
  };
}

// ---------------------------------------------------------------------------------------------
// W8 and W12 read the feed's fixtures: one worker, in order, as the feed specs run (STATE.md).

const FIXTURES = ["live", "open", "resting"] as const;
type FixtureName = (typeof FIXTURES)[number];

/**
 * The fixture's site, as B4.22 reaches it: live-layer.spec.ts's kept site by name and answer, read
 * until `/crew` shows the oracle's state, then `/` until it shows the layer's hooks. Once per
 * worker; it asserts nothing.
 */
function reachHome(crew: Crew, fixture: FixtureName) {
  return crew.once(`phone-window ${fixture}`, async () => {
    const name = `home-${fixture}`;
    const site = await crew.site(name, { fixture }, true);
    const body = crew.feed.body(name);
    const want = layerFor(body, crew.feed.origin).home;
    const crewShown = await untilState(
      site.baseURL,
      expected(body, crew.feed.origin).state,
      STATE_WAIT,
    );
    const home = await untilHome(site.baseURL, want, STATE_WAIT);
    return { base: site.baseURL, body, want, crewShown, home };
  });
}

/** A fixture's site, asserted to show its state on `/`. */
async function shownOn(crew: Crew, fixture: FixtureName) {
  const reached = await reachHome(crew, fixture);
  test.info().annotations.push({
    type: "state-wait",
    description: `${fixture}: /crew ${reached.crewShown.seen} after ${reached.crewShown.ms} ms, then / ${reached.home.seen} after ${reached.home.ms} ms`,
  });
  expect(
    reached.home.seen,
    `the state / shows on the home-${fixture} site within ${STATE_WAIT} ms`,
  ).toBe(reached.want);
  return {
    base: reached.base,
    body: reached.body,
    where: `the ${fixture} fixture`,
  };
}

/** P13's read at the page's shown drawing: the copper dot's centre and radius, and the chip's box. */
function dotAndChip(page: Page) {
  return page.evaluate(() => {
    const shown = (el: Element) => el.getClientRects().length > 0;
    const dot = [
      ...document.querySelectorAll("[data-plan] [data-tip] path"),
    ].find((p): p is SVGPathElement => {
      if (!(p instanceof SVGPathElement) || !shown(p)) return false;
      const b = p.getBBox();
      return b.width === 0 && b.height === 0;
    });
    const chip = [
      ...document.querySelectorAll("[data-plan] .plan-pencil"),
    ].find(shown);
    if (!dot || !chip) return null;
    const b = dot.getBBox();
    const c = new DOMPoint(b.x, b.y).matrixTransform(
      dot.getScreenCTM() ?? undefined,
    );
    const r = Number.parseFloat(getComputedStyle(dot).strokeWidth) / 2;
    const k = chip.getBoundingClientRect();
    return {
      x: c.x,
      y: c.y,
      r,
      number: (chip.textContent ?? "").trim(),
      meets:
        c.x - r < k.right &&
        k.left < c.x + r &&
        c.y - r < k.bottom &&
        k.top < c.y + r,
    };
  });
}

test.describe("on the feed's fixtures", () => {
  test.describe.configure({ mode: "default" });
  test.skip(
    Boolean(process.env.PLAYWRIGHT_BASE_URL),
    "PLAYWRIGHT_BASE_URL is set: the live, open and resting states need this checkout's build served from copies pointed at the fixture server (B4.22's harness)",
  );
  // The three sites start together, once per worker.
  test.beforeAll(async () => {
    const crew = await crewOf();
    for (const fixture of FIXTURES) void reachHome(crew, fixture);
  });

  test("W8 the phone window holds the facts: at 390 x 664, 393 x 659, 412 x 780, 430 x 746, 375 x 548, 360 x 560 and 390 x 844, light and dark, on the default server and the live, open and resting fixtures, WebGL refused, the h1, the headline, the bio's lead and the three contact links are wholly inside the viewport less 8 px, dl[data-particulars] whole too at the first four, and the h1 is the largest text; 320 x 568 reported", async ({
    page,
    crew,
  }) => {
    test.setTimeout(300_000);
    await page.context().addInitScript(refuseWebGl);
    const states = [{ base: "", where: "the default server" }];
    for (const fixture of FIXTURES) states.push(await shownOn(crew, fixture));
    const windows = [
      ...PARTICULARS_HELD.map((w) => ({ w, particulars: true })),
      ...[...FACTS_HELD, ...UNCHANGED].map((w) => ({ w, particulars: false })),
    ];
    const lowest = new Map<string, { items: number; dl: number }>();
    for (const { base, where: site } of states) {
      for (const scheme of SCHEMES) {
        await page.emulateMedia({ colorScheme: scheme });
        for (const {
          w: [width, height],
          particulars,
        } of windows) {
          await openHome(page, width, height, base);
          const k = at(width, height);
          const where = `on ${site} at ${k}, ${scheme}`;
          const found = await phoneWindow(page, particulars);
          const seen = lowest.get(k) ?? { items: 0, dl: 0 };
          lowest.set(k, {
            items: Math.max(seen.items, found.lowest),
            dl: Math.max(seen.dl, found.dlBottom),
          });
          if (REPORTED_ONLY.has(k)) continue;
          expect
            .soft(
              found.outside,
              `items not wholly inside the first window less ${FOLD_MARGIN} px ${where}`,
            )
            .toEqual([]);
          expect(found.h1, `the h1's font size ${where}`).toBeGreaterThan(0);
          expect
            .soft(
              found.larger,
              `text as large as the h1 (${found.h1} px) ${where}`,
            )
            .toEqual([]);
        }
      }
    }
    note(
      test.info(),
      "lowest",
      [...lowest]
        .map(
          ([k, v]) =>
            `${k}${REPORTED_ONLY.has(k) ? " (reported)" : ""}: item 1 ${v.items.toFixed(1)}, dl ${v.dl.toFixed(1)}`,
        )
        .join("; "),
    );
  });

  test("W12 the 3D label leaves the copper dot showing: on the live fixture, at 1024 and every width below it where P13's read finds the chip meeting the dot (1024 must be one), on Full at rest, the centre of the copper dot the canvas draws, and each point within its radius less 1.5 px in the label's box, paints as it does with the lettering hidden, which shows the dot (P13's 16-level tolerance)", async ({
    browser,
    page,
    crew,
  }) => {
    test.setTimeout(300_000);
    const live = await shownOn(crew, "live");
    const n =
      (live.body.current as { sprint?: number } | undefined)?.sprint ??
      Number.NaN;
    const seat = pencilSeat(n);
    note(test.info(), "seat", `sprint ${n} in pencil on seat ${seat}`);

    // P13's 2D read, WebGL refused: the widths where the chip meets the dot.
    await page.context().addInitScript(refuseWebGl);
    const met: number[] = [];
    for (const width of [1024, 960, 900, 800, 768]) {
      await openHome(page, width, 900, live.base);
      const read = await dotAndChip(page);
      const where = `at ${width} x 900, WebGL refused`;
      expect.soft(read, `the copper dot and the chip ${where}`).not.toBeNull();
      if (width === 1024)
        expect
          .soft(
            read?.meets,
            `the chip meets the dot ${where}: the seat the check needs`,
          )
          .toBe(true);
      if (read?.meets) met.push(width);
    }
    note(test.info(), "met", `the 2D chip meets the dot at ${met.join(", ")}`);

    const rows: string[] = [];
    for (const width of met) {
      const where = `at ${width} x 900 on Full at rest, sprint ${n} in pencil on ${seat}`;
      const run = await openModel(browser, { width, height: 900 });
      try {
        await run.context.addInitScript(installRgba);
        await run.goto(`${live.base}/`);
        await run.waitFor([...REST], FIRST);
        await pause(300);
        const tokens = await run.page.evaluate(() => {
          const rgba = (
            window as Window & { __rgba?: (c: string) => number[] | null }
          ).__rgba;
          const probe = document.createElement("div");
          document.body.append(probe);
          const token = (name: string) => {
            probe.style.color = `var(${name})`;
            return rgba?.(getComputedStyle(probe).color) ?? null;
          };
          const out = {
            film: token("--background"),
            accent: token("--accent"),
          };
          probe.remove();
          // Where the 3D label paints: the span, translated over the canvas, its film chip included.
          const label = document
            .querySelector("[data-plan] .plan-wide > .plan-pencil")
            ?.getBoundingClientRect();
          return {
            ...out,
            label: label
              ? {
                  left: label.left,
                  top: label.top,
                  right: label.right,
                  bottom: label.bottom,
                }
              : null,
          };
        });
        // The canvas alone over the viewport: the copper dot the 3D draws, and its centre.
        const model = await modelCoverage(run.page, {
          x: 0,
          y: 0,
          width,
          height: 900,
        });
        const dot = copperDot(
          model.image,
          tokens.accent ?? [],
          tokens.film ?? [],
        );
        expect(
          dot.centre,
          `the copper dot in the canvas ${where}`,
        ).not.toBeNull();
        if (!dot.centre) continue;
        const [cx, cy] = dot.centre;
        const points = dotPoints(cx, cy, tokens.label);
        const clip = {
          x: Math.floor(cx) - 8,
          y: Math.floor(cy) - 8,
          width: 17,
          height: 17,
        };
        const shot = decodePng(await run.page.screenshot({ clip }));
        await run.page.addStyleTag({
          content: `${LETTERING} { visibility: hidden !important; }`,
        });
        const bareShot = decodePng(await run.page.screenshot({ clip }));
        const rgbAt = (image: Image, [x, y]: [number, number]) =>
          pixel(image, Math.floor(x) - clip.x, Math.floor(y) - clip.y).slice(
            0,
            3,
          );
        const differ = points.filter((p) => {
          const [a, b] = [rgbAt(shot, p), rgbAt(bareShot, p)];
          return a.some((v, i) => Math.abs(v - (b[i] ?? 0)) > 16);
        });
        const centreBare = rgbAt(bareShot, [cx, cy]);
        const k = tokens.label;
        const meets =
          k !== null &&
          cx - DOT_R < k.right &&
          k.left < cx + DOT_R &&
          cy - DOT_R < k.bottom &&
          k.top < cy + DOT_R;
        rows.push(
          `${width}: dot centre (${cx.toFixed(1)}, ${cy.toFixed(1)}) from ${dot.columns} columns; label ${k ? [k.left, k.top, k.right, k.bottom].map((v) => v.toFixed(1)).join(", ") : "none"}${meets ? " (meets the dot)" : ""}; ${differ.length} of ${points.length} points differ, centre ${JSON.stringify(rgbAt(shot, [cx, cy]))}, bare ${JSON.stringify(centreBare)}`,
        );
        // The control: with the lettering hidden the dot's centre shows copper, so a miss below is
        // the label.
        expect(
          deltaE(centreBare, tokens.accent ?? []),
          `the control: the dot's centre paints copper (${JSON.stringify(centreBare)} against ${JSON.stringify(tokens.accent)}) with the lettering hidden ${where}`,
        ).toBeLessThan(10);
        expect
          .soft(
            differ.map(
              ([x, y]) =>
                `(${(x - cx).toFixed(0)}, ${(y - cy).toFixed(0)}) ${JSON.stringify(rgbAt(shot, [x, y]))} against ${JSON.stringify(rgbAt(bareShot, [x, y]))}`,
            ),
            `points of the copper dot (its centre and ${points.length - 1} within ${DOT_R - 1.5} px in the label's box) that paint otherwise than with the lettering hidden, ${where}`,
          )
          .toEqual([]);
        expect.soft(run.errors, `console errors ${where}`).toEqual([]);
      } finally {
        await run.close();
      }
    }
    note(test.info(), "W12", rows.join("; ") || "no width read");
  });
});

/** The copper dot's radius in CSS px: PENCIL.tip.dot across at every width (lib/hull-layouts.ts). */
const DOT_R = PENCIL.tip.dot / 2;

/**
 * The copper dot in a canvas-only image at DPR 1, composited over the film: its columns whose
 * copper stands at least 5 px tall (the copper run along the seam is 2 to 3 px tall and would pull
 * a centroid sternward; the dot is 8), the centre the middle of their x extent and of their
 * copper's y extent (Pixel's read, sprint 44).
 */
function copperDot(image: Image, accent: number[], ground: number[]) {
  const columns = new Map<number, number[]>();
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++) {
      const p = pixel(image, x, y);
      const a = (p[3] ?? 0) / 255;
      if (a < 0.02) continue;
      const rgb = [0, 1, 2].map(
        (c) => (p[c] ?? 0) * a + (ground[c] ?? 0) * (1 - a),
      );
      if (deltaE(rgb, accent) >= 10) continue;
      const ys = columns.get(x) ?? [];
      ys.push(y);
      columns.set(x, ys);
    }
  const tall = [...columns].filter(([, ys]) => ys.length >= 5);
  if (tall.length === 0) return { columns: 0, centre: null };
  const xs = tall.map(([x]) => x);
  const ys = tall.flatMap(([, list]) => list);
  const centre: [number, number] = [
    (Math.min(...xs) + Math.max(...xs) + 1) / 2,
    (Math.min(...ys) + Math.max(...ys) + 1) / 2,
  ];
  return { columns: tall.length, centre };
}

/**
 * P13's points: the dot's centre, and each whole-px point within its radius less 1.5 px (off its
 * antialiased edge) that lies in the label's box.
 */
function dotPoints(
  cx: number,
  cy: number,
  label: Box | null,
): [number, number][] {
  const out: [number, number][] = [[cx, cy]];
  if (!label) return out;
  const inner = DOT_R - 1.5;
  for (let dx = -Math.floor(inner); dx <= inner; dx++)
    for (let dy = -Math.floor(inner); dy <= inner; dy++) {
      if ((dx === 0 && dy === 0) || dx * dx + dy * dy > inner * inner) continue;
      const [x, y] = [cx + dx, cy + dy];
      if (
        x >= label.left &&
        x <= label.right &&
        y >= label.top &&
        y <= label.bottom
      )
        out.push([x, y]);
    }
  return out;
}

// ---------------------------------------------------------------------------------------------

/** W9's reads: the narrow drawing's planks and lettering against its box, the viewport and clips. */
function drawingReads(page: Page, shown: string) {
  return page.evaluate(
    ({ plan, lettering, shown }) => {
      const visible = (el: Element) => {
        const r = el.getBoundingClientRect();
        return el.getClientRects().length > 0 && (r.width > 0 || r.height > 0);
      };
      const edgesOf = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      };
      type E = ReturnType<typeof edgesOf>;
      const inside = (a: E, b: E) =>
        a.left >= b.left - 0.5 &&
        a.top >= b.top - 0.5 &&
        a.right <= b.right + 0.5 &&
        a.bottom <= b.bottom + 0.5;
      const host = document.querySelector(plan);
      const drawing = document.querySelector(shown);
      if (!host || !drawing) return null;
      const hostBox = edgesOf(host);
      const view = {
        left: 0,
        top: 0,
        right: document.documentElement.clientWidth,
        bottom: innerHeight,
      };
      const planks = [...host.querySelectorAll("[data-plank]")].filter(visible);
      const texts = [...document.querySelectorAll(lettering)].filter(visible);
      const name = (el: Element) =>
        el.hasAttribute("data-plank")
          ? `plank ${el.getAttribute("data-plank")}`
          : `lettering "${(el.textContent ?? "").trim()}"`;
      const cut: string[] = [];
      for (const el of [...planks, ...texts]) {
        const e = edgesOf(el);
        if (!inside(e, hostBox)) cut.push(`${name(el)} outside [data-plan]`);
        if (!inside(e, view)) cut.push(`${name(el)} outside the viewport`);
        // Anything that clips (overflow other than visible) between it and the body holds it whole.
        for (
          let a = el.parentElement;
          a && a !== document.body;
          a = a.parentElement
        ) {
          const s = getComputedStyle(a);
          if (s.overflowX === "visible" && s.overflowY === "visible") continue;
          if (!inside(e, edgesOf(a)))
            cut.push(
              `${name(el)} clipped by <${a.tagName.toLowerCase()}> (overflow ${s.overflowX} ${s.overflowY})`,
            );
        }
      }
      const d = drawing.getBoundingClientRect();
      return {
        planks: planks.length,
        texts: texts.length,
        cut,
        height: d.height,
        hostHeight: hostBox.bottom - hostBox.top,
      };
    },
    { plan: PLAN, lettering: LETTERING, shown },
  );
}

/** B3.1's measure on a page held at `landed`, as W4 reads it, in CSS px. */
async function registration(page: Page, width: number, dpr: number) {
  const drawing = drawingAt(width);
  const planBox = await box(page, drawing);
  const geometry = await hullOf(page, drawing);
  if (!planBox || !geometry) return null;
  const clip = whole(planBox);
  const svg = await outlineCoverage(page, clip, drawing);
  const model = await modelCoverage(page, clip);
  const [w, h] = [model.image.width, model.image.height];
  const cut = Math.round((geometry.limit - clip.x) * dpr);
  const d = hausdorff(
    edges(svg.alpha, w, h),
    edges(model.alpha, w, h),
    w,
    h,
    cut,
  );
  return { max: d.max / dpr, p99: d.p99 / dpr, a: d.a, b: d.b, clip };
}

test("W9 the narrow drawing is whole: at every window below 768 the contract names, WebGL refused, every shown [data-plan] [data-plank] and lettering span lies inside [data-plan]'s box and the viewport, clipped by no overflow, and the shown drawing is at least Iris's floor tall (reported per window); on Full at 390 x 664, DPR 1 and 3, frame 1 registers on .plan-narrow within B3.1's bounds (1.5 CSS px at DPR 1, 1.0 with the canvas at its 1.5 cap)", async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  await page.context().addInitScript(refuseWebGl);
  const heights: string[] = [];
  for (const [width, height] of PHONES) {
    await openHome(page, width, height);
    const where = `at ${at(width, height)}, WebGL refused`;
    const shown = drawingAt(width);
    const read = await drawingReads(page, shown);
    expect(read, `[data-plan] and ${shown} ${where}`).not.toBeNull();
    if (!read) continue;
    // Without planks or lettering on the page, "inside" is true of anything.
    expect.soft(read.planks, `shown planks ${where}`).toBeGreaterThan(0);
    expect.soft(read.texts, `shown ${LETTERING} ${where}`).toBeGreaterThan(0);
    expect
      .soft(read.cut, `the drawing's parts cut or outside ${where}`)
      .toEqual([]);
    expect
      .soft(
        read.height,
        `${shown}'s height (px) ${where}, Iris's floor ${NARROW_FLOOR_PX}`,
      )
      .toBeGreaterThanOrEqual(NARROW_FLOOR_PX);
    heights.push(
      `${at(width, height)}: ${shown} ${read.height.toFixed(1)} (${PLAN} ${read.hostHeight.toFixed(1)})`,
    );
  }
  note(test.info(), "drawing height", heights.join("; "));

  for (const dpr of [1, 3]) {
    const where = `390 x 664 at DPR ${dpr}`;
    // Below 768 the canvas is capped at 1.5 (B3.1), so DPR 3 draws as B3.1's DPR 2 at 390 did.
    const bound = dpr === 1 ? 1.5 : 1.0;
    const run = await openModel(browser, {
      width: 390,
      height: 664,
      dpr,
      clock: true,
    });
    try {
      await run.goto();
      const state = await run.until(SHOWN, 4, FIRST);
      expect(state, `[data-model] held at landed on the clock, ${where}`).toBe(
        "landed",
      );
      const r = await registration(run.page, 390, dpr);
      expect(r, `the shown drawing and its profile, ${where}`).not.toBeNull();
      if (r) {
        note(
          test.info(),
          "registration",
          `${where} on ${drawingAt(390)} ${JSON.stringify(r.clip)}: Hausdorff ${r.max.toFixed(2)} CSS px (p99 ${r.p99.toFixed(2)}), bound ${bound}. SwiftShader.`,
        );
        expect
          .soft(r.a, `the drawing's silhouette edge, ${where}`)
          .toBeGreaterThan(0);
        expect
          .soft(r.b, `the model's silhouette edge, ${where}`)
          .toBeGreaterThan(0);
        expect
          .soft(r.max, `frame 1 on .ln-outline (Hausdorff, CSS px), ${where}`)
          .toBeLessThanOrEqual(bound);
      }
      expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
    } finally {
      await run.close();
    }
  }
});

// ---------------------------------------------------------------------------------------------

test("W10 the control: on / at every window below 768 the contract names (WebGL refused), one [data-motion] slot shown, placed as Iris places it, holding one group named Motion with Full, Calm and Off in order, each a 44 px target wholly inside the viewport where it sits; the hidden slot's buttons take no focus; the foot row's targets (Read as page and the three) sit clear of the drawing's ink", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.context().addInitScript(refuseWebGl);
  for (const [width, height] of PHONES) {
    const where = `at ${at(width, height)}`;
    await openHome(page, width, height);
    await page
      .waitForFunction(
        (slot) =>
          [...document.querySelectorAll(slot)].some(
            (el) =>
              el.getClientRects().length > 0 &&
              el.querySelectorAll("button").length === 3,
          ),
        MOTION,
        { timeout: 5000 },
      )
      .catch(() => undefined);
    const placed = await page.evaluate(
      ({ slot, group, place }) => {
        const slots = [...document.querySelectorAll(slot)];
        const shown = slots.filter((el) => el.getClientRects().length > 0);
        const el = shown[0];
        const follows = (
          a: Element | null | undefined,
          b: Element | null | undefined,
        ) =>
          Boolean(
            a &&
              b &&
              a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
          );
        const focusable = slots
          .filter((s) => s !== el)
          .flatMap((s) => [...s.querySelectorAll("button")])
          .filter((b) => {
            b.focus();
            const took = document.activeElement === b;
            b.blur();
            return took;
          })
          .map((b) => (b.textContent ?? "").trim());
        // Where it sits: brought into view as a visitor scrolls to it, then read.
        el?.querySelector(group)?.scrollIntoView({ block: "nearest" });
        const cw = document.documentElement.clientWidth;
        const ch = innerHeight;
        return {
          slots: slots.length,
          shown: shown.length,
          after: follows(document.querySelector(place.after), el),
          before: follows(el, document.querySelector(place.before)),
          groups: el?.querySelectorAll(group).length ?? 0,
          focusable,
          targets: [...(el?.querySelectorAll(`${group} button`) ?? [])].map(
            (b) => {
              const r = b.getBoundingClientRect();
              return {
                text: (b.textContent ?? "").trim(),
                width: +r.width.toFixed(2),
                height: +r.height.toFixed(2),
                inside:
                  r.left >= -0.5 &&
                  r.top >= -0.5 &&
                  r.right <= cw + 0.5 &&
                  r.bottom <= ch + 0.5,
                top: +(r.top + scrollY).toFixed(1),
              };
            },
          ),
        };
      },
      { slot: MOTION, group: NAMED, place: CONTROL_PLACE },
    );
    expect
      .soft(
        [placed.slots, placed.shown],
        `[data-motion] slots in the page and shown ${where}`,
      )
      .toEqual([2, 1]);
    expect
      .soft(
        { after: placed.after, before: placed.before },
        `the shown slot ${CONTROL_PLACE.words} ${where}`,
      )
      .toEqual({ after: true, before: true });
    expect
      .soft(placed.groups, `named groups in the shown slot ${where}`)
      .toBe(1);
    await expect
      .soft(
        page.getByRole("group", { name: "Motion", exact: true }),
        `a group named Motion ${where}`,
      )
      .toHaveCount(1);
    expect
      .soft(
        placed.targets.map((t) => t.text),
        `the group's buttons, in order ${where}`,
      )
      .toEqual([...MODES]);
    expect
      .soft(
        placed.targets
          .filter((t) => t.width < 44 - 0.05 || t.height < 44 - 0.05)
          .map((t) => `${t.text} ${t.width} x ${t.height}`),
        `motion buttons smaller than 44 x 44 px ${where}`,
      )
      .toEqual([]);
    expect
      .soft(
        placed.targets.filter((t) => !t.inside).map((t) => t.text),
        `motion buttons not wholly inside the viewport where they sit ${where}`,
      )
      .toEqual([]);
    expect
      .soft(
        placed.focusable,
        `buttons in the hidden slot that take focus ${where}`,
      )
      .toEqual([]);
    const ink = await inkUnderRow(page);
    expect
      .soft(ink.targets, `the foot row's shown targets ${where}`)
      .toBeGreaterThan(0);
    expect
      .soft(
        ink.under,
        `the drawing's ink under the foot row's targets (pixels that change when [data-plan] is hidden) ${where}`,
      )
      .toEqual([]);
    note(
      test.info(),
      "control",
      `${where}: buttons' page top ${placed.targets.map((t) => t.top).join(", ")}`,
    );
  }
});

/**
 * The drawing's ink under the foot row (Iris's sweep, .crew/sprint/44/placement.md): at scroll 0,
 * each shown link and button in `main > [data-foot]` has its box shot with the row hidden, once with
 * the drawing and once with `[data-plan]` hidden too. A pixel that differs by more than 16 in a
 * channel is the drawing's ink where the row sits.
 */
async function inkUnderRow(page: Page) {
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll("main > [data-foot] :is(a, button)")]
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          what: (el.textContent ?? "").trim(),
          x: r.left,
          y: r.top,
          width: r.width,
          height: r.height,
        };
      }),
  );
  const shoot = async (hide: string) => {
    const style = await page.addStyleTag({
      content: `${hide} { visibility: hidden !important; }`,
    });
    const shots: Image[] = [];
    for (const b of boxes)
      shots.push(decodePng(await page.screenshot({ clip: whole(b) })));
    await style.evaluate((el) => (el as Element).remove());
    return shots;
  };
  const drawn = await shoot("main > [data-foot]");
  const bare = await shoot("main > [data-foot], [data-plan]");
  const under: string[] = [];
  boxes.forEach((b, i) => {
    const [a, c] = [drawn[i], bare[i]];
    if (!a || !c) return;
    let n = 0;
    for (let k = 0; k < a.data.length; k += 4)
      if (
        [0, 1, 2].some(
          (j) => Math.abs((a.data[k + j] ?? 0) - (c.data[k + j] ?? 0)) > 16,
        )
      )
        n++;
    if (n > 0) under.push(`"${b.what}": ${n} px`);
  });
  return { targets: boxes.length, under };
}

// ---------------------------------------------------------------------------------------------

/**
 * W11's source read, in the page at its window: every CSS rule that applies now (its @media and
 * @supports conditions match) to the bar or to main outside the facts below the sheet (the rules
 * that place the narrow sheet), with each custom property its declarations use, followed to its
 * definitions on those elements or their ancestors, and the elements' inline styles. Returns the
 * declarations that size from vh, dvh or lvh (or their block forms), and those from svh.
 */
function viewportUnits(page: Page) {
  return page.evaluate(() => {
    const BANNED = /(?:\d|\.)\s*(?:d|l)?v(?:h|b)\b/i;
    const SMALL = /(?:\d|\.)\s*sv(?:h|b)\b/i;
    const bar = document.querySelector("header:has(nav)");
    const main = document.querySelector("main");
    const scope = new Set<Element>(
      [bar, main, ...(main?.querySelectorAll("*") ?? [])].filter(
        (el): el is Element => Boolean(el && !el.closest(".facts")),
      ),
    );
    const ancestors = new Set<Element>();
    for (const el of scope)
      for (let a = el.parentElement; a; a = a.parentElement) ancestors.add(a);
    type Hit = { where: string; text: string };
    const rules: { selector: string; style: CSSStyleDeclaration }[] = [];
    const unreadable: string[] = [];
    const walk = (list: CSSRuleList) => {
      for (const rule of list) {
        if (rule instanceof CSSStyleRule) {
          rules.push({ selector: rule.selectorText, style: rule.style });
          if (rule.cssRules?.length) walk(rule.cssRules);
        } else if (rule instanceof CSSMediaRule) {
          if (matchMedia(rule.media.mediaText).matches) walk(rule.cssRules);
        } else if (rule instanceof CSSSupportsRule) {
          if (CSS.supports(rule.conditionText)) walk(rule.cssRules);
        } else if (rule instanceof CSSImportRule) {
          if (
            rule.styleSheet &&
            matchMedia(rule.media.mediaText || "all").matches
          )
            walk(rule.styleSheet.cssRules);
        } else if ("cssRules" in rule) {
          // @layer, @container and the like: read as applying, the cautious side.
          walk((rule as CSSGroupingRule).cssRules);
        }
      }
    };
    for (const sheet of document.styleSheets) {
      try {
        walk(sheet.cssRules);
      } catch {
        unreadable.push(sheet.href ?? "(inline sheet)");
      }
    }
    const matching = (selector: string, set: Set<Element>) => {
      // Pseudo-elements style their element's box; user-action states are read as on.
      const bare = selector
        .replace(
          /::?(?:before|after|marker|placeholder|selection|backdrop|first-line|first-letter|file-selector-button)\b/g,
          "",
        )
        .replace(/::[\w-]+(?:\([^)]*\))?/g, "");
      try {
        return [...document.querySelectorAll(bare || "*")].some((el) =>
          set.has(el),
        );
      } catch {
        return null;
      }
    };
    const banned: Hit[] = [];
    const small: Hit[] = [];
    const wanted = new Set<string>();
    const read = (where: string, prop: string, value: string) => {
      const text = `${prop}: ${value}`;
      if (BANNED.test(value)) banned.push({ where, text });
      if (SMALL.test(value)) small.push({ where, text });
      for (const m of value.matchAll(/var\(\s*(--[\w-]+)/g))
        if (m[1]) wanted.add(m[1]);
    };
    const applying = rules.filter(({ selector, style }) => {
      const hit = matching(selector, scope);
      if (hit === null) {
        // A selector the browser can't query: judged by its text, if it sizes from the viewport.
        if (BANNED.test(style.cssText))
          banned.push({
            where: `${selector} (unqueryable)`,
            text: style.cssText,
          });
        return false;
      }
      return hit;
    });
    for (const { selector, style } of applying)
      for (const prop of style)
        if (!prop.startsWith("--"))
          read(selector, prop, style.getPropertyValue(prop));
    for (const el of scope) {
      const inline = el.getAttribute("style");
      if (inline)
        read(`<${el.tagName.toLowerCase()}> style=""`, "style", inline);
    }
    // The custom properties those declarations use, followed where the scope inherits them from.
    const holders = new Set<Element>([...scope, ...ancestors]);
    const seen = new Set<string>();
    for (
      let round = 0;
      round < 6 && [...wanted].some((v) => !seen.has(v));
      round++
    ) {
      const now = [...wanted].filter((v) => !seen.has(v));
      for (const v of now) seen.add(v);
      for (const { selector, style } of rules) {
        if (!now.some((v) => style.getPropertyValue(v) !== "")) continue;
        if (!matching(selector, holders)) continue;
        for (const v of now) {
          const value = style.getPropertyValue(v);
          if (value !== "") read(selector, v, value);
        }
      }
      for (const el of holders)
        for (const v of now) {
          const value = (el as HTMLElement).style?.getPropertyValue(v) ?? "";
          if (value !== "")
            read(`<${el.tagName.toLowerCase()}> style=""`, v, value);
        }
    }
    return {
      rules: rules.length,
      applying: applying.length,
      scope: scope.size,
      banned: banned.map((h) => `${h.where} { ${h.text} }`),
      small: small.map((h) => `${h.where} { ${h.text} }`),
      unreadable,
    };
  });
}

/** Every layout shift without input, with its sources, from before the page's own scripts. */
function recordShifts() {
  const w = window as Window & { __shifts?: string[] };
  w.__shifts = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const shift = entry as PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
        sources?: { node?: Node | null }[];
      };
      if (shift.hadRecentInput) continue;
      const nodes = (shift.sources ?? []).map((s) => {
        const el = s.node instanceof Element ? s.node : s.node?.parentElement;
        return el
          ? `<${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? `.${el.className.split(" ")[0]}` : ""}>`
          : "?";
      });
      w.__shifts?.push(
        `${shift.value.toFixed(4)} at ${shift.startTime.toFixed(0)} ms (${nodes.join(", ")})`,
      );
    }
  }).observe({ type: "layout-shift", buffered: true });
}

test("W11 still: by B1.8's read, CLS 0 over load plus 2 s at 390 x 664 and 375 x 548 with the model loading, and through a resize from 390 x 664 to 390 x 844 and back with no input; the rules that place the narrow sheet size from svh, never vh, dvh or lvh (a source read of the applying CSS at both windows)", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  for (const [width, height] of [
    [390, 664],
    [375, 548],
  ] as const) {
    const where = `at ${at(width, height)}`;
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "no-preference",
    });
    try {
      const page = await context.newPage();
      await watchLayoutShift(page);
      await page.addInitScript(recordShifts);
      const response = await page.goto("/");
      expect(response?.status(), `status of / ${where}`).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      await pause(2000);
      const read = () =>
        page.evaluate(() => ({
          cls: (window as Window & { __cls?: number }).__cls,
          shifts: (window as Window & { __shifts?: string[] }).__shifts ?? [],
        }));
      const loaded = await read();
      expect
        .soft(
          loaded.cls,
          `layout shift over load plus 2 s ${where}: ${loaded.shifts.join("; ")}`,
        )
        .toBe(0);

      const units = await viewportUnits(page);
      note(
        test.info(),
        "source",
        `${where}: ${units.applying} of ${units.rules} rules apply to ${units.scope} elements; svh in ${units.small.join("; ") || "none"}; unreadable sheets ${units.unreadable.join(", ") || "none"}`,
      );
      expect.soft(units.applying, `rules read ${where}`).toBeGreaterThan(0);
      expect
        .soft(units.unreadable, `style sheets the read couldn't open ${where}`)
        .toEqual([]);
      expect
        .soft(
          units.banned,
          `declarations placing the narrow sheet from vh, dvh or lvh ${where}`,
        )
        .toEqual([]);

      if (height === 664) {
        // The toolbars going and coming back: the window grows to 844 and returns, no input.
        for (const h of [844, 664]) {
          await page.setViewportSize({ width, height: h });
          await pause(1000);
          if (h === 844) {
            const tall = await viewportUnits(page);
            expect
              .soft(
                tall.banned,
                `declarations placing the narrow sheet from vh, dvh or lvh at ${at(width, h)}`,
              )
              .toEqual([]);
          }
        }
        const resized = await read();
        expect
          .soft(
            resized.cls,
            `layout shift through the resize to 390 x 844 and back: ${resized.shifts.join("; ")}`,
          )
          .toBe(0);
      }
    } finally {
      await context.close();
    }
  }
});
