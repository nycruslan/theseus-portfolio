import AxeBuilder from "@axe-core/playwright";
import {
  type Browser,
  expect,
  type Page,
  type TestInfo,
  test,
} from "@playwright/test";
import { BUTTS } from "../lib/half-model";
import {
  composite,
  contrast,
  installRgba,
  measureLcp,
  type Rgb,
  SCHEMES,
  watchLayoutShift,
} from "./helpers";
import { ORIGINAL, PLANK_IDS, REPLACED, SEATED } from "./retros";

// Sprint 22, B1: the lines plan, the drawing at the top of the sheet (.crew/sprint/22/contract.md).
// Sprint 23 adds B2.5, the same drawing at the foot of /read (.crew/sprint/23/contract.md).
// B1.4, B1.8 and B1.9, one test per number, and hero.spec.ts's C6 and C9 rewritten onto the drawing
// as the contract's disposition table says (C4 is folded into B1.8 and C5 into B1.9, with their
// assertions). Hook: one `[data-plan]`, aria-hidden, holding inline SVG and the planks as
// `[data-plank="k.j"]`, a seated one with `data-sprint`. Its lettering may be SVG text or HTML over
// the SVG: the text rules hold for both.

const PLAN = "[data-plan]";
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];
const VIEWS = ["Profile", "Half-breadth plan", "Body plan"];
const SIZES = [
  [390, 844],
  [1024, 768],
  [1440, 900],
] as const;

type Rgba = number[] | null;
type Rect = { left: number; top: number; right: number; bottom: number };

test.beforeEach(async ({ context }) => {
  await context.addInitScript(installRgba);
});

async function open(page: Page, width: number, height = 900, url = "/") {
  await page.setViewportSize({ width, height });
  const response = await page.goto(url);
  expect(response?.status(), `status of ${url}`).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

const wait = (page: Page, ms: number) =>
  page.evaluate((delay) => new Promise((done) => setTimeout(done, delay)), ms);

/** The drawing as a visitor's browser has it: its planks, its lettering and its rect. */
async function readPlan(page: Page) {
  return page.evaluate((selector) => {
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    const box = (el: Element): Rect => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    };
    const plans = document.querySelectorAll(selector);
    const plan = plans[0];
    if (!plan) return null;
    const shown = (el: Element) =>
      el.getClientRects().length > 0 &&
      el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    const geometry = (el: Element) =>
      el instanceof SVGGeometryElement
        ? [el]
        : [
            ...el.querySelectorAll(
              "path, polygon, rect, polyline, ellipse, circle",
            ),
          ].filter(
            (g): g is SVGGeometryElement => g instanceof SVGGeometryElement,
          );
    const svgs = [...plan.querySelectorAll("svg")].filter(shown);
    const planks = [...plan.querySelectorAll("[data-plank]")]
      .filter(shown)
      .map((el) => {
        const svg = el.closest("svg");
        const geo = geometry(el)[0];
        const s = geo ? getComputedStyle(geo) : null;
        const fill = s && rgba ? rgba(s.fill) : null;
        const alpha = s ? Number(s.fillOpacity) * Number(s.opacity) : 1;
        return {
          id: el.getAttribute("data-plank") ?? "",
          sprint: el.getAttribute("data-sprint"),
          box: box(el),
          svg: svg ? box(svg) : null,
          fill: fill
            ? [fill[0] ?? 0, fill[1] ?? 0, fill[2] ?? 0, (fill[3] ?? 1) * alpha]
            : null,
          fillValue: s?.fill ?? "",
        };
      });
    // Whether a screen point is in a plank's painted fill: inside its geometry and inside every
    // clipPath an ancestor applies (the planks are boxes cut by the hull's outline).
    const inPlank = (plank: Element, x: number, y: number) =>
      geometry(plank).some((g) => {
        const m = g.getScreenCTM();
        if (
          !m ||
          !g.isPointInFill(new DOMPoint(x, y).matrixTransform(m.inverse()))
        ) {
          return false;
        }
        for (
          let el: Element | null = g;
          el && el !== plan;
          el = el.parentElement
        ) {
          const ref = getComputedStyle(el).clipPath.match(
            /url\(["']?#([^"')]+)["']?\)/,
          )?.[1];
          const clip = ref ? document.getElementById(ref) : null;
          if (!ref) continue;
          const owner =
            el instanceof SVGGraphicsElement ? el.getScreenCTM() : null;
          if (!clip || !owner) return false;
          const local = new DOMPoint(x, y).matrixTransform(owner.inverse());
          if (!geometry(clip).some((c) => c.isPointInFill(local))) return false;
        }
        return true;
      });
    const shownPlanks = [...plan.querySelectorAll("[data-plank]")].filter(
      shown,
    );
    // Leaders (fix round 1, decision 5): each absolute-M subpath of a rendered path.ln-leader, its
    // two ends on screen, and the plank whose fill holds its far end.
    const leaders = [...plan.querySelectorAll("path.ln-leader")]
      .filter(
        (el): el is SVGPathElement => el instanceof SVGPathElement && shown(el),
      )
      .flatMap((leader) => {
        const m = leader.getScreenCTM();
        const svg = leader.ownerSVGElement;
        if (!m || !svg) return [];
        return (leader.getAttribute("d") ?? "")
          .split(/(?=M)/)
          .filter((d) => d.trim() !== "")
          .map((d) => {
            const probe = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "path",
            );
            probe.setAttribute("d", d);
            svg.append(probe);
            const length = probe.getTotalLength();
            const [a, b] = [
              probe.getPointAtLength(0),
              probe.getPointAtLength(length),
            ];
            probe.remove();
            const start = new DOMPoint(a.x, a.y).matrixTransform(m);
            const end = new DOMPoint(b.x, b.y).matrixTransform(m);
            const into = shownPlanks.find((p) => inPlank(p, end.x, end.y));
            return { start, into: into?.getAttribute("data-plank") ?? null };
          });
      });
    const LEADER_GAP = 6;
    // Lettering: anything in the drawing that holds text of its own.
    const texts = [...plan.querySelectorAll("*")]
      .filter(
        (el) =>
          shown(el) &&
          [...el.childNodes].some(
            (n) =>
              n.nodeType === Node.TEXT_NODE &&
              (n.textContent ?? "").trim() !== "",
          ),
      )
      .map((el) => {
        const s = getComputedStyle(el);
        const svg = el instanceof SVGGraphicsElement;
        const ctm = svg ? el.getScreenCTM() : null;
        const scale = ctm ? Math.hypot(ctm.a, ctm.b) : 1;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        // The plank whose fill holds the lettering's centre.
        const on = shownPlanks.find((p) => inPlank(p, cx, cy));
        // The planks a leader joins it to: one that starts within a few px of its box.
        const led = leaders
          .filter(
            ({ start }) =>
              Math.max(r.left - start.x, 0, start.x - r.right) ** 2 +
                Math.max(r.top - start.y, 0, start.y - r.bottom) ** 2 <=
              LEADER_GAP ** 2,
          )
          .flatMap(({ into }) => (into ? [into] : []));
        return {
          text: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
          color: rgba ? rgba(svg ? s.fill : s.color) : null,
          opacity: Number(svg ? s.fillOpacity : 1) * Number(s.opacity),
          size: Number.parseFloat(s.fontSize) * scale,
          on: on?.getAttribute("data-plank") ?? null,
          led,
        };
      });
    const focusable = plan.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex], [contenteditable=""], [contenteditable="true"]',
    ).length;
    return {
      count: plans.length,
      ariaHidden: plan.getAttribute("aria-hidden"),
      svgs: svgs.length,
      focusable,
      planks,
      texts,
      rect: box(plan),
      cw: document.documentElement.clientWidth,
    };
  }, PLAN);
}

async function tokens(page: Page) {
  return page.evaluate(() => {
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    const probe = document.createElement("div");
    document.body.append(probe);
    const read = (name: string) => {
      probe.style.color = `var(${name})`;
      return rgba ? rgba(getComputedStyle(probe).color) : null;
    };
    const out = {
      foreground: read("--foreground"),
      muted: read("--muted"),
      background: read("--background"),
    };
    probe.remove();
    return out;
  });
}

const same = (a: Rgba, b: Rgba) =>
  Boolean(
    a &&
      b &&
      a.every((v, i) => Math.abs(v - (b[i] ?? -9)) <= (i < 3 ? 1 : 0.02)),
  );
const rgbOf = (c: Rgba): Rgb => [c?.[0] ?? 0, c?.[1] ?? 0, c?.[2] ?? 0];
const over = (c: Rgba, ground: Rgb): Rgb =>
  composite([c?.[0] ?? 0, c?.[1] ?? 0, c?.[2] ?? 0, c?.[3] ?? 1], ground);

// ---------------------------------------------------------------------------------------------

test("B1.4 the lines plan: one inert drawing in the HTML, 22 planks seated by the retros, uncropped, legible lettering and an HTML legend", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const html = await (await request.get("/")).text();
  const at = html.search(/data-plan(?:=|[\s>])/);
  expect(at, "[data-plan] is in the HTML response of /").toBeGreaterThan(-1);
  expect
    .soft(html.slice(at), "inline SVG after [data-plan] in the HTML")
    .toMatch(/<svg[\s>]/);
  expect.soft(html.slice(at), "planks in the HTML").toContain('data-plank="');

  const expectedIds = [...PLANK_IDS].sort();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await open(page, width);
    const where = `${width} px`;
    const plan = await readPlan(page);
    expect(plan, `${PLAN} at ${where}`).not.toBeNull();
    if (!plan) continue;
    expect.soft(plan.count, `${PLAN} elements at ${where}`).toBe(1);
    expect.soft(plan.ariaHidden, `aria-hidden at ${where}`).toBe("true");
    expect
      .soft(plan.svgs, `rendered svg in the drawing at ${where}`)
      .toBeGreaterThan(0);
    expect
      .soft(plan.focusable, `focusable elements in the drawing at ${where}`)
      .toBe(0);
    expect
      .soft(plan.planks.map((p) => p.id).sort(), `rendered planks at ${where}`)
      .toEqual(expectedIds);
    for (const [k, butts] of BUTTS.entries()) {
      expect
        .soft(
          plan.planks.filter((p) => p.id.startsWith(`${k}.`)).length,
          `planks on lift ${k} at ${where}`,
        )
        .toBe(butts.length + 1);
    }
    expect
      .soft(
        Object.fromEntries(
          plan.planks.map((p) => [
            p.id,
            p.sprint === null ? undefined : Number(p.sprint),
          ]),
        ),
        `each plank's data-sprint at ${where}`,
      )
      .toEqual(SEATED);

    if ([320, 390, 1440].includes(width)) {
      const cropped = plan.planks.filter(
        (p) =>
          p.box.left < -0.5 ||
          p.box.right > plan.cw + 0.5 ||
          !p.svg ||
          p.box.left < p.svg.left - 0.5 ||
          p.box.right > p.svg.right + 0.5 ||
          p.box.top < p.svg.top - 0.5 ||
          p.box.bottom > p.svg.bottom + 0.5,
      );
      expect
        .soft(
          cropped.map((p) => p.id),
          `planks cropped at ${where}`,
        )
        .toEqual([]);
    }

    // Nothing in the drawing is hit at any plank's centre.
    const hit = await page.evaluate((selector) => {
      const plan = document.querySelector(selector);
      return [...(plan?.querySelectorAll("[data-plank]") ?? [])]
        .filter((p) => p.getClientRects().length > 0)
        .flatMap((p) => {
          p.scrollIntoView({ block: "center" });
          const r = p.getBoundingClientRect();
          const el = document.elementFromPoint(
            r.left + r.width / 2,
            r.top + r.height / 2,
          );
          return el && plan?.contains(el) ? [p.getAttribute("data-plank")] : [];
        });
    }, PLAN);
    expect.soft(hit, `planks hit by elementFromPoint at ${where}`).toEqual([]);

    // Lettering: ink or graphite, at least 11 px as rendered.
    const ink = await tokens(page);
    expect
      .soft(
        plan.texts
          .filter(
            (t) => !same(t.color, ink.foreground) && !same(t.color, ink.muted),
          )
          .map((t) => `"${t.text}": ${JSON.stringify(t.color)}`),
        `lettering not in --foreground or --muted at ${where}`,
      )
      .toEqual([]);
    expect
      .soft(
        plan.texts
          .filter((t) => t.size < 11 - 0.01)
          .map((t) => `"${t.text}": ${t.size.toFixed(2)} px`),
        `lettering under 11 px at ${where}`,
      )
      .toEqual([]);

    if (width >= 768) {
      const words = plan.texts.map((t) => t.text);
      expect
        .soft(words, `the three views' captions at ${where}`)
        .toEqual(expect.arrayContaining(VIEWS));
      const unnumbered = plan.planks
        .filter((p) => p.sprint !== null)
        .filter(
          (p) =>
            !plan.texts.some(
              (t) =>
                t.text === p.sprint && (t.on === p.id || t.led.includes(p.id)),
            ),
        )
        .map((p) => `${p.id} (sprint ${p.sprint})`);
      expect
        .soft(
          unnumbered,
          `seated planks without their number on them, or led to them, at ${where}`,
        )
        .toEqual([]);
    }
  }

  // A plank's number against its plank's fill, in both schemes.
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, 1440);
    const plan = await readPlan(page);
    const ink = await tokens(page);
    const ground = rgbOf(ink.background);
    const numbers = (plan?.texts ?? []).filter(
      (t) => t.on !== null && /^\d+$/.test(t.text),
    );
    expect(numbers.length, `plank numbers at 1440 (${scheme})`).toBeGreaterThan(
      0,
    );
    for (const number of numbers) {
      const plank = plan?.planks.find((p) => p.id === number.on);
      const fill = plank?.fill ?? null;
      expect
        .soft(
          fill,
          `plank ${number.on}'s fill resolves (${plank?.fillValue}, ${scheme})`,
        )
        .not.toBeNull();
      if (!fill) continue;
      const under = over(fill, ground);
      const text = number.color
        ? [
            number.color[0] ?? 0,
            number.color[1] ?? 0,
            number.color[2] ?? 0,
            (number.color[3] ?? 1) * number.opacity,
          ]
        : null;
      expect
        .soft(
          text ? contrast(over(text, under), under) : 0,
          `number ${number.text} on plank ${number.on} (${scheme})`,
        )
        .toBeGreaterThanOrEqual(4.5);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });

  // The legend and the count line are HTML text.
  await open(page, 1440);
  const words = await page.evaluate((line) => {
    const squashed = (el: Element | null) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const outside = [...document.querySelectorAll("body *")].filter(
      (el) =>
        !el.closest("svg") &&
        !["MAIN", "BODY"].includes(el.tagName) &&
        el.getClientRects().length > 0,
    );
    const legend = outside
      .filter(
        (el) =>
          /\bseated\b/i.test(el.textContent ?? "") &&
          /\boriginal\b/i.test(el.textContent ?? ""),
      )
      .at(-1);
    const count = outside.filter((el) => squashed(el).includes(line)).at(-1);
    return {
      legend: legend ? squashed(legend) : null,
      count: count !== undefined,
    };
  }, `${PLANK_IDS.length} planks: ${REPLACED} replaced, ${ORIGINAL} original`);
  expect(
    words.legend,
    "an HTML legend naming seated and original",
  ).not.toBeNull();
  expect
    .soft(words.legend ?? "", "the legend names no state B1 doesn't have")
    .not.toMatch(/pencil|copper|live|drawing now|in progress|running/i);
  expect
    .soft(
      words.count,
      `the HTML line "${PLANK_IDS.length} planks: ${REPLACED} replaced, ${ORIGINAL} original"`,
    )
    .toBe(true);
});

/** What the page shows, read in one go (it works with scripts off: page.evaluate only). */
function sheet(page: Page) {
  return page.evaluate((selector) => {
    const squashed = (el: Element | null) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const plan = document.querySelector(selector);
    const r = plan?.getBoundingClientRect();
    return {
      title: squashed(document.querySelector("main > header")),
      rows: [
        ...document.querySelectorAll(
          'section[aria-labelledby="revisions"] tbody tr',
        ),
      ].map((tr) => squashed(tr)),
      planks: [...(plan?.querySelectorAll("[data-plank]") ?? [])]
        .filter((p) => p.getClientRects().length > 0)
        .map(
          (p) =>
            `${p.getAttribute("data-plank")}:${p.getAttribute("data-sprint")}`,
        ),
      facts: ["work", "projects", "stack", "education", "contact"].map((id) =>
        squashed(document.querySelector(`section[aria-labelledby="${id}"]`)),
      ),
      rect: r ? [r.left, r.top + scrollY, r.width, r.height] : null,
    };
  }, PLAN);
}

async function withoutScripts(browser: Browser, width: number) {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width, height: 900 },
  });
  const bare = await context.newPage();
  await bare.goto("/");
  // Fonts load without scripts too; wait for them from the test, as an awaited promise can't run here.
  for (
    let i = 0;
    i < 50 && (await bare.evaluate(() => document.fonts.status)) !== "loaded";
    i++
  ) {
    await new Promise((done) => setTimeout(done, 100));
  }
  const seen = await sheet(bare);
  await context.close();
  return seen;
}

test("B1.8 it needs no script and nothing moves: the same sheet without scripts, no animation or layout shift, print and forced colors keep the drawing (hero C4)", async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000);
  // Layout shift is 0 over load plus 2 s, web fonts included.
  for (const [width, height] of SIZES) {
    const fresh = await page.context().newPage();
    await fresh.setViewportSize({ width, height });
    await watchLayoutShift(fresh);
    await fresh.goto("/");
    await expect(fresh.locator(PLAN), `the drawing at ${width}`).toHaveCount(1);
    await fresh.evaluate(() => document.fonts.ready);
    await wait(fresh, 2000);
    const cls = await fresh.evaluate(
      () => (window as Window & { __cls?: number }).__cls,
    );
    expect.soft(cls, `layout shift over load plus 2 s at ${width}`).toBe(0);
    await fresh.close();
  }

  // With scripts off: the same title block, rows, planks, facts and drawing rect.
  for (const width of [390, 1440]) {
    await open(page, width);
    const on = await sheet(page);
    const off = await withoutScripts(browser, width);
    expect(on.planks, `planks with scripts at ${width}`).toHaveLength(
      PLANK_IDS.length,
    );
    expect(on.rows, `revision rows with scripts at ${width}`).toHaveLength(5);
    for (const key of ["title", "rows", "planks", "facts"] as const) {
      expect
        .soft(off[key], `${key} without scripts at ${width}`)
        .toEqual(on[key]);
    }
    expect(off.rect, `the drawing without scripts at ${width}`).not.toBeNull();
    for (const [i, edge] of ["left", "top", "width", "height"].entries()) {
      expect
        .soft(
          Math.abs((on.rect?.[i] ?? 0) - (off.rect?.[i] ?? -99)),
          `drawing ${edge} with vs without scripts at ${width}`,
        )
        .toBeLessThanOrEqual(0.5);
    }
  }

  // With motion allowed nothing animates: at load, 2 s later, and after a scroll to the bottom and
  // back. The events catch an animation or transition too short to be running when the test looks.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const win = window as Window & { __motion?: string[] };
    win.__motion = [];
    for (const type of ["animationstart", "transitionrun"]) {
      window.addEventListener(
        type,
        (event) => {
          const target = event.target as Element | null;
          win.__motion?.push(`${type} on <${target?.tagName?.toLowerCase()}>`);
        },
        true,
      );
    }
  });
  await open(page, 1440);
  const animations = () => page.evaluate(() => document.getAnimations().length);
  expect.soft(await animations(), "animations at load").toBe(0);
  await wait(page, 2000);
  expect.soft(await animations(), "animations 2 s after load").toBe(0);
  const box = page.locator(PLAN);
  const snapshot = async () => ({
    html: await box.evaluate((el) => el.outerHTML),
    rect: await box.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [r.left, r.top + scrollY, r.width, r.height];
    }),
    pixels: (await box.screenshot()).toString("base64"),
  });
  await page.evaluate(() => scrollTo(0, 0));
  const before = await snapshot();
  for (const y of [120, 400]) {
    await page.evaluate((to) => scrollTo(0, to), y);
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => r(null))),
    );
    expect.soft(await animations(), `animations at scroll ${y}`).toBe(0);
    const during = await snapshot();
    expect
      .soft(during.html, `the drawing's markup at scroll ${y}`)
      .toBe(before.html);
    expect
      .soft(during.rect, `the drawing's rect at scroll ${y}`)
      .toEqual(before.rect);
    expect
      .soft(
        during.pixels === before.pixels,
        `the drawing's pixels at scroll ${y}`,
      )
      .toBe(true);
  }
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => r(null))),
  );
  expect.soft(await animations(), "animations at the bottom").toBe(0);
  await page.evaluate(() => scrollTo(0, 0));
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => r(null))),
  );
  expect.soft(await animations(), "animations after scrolling back").toBe(0);
  const after = await snapshot();
  expect
    .soft(after.html, "the drawing's markup after a full scroll and back")
    .toBe(before.html);
  expect
    .soft(
      after.pixels === before.pixels,
      "the drawing's pixels after a full scroll and back",
    )
    .toBe(true);
  expect
    .soft(
      await page.evaluate(
        () => (window as Window & { __motion?: string[] }).__motion,
      ),
      "animation or transition events",
    )
    .toEqual([]);

  // Print: the drawing and every fact are visible.
  await page.emulateMedia({ media: "print" });
  await open(page, 1440);
  const printed = await page.evaluate((selector) => {
    const seen = (el: Element | null) =>
      Boolean(
        el?.checkVisibility({
          opacityProperty: true,
          visibilityProperty: true,
        }) && el.getClientRects().length > 0,
      );
    const plan = document.querySelector(selector);
    const facts = [
      "revisions",
      "work",
      "projects",
      "stack",
      "education",
      "contact",
    ].map((id) => document.querySelector(`section[aria-labelledby="${id}"]`));
    return {
      plan: seen(plan),
      planks: [...(plan?.querySelectorAll("[data-plank]") ?? [])].filter(seen)
        .length,
      header: seen(document.querySelector("main > header")),
      hidden: [
        ...facts.flatMap((s, i) => (seen(s) ? [] : [`section ${i}`])),
        ...facts.flatMap((s) =>
          [...(s?.querySelectorAll("li, tr, p, h3") ?? [])]
            .filter((el) => !seen(el))
            .map(
              (el) =>
                `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 24)}"`,
            ),
        ),
      ],
    };
  }, PLAN);
  expect.soft(printed.plan, "the drawing in print").toBe(true);
  expect.soft(printed.planks, "planks in print").toBe(PLANK_IDS.length);
  expect.soft(printed.header, "the title block in print").toBe(true);
  expect.soft(printed.hidden, "facts hidden in print").toEqual([]);
  await page.emulateMedia({ media: "screen" });

  // Forced colors: the drawing still shows, its strokes unlike the page's background.
  await page.emulateMedia({ forcedColors: "active" });
  for (const width of [390, 1440]) {
    await open(page, width);
    const forced = await page.evaluate((selector) => {
      const plan = document.querySelector(selector);
      const strokes = [
        ...(plan?.querySelectorAll(
          "path, line, polyline, polygon, rect, circle, ellipse",
        ) ?? []),
      ]
        .filter((el) => el.getClientRects().length > 0)
        .map((el) => getComputedStyle(el))
        .filter(
          (s) => s.stroke !== "none" && Number.parseFloat(s.strokeWidth) > 0,
        )
        .map((s) => s.stroke);
      return {
        active: matchMedia("(forced-colors: active)").matches,
        shown: Boolean(
          plan?.checkVisibility({
            opacityProperty: true,
            visibilityProperty: true,
          }),
        ),
        page: getComputedStyle(document.body).backgroundColor,
        strokes,
      };
    }, PLAN);
    const where = `forced colors at ${width}`;
    expect(forced.active, "forced colors are on").toBe(true);
    expect.soft(forced.shown, `the drawing shows, ${where}`).toBe(true);
    expect
      .soft(forced.strokes.length, `stroked lines in the drawing, ${where}`)
      .toBeGreaterThan(0);
    expect
      .soft(
        [
          ...new Set(
            forced.strokes.filter(
              (s) =>
                s === forced.page ||
                s === "transparent" ||
                s === "rgba(0, 0, 0, 0)",
            ),
          ),
        ],
        `strokes that vanish into the page (${forced.page}), ${where}`,
      )
      .toEqual([]);
  }
});

test("B1.9 LCP is text: in the title block, not in the drawing, no url, within 2,500 ms at 4x CPU (hero C5)", async ({
  page,
}, testInfo: TestInfo) => {
  test.setTimeout(120_000);
  for (const [width, height] of SIZES) {
    const fresh = await page.context().newPage();
    await fresh.setViewportSize({ width, height });
    const lcp = await measureLcp(fresh, "/");
    const where = `at ${width} x ${height}`;
    // Without the drawing, "LCP is not in it" would be true of any page.
    await expect(
      fresh.locator(PLAN),
      `the drawing is on the page ${where}`,
    ).toHaveCount(1);
    expect(lcp, `an LCP candidate ${where}`).not.toBeNull();
    if (lcp) {
      expect
        .soft(
          lcp.inHeader,
          `LCP <${lcp.tag}> "${lcp.text}" is in main > header ${where}`,
        )
        .toBe(true);
      expect.soft(lcp.inPlan, `LCP is in the drawing ${where}`).toBe(false);
      expect.soft(lcp.url, `LCP has a url ${where}`).toBe("");
      expect.soft(lcp.time, `LCP time (ms) ${where}`).toBeLessThanOrEqual(2500);
      // Reported, not gated: the 1.5 s target, and which text wins (the name or the bio).
      testInfo.annotations.push({
        type: "lcp",
        description: `${where}: <${lcp.tag}> "${lcp.text}" (${lcp.size} px²) at ${lcp.time.toFixed(0)} ms, target 1500 ms ${lcp.time <= 1500 ? "met" : "missed"}`,
      });
    }
    // Report-only: against a build of origin/main under the same throttle.
    const baseline = process.env.PLAYWRIGHT_BASELINE_URL;
    if (lcp && baseline) {
      const other = await page.context().newPage();
      await other.setViewportSize({ width, height });
      const base = await measureLcp(other, baseline);
      await other.close();
      testInfo.annotations.push({
        type: "lcp-vs-origin-main",
        description: `${where}: ${lcp.time.toFixed(0)} ms vs ${base?.time.toFixed(0)} ms (<${lcp.tag}> vs <${base?.tag}>)`,
      });
    }
    await fresh.close();
  }
});

test("C6. Weight: the drawing is at most 32,768 bytes, and it is in the HTML response", async ({
  page,
  request,
}) => {
  await open(page, 1440);
  const bytes = await page.evaluate(
    (selector) =>
      new TextEncoder().encode(
        document.querySelector(selector)?.outerHTML ?? "",
      ).length,
    PLAN,
  );
  expect(bytes, `${PLAN} outerHTML in bytes`).toBeGreaterThan(0);
  expect(bytes, `${PLAN} outerHTML in bytes`).toBeLessThanOrEqual(32_768);
  const response = await request.get("/");
  expect(response.ok()).toBe(true);
  expect(await response.text(), "the HTML response holds the planks").toContain(
    "data-plank=",
  );
});

test("C9. Hard gates: axe is clean, nothing in the drawing is hit or focused, no console error", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion });
    await open(page, 1440);
    await wait(page, 300);
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(problems, "errors on load").toEqual([]);

  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of [390, 1440]) {
      await open(page, width);
      await expect(
        page.locator(PLAN),
        "the drawing is on the page",
      ).toHaveCount(1);
      const results = await new AxeBuilder({ page })
        .withTags(AXE_TAGS)
        .analyze();
      const found = results.violations.map((v) => ({
        rule: v.id,
        impact: v.impact,
        targets: v.nodes.map((node) => node.target.join(" ")),
      }));
      expect.soft(found, `axe violations (${scheme}, ${width} px)`).toEqual([]);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });

  // A 3 x 3 grid inside the drawing: nothing of it, nothing interactive.
  for (const width of [390, 1440]) {
    await open(page, width);
    await page
      .locator(PLAN)
      .evaluate((el) => el.scrollIntoView({ block: "center" }));
    const hits = await page.evaluate(
      ({ plan, interactive }) => {
        const box = document.querySelector(plan);
        if (!box) return null;
        const r = box.getBoundingClientRect();
        const out: {
          point: string;
          inPlan: string[];
          interactive: string[];
        }[] = [];
        for (const fy of [1 / 6, 1 / 2, 5 / 6]) {
          for (const fx of [1 / 6, 1 / 2, 5 / 6]) {
            const x = r.left + r.width * fx;
            const y = r.top + r.height * fy;
            const stack = document
              .elementsFromPoint(x, y)
              .filter(
                (el) =>
                  el !== document.documentElement &&
                  el !== document.body &&
                  el.tagName !== "MAIN",
              );
            out.push({
              point: `${Math.round(x)},${Math.round(y)}`,
              inPlan: stack
                .filter((el) => box === el || box.contains(el))
                .map((el) => el.tagName.toLowerCase()),
              interactive: stack
                .filter((el) => el.matches(interactive))
                .map((el) => el.tagName.toLowerCase()),
            });
          }
        }
        return { onScreen: r.top >= 0 && r.bottom <= innerHeight, points: out };
      },
      {
        plan: PLAN,
        interactive:
          'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      },
    );
    expect(hits, `the drawing is there at ${width}`).not.toBeNull();
    expect(
      hits?.onScreen,
      `the drawing is on screen to be hit-tested at ${width}`,
    ).toBe(true);
    for (const point of hits?.points ?? []) {
      expect
        .soft(
          point.inPlan,
          `drawing elements hit at ${point.point}, ${width} px`,
        )
        .toEqual([]);
      expect
        .soft(
          point.interactive,
          `interactive elements at ${point.point}, ${width} px`,
        )
        .toEqual([]);
    }
  }

  // No Tab stop lands in the drawing: walk every stop on the page.
  await open(page, 1440);
  const stops = (await page.locator("a[href], button").count()) + 1;
  const inside: string[] = [];
  for (let i = 0; i < stops; i++) {
    await page.keyboard.press("Tab");
    const where = await page.evaluate((plan) => {
      const el = document.activeElement;
      return el?.closest(plan) ? el.tagName.toLowerCase() : null;
    }, PLAN);
    if (where) inside.push(where);
  }
  expect(inside, "Tab stops inside the drawing").toEqual([]);
});

/** The ship's count line, its legend's two states and its Log link, as the route shows them. */
function shipWords(page: Page) {
  return page.evaluate(() => {
    const squashed = (el: Element | null) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    // On /read the ship is what follows h2#ship; on / it is the whole page.
    const h2 = document.getElementById("ship");
    const after = (el: Element) =>
      !h2 ||
      Boolean(
        h2.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    const outside = [...document.querySelectorAll("main *")].filter(
      (el) => !el.closest("svg") && !el.closest("[data-plan]") && after(el),
    );
    const count = outside
      .filter((el) =>
        /\b\d+ planks: \d+ replaced, \d+ original\b/.test(squashed(el)),
      )
      .at(-1);
    const legend = outside
      .filter(
        (el) =>
          /\bseated\b/i.test(el.textContent ?? "") &&
          /\boriginal\b/i.test(el.textContent ?? "") &&
          el.querySelectorAll("li").length > 0,
      )
      .at(-1);
    return {
      count:
        squashed(count ?? null).match(
          /\d+ planks: \d+ replaced, \d+ original/,
        )?.[0] ?? null,
      legend: [...(legend?.querySelectorAll("li") ?? [])].map((li) =>
        squashed(li),
      ),
      log: outside
        .filter((el) => el.tagName === "A")
        .map((a) => a.getAttribute("href")),
      plan:
        document.querySelector("[data-plan]") !== null &&
        after(document.querySelector("[data-plan]") as Element),
    };
  });
}

test("B2.5 the ship on /read: one inert drawing from the same component, 22 planks seated as on /, inside the viewport, legible, at most 32,768 B, and /'s count line, legend and Log link", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(150_000);
  const response = await request.get("/read");
  expect(response.status(), "status of /read").toBe(200);
  const html = await response.text();
  const at = html.search(/data-plan(?:=|[\s>])/);
  expect(at, "[data-plan] is in the HTML response of /read").toBeGreaterThan(
    -1,
  );
  expect
    .soft(html.slice(at), "inline SVG after [data-plan] in the HTML")
    .toMatch(/<svg[\s>]/);
  expect.soft(html.slice(at), "planks in the HTML").toContain('data-plank="');

  // The same component as /: the same plank ids and the same plank -> sprint map.
  await open(page, 1440);
  const home = await readPlan(page);
  const homeWords = await shipWords(page);
  const map = (plan: Awaited<ReturnType<typeof readPlan>>) =>
    Object.fromEntries((plan?.planks ?? []).map((p) => [p.id, p.sprint]));
  expect(home, "the drawing on /").not.toBeNull();

  const expectedIds = [...PLANK_IDS].sort();
  for (const width of [320, 390, 1440]) {
    await open(page, width, 900, "/read");
    const where = `/read at ${width} px`;
    const plan = await readPlan(page);
    expect(plan, `${PLAN} on ${where}`).not.toBeNull();
    if (!plan) continue;
    expect.soft(plan.count, `${PLAN} elements on ${where}`).toBe(1);
    expect.soft(plan.ariaHidden, `aria-hidden on ${where}`).toBe("true");
    expect.soft(plan.svgs, `rendered svg on ${where}`).toBeGreaterThan(0);
    expect.soft(plan.focusable, `focusable elements on ${where}`).toBe(0);
    expect
      .soft(plan.planks.map((p) => p.id).sort(), `rendered planks on ${where}`)
      .toEqual(expectedIds);
    expect
      .soft(map(plan), `data-plank -> data-sprint on ${where}, vs /`)
      .toEqual(map(home));
    expect
      .soft(
        Object.fromEntries(
          plan.planks.map((p) => [
            p.id,
            p.sprint === null ? undefined : Number(p.sprint),
          ]),
        ),
        `each plank's data-sprint on ${where}, vs the retros`,
      )
      .toEqual(SEATED);
    const outside = plan.planks.filter(
      (p) =>
        p.box.left < -0.5 ||
        p.box.right > plan.cw + 0.5 ||
        !p.svg ||
        p.box.left < p.svg.left - 0.5 ||
        p.box.right > p.svg.right + 0.5 ||
        p.box.top < p.svg.top - 0.5 ||
        p.box.bottom > p.svg.bottom + 0.5,
    );
    expect
      .soft(
        outside.map((p) => p.id),
        `planks outside the viewport or cropped on ${where}`,
      )
      .toEqual([]);
    expect
      .soft(
        plan.texts
          .filter((t) => t.size < 11 - 0.01)
          .map((t) => `"${t.text}": ${t.size.toFixed(2)} px`),
        `lettering under 11 px on ${where}`,
      )
      .toEqual([]);
    // Nothing in the drawing is hit at any plank's centre.
    const hit = await page.evaluate((selector) => {
      const plan = document.querySelector(selector);
      return [...(plan?.querySelectorAll("[data-plank]") ?? [])]
        .filter((p) => p.getClientRects().length > 0)
        .flatMap((p) => {
          p.scrollIntoView({ block: "center" });
          const r = p.getBoundingClientRect();
          const el = document.elementFromPoint(
            r.left + r.width / 2,
            r.top + r.height / 2,
          );
          return el && plan?.contains(el) ? [p.getAttribute("data-plank")] : [];
        });
    }, PLAN);
    expect.soft(hit, `planks hit by elementFromPoint on ${where}`).toEqual([]);
  }

  // A number on a plank is at least 4.5:1 on its fill, in both schemes.
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, 1440, 900, "/read");
    const plan = await readPlan(page);
    const ground = rgbOf((await tokens(page)).background);
    for (const number of (plan?.texts ?? []).filter(
      (t) => t.on !== null && /^\d+$/.test(t.text),
    )) {
      const fill = plan?.planks.find((p) => p.id === number.on)?.fill ?? null;
      const under = over(fill, ground);
      const text = number.color
        ? [
            number.color[0] ?? 0,
            number.color[1] ?? 0,
            number.color[2] ?? 0,
            (number.color[3] ?? 1) * number.opacity,
          ]
        : null;
      expect
        .soft(
          fill && text ? contrast(over(text, under), under) : 0,
          `number ${number.text} on plank ${number.on} on /read (${scheme})`,
        )
        .toBeGreaterThanOrEqual(4.5);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });

  // Its weight, and no Tab stop inside it.
  await open(page, 1440, 900, "/read");
  const bytes = await page.evaluate(
    (selector) =>
      new TextEncoder().encode(
        document.querySelector(selector)?.outerHTML ?? "",
      ).length,
    PLAN,
  );
  expect.soft(bytes, `${PLAN} outerHTML on /read, in bytes`).toBeGreaterThan(0);
  expect
    .soft(bytes, `${PLAN} outerHTML on /read, in bytes`)
    .toBeLessThanOrEqual(32_768);
  const stops = (await page.locator("a[href], button").count()) + 1;
  const inside: string[] = [];
  for (let i = 0; i < stops; i++) {
    await page.keyboard.press("Tab");
    const where = await page.evaluate((plan) => {
      const el = document.activeElement;
      return el?.closest(plan) ? el.tagName.toLowerCase() : null;
    }, PLAN);
    if (where) inside.push(where);
  }
  expect.soft(inside, "Tab stops inside the drawing on /read").toEqual([]);

  // The count line, the legend and the Log link: /'s words.
  const words = await shipWords(page);
  expect.soft(words.plan, "the drawing follows h2#ship").toBe(true);
  expect(homeWords.count, "the count line on /").not.toBeNull();
  expect
    .soft(words.count, "the count line on /read, as / shows it")
    .toBe(homeWords.count);
  expect.soft(homeWords.legend, "the legend's states on /").toHaveLength(2);
  expect
    .soft(words.legend, "the legend on /read, as / shows it")
    .toEqual(homeWords.legend);
  expect.soft(words.log, "links in the ship on /read").toContain("/sprints");

  // The same drawing with scripts off.
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });
  const bare = await context.newPage();
  await bare.goto("/read");
  const off = await bare.evaluate((selector) => {
    const plan = document.querySelector(selector);
    return {
      ariaHidden: plan?.getAttribute("aria-hidden") ?? null,
      planks: Object.fromEntries(
        [...(plan?.querySelectorAll("[data-plank]") ?? [])]
          .filter((p) => p.getClientRects().length > 0)
          .map((p) => [
            p.getAttribute("data-plank"),
            p.getAttribute("data-sprint"),
          ]),
      ),
    };
  }, PLAN);
  await context.close();
  expect.soft(off.ariaHidden, "aria-hidden without scripts").toBe("true");
  expect.soft(off.planks, "planks without scripts, vs /").toEqual(map(home));
});
