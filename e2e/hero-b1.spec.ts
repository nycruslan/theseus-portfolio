import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";
import {
  composite,
  contrast,
  DERIVED_TOKENS,
  horizontalOverflow,
  lineSpan,
  parseColor,
  type Rgb,
  resolveColors,
  rootTokens,
  SCHEMES,
  VALID,
} from "./helpers";
import {
  ORDER,
  PLANKS_PER_LIFT,
  placeOf,
  plankOfSprint,
  readPlanks,
} from "./hull";
import { decodePng } from "./pixels";
import { refuseWebGl } from "./webgl";

// Sprint 16, B1 (the hero): the checks of .studio/sprint/15/contract.md, "B1 checks", that no older
// spec carries. One test per number, named by it. B1.6 to B1.9 live where the old checks they
// rewrote were (hero.spec.ts C1 to C5), B1.10 in hero-3d.spec.ts; the map, with what each hook is
// and every assertion retired, is .studio/sprint/16/specs-probe.md.
//
// The oracle is sprint 14's: `N` is the count of valid retro files (e2e/helpers.ts), never a
// literal, and sprint n's plank is ORDER[(n - 1) mod 22], the order copied from the direction.
// These checks read the SVG, so every context refuses WebGL, as hero.spec.ts does.

test.beforeEach(async ({ context }) => {
  await context.addInitScript(refuseWebGl);
});

const N = VALID.length;
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

async function open(page: Page, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
}

/** `__Libre_Franklin_1a2b3c` (what next/font names a face) or `"Libre Franklin"` to `Libre Franklin`. */
function familyName(raw: string) {
  const bare = raw.trim().replace(/^["']|["']$/g, "");
  return bare.startsWith("__")
    ? bare
        .slice(2)
        .replace(/_[0-9a-f]{6,}$/i, "")
        .replaceAll("_", " ")
    : bare;
}

/** The first family of a computed `font-family` list. */
const firstFamily = (list: string) => familyName(list.split(",")[0] ?? "");

// ---------------------------------------------------------------------------------------------

test("B1.1 Faces: Besley 800 on the name, Libre Franklin under the rest, two woff2 files, two preloads, no Geist", async ({
  page,
}) => {
  const fonts = new Map<string, number>();
  const everything: string[] = [];
  page.on("request", (request) => everything.push(request.url()));
  page.on("response", (response) => {
    if (!/\.woff2(\?|$)/.test(response.url())) return;
    void response.body().then(
      (body) => fonts.set(response.url(), body.length),
      () => undefined,
    );
  });
  await open(page, 1440);
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 500)));

  // The files: exactly two, small, preloaded, and no Geist anywhere.
  expect
    .soft([...fonts.keys()], "woff2 files the page fetched")
    .toHaveLength(2);
  const total = [...fonts.values()].reduce((sum, bytes) => sum + bytes, 0);
  expect
    .soft(total, "bytes of the two woff2 files")
    .toBeLessThanOrEqual(71_680);
  expect
    .soft(
      everything.filter((url) => /geist/i.test(url)),
      "requests naming Geist",
    )
    .toEqual([]);
  const preloads = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel="preload"]')].map((link) => ({
      href: new URL((link as HTMLLinkElement).href, location.href).href,
      as: link.getAttribute("as"),
    })),
  );
  expect
    .soft(
      preloads
        .filter((link) => link.as === "font")
        .map((link) => link.href)
        .sort(),
      "rel=preload font links, against the files fetched",
    )
    .toEqual([...fonts.keys()].sort());

  // The faces: by computed style, and by what document.fonts holds.
  const found = await page.evaluate(() => {
    const h1 = document.querySelector("main > header h1");
    const style = h1 ? getComputedStyle(h1) : null;
    const texts = [...document.body.querySelectorAll("*")].filter(
      (el) =>
        el.getClientRects().length > 0 &&
        [...el.childNodes].some(
          (node) =>
            node.nodeType === Node.TEXT_NODE &&
            (node.textContent ?? "").trim() !== "",
        ),
    );
    return {
      h1: style && { family: style.fontFamily, weight: style.fontWeight },
      body: getComputedStyle(document.body).fontFamily,
      // The name and the band's cells may be set in the display face; nothing else.
      others: texts
        .filter((el) => !el.closest("h1, [data-hero-cell]"))
        .map((el) => ({
          what: `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 24)}"`,
          family: getComputedStyle(el).fontFamily,
        })),
      loaded: [...document.fonts].map((face) => face.family),
    };
  });
  expect(found.h1, "the name's computed face").not.toBeNull();
  expect
    .soft(firstFamily(found.h1?.family ?? ""), "the name's family")
    .toBe("Besley");
  expect.soft(found.h1?.weight, "the name's weight").toBe("800");
  expect.soft(firstFamily(found.body), "body's family").toBe("Libre Franklin");
  expect
    .soft(
      found.others
        .filter((text) => firstFamily(text.family) !== "Libre Franklin")
        .map((text) => `${text.what}: ${text.family}`),
      "text on / that does not start with Libre Franklin",
    )
    .toEqual([]);
  // A face named in @font-face, less the fallbacks next/font adds with the same metrics.
  const faces = new Set(
    found.loaded.map((family) => familyName(family).replace(/ Fallback$/, "")),
  );
  expect
    .soft([...faces].sort(), "families in document.fonts")
    .toEqual(["Besley", "Libre Franklin"]);

  // /sprints keeps one family, and brings no third file.
  const sprintsFonts = new Set<string>();
  const other = await page.context().newPage();
  other.on("response", (response) => {
    if (/\.woff2(\?|$)/.test(response.url())) sprintsFonts.add(response.url());
  });
  await other.goto("/sprints");
  await other.evaluate(() => document.fonts.ready);
  const families = await other.evaluate(() => [
    ...new Set(
      [...document.body.querySelectorAll("*")]
        .filter(
          (el) =>
            el.getClientRects().length > 0 &&
            [...el.childNodes].some(
              (node) =>
                node.nodeType === Node.TEXT_NODE &&
                (node.textContent ?? "").trim() !== "",
            ),
        )
        .map((el) => getComputedStyle(el).fontFamily),
    ),
  ]);
  expect
    .soft(
      [...new Set(families.map(firstFamily))],
      "families of the text on /sprints",
    )
    .toEqual(["Libre Franklin"]);
  expect
    .soft(
      [...sprintsFonts].filter((url) => !fonts.has(url)),
      "woff2 files on /sprints that / did not fetch",
    )
    .toEqual([]);
  await other.close();
});

// ---------------------------------------------------------------------------------------------

/** Lines of text an element sets: the vertical centres of its inline boxes, a line apart or more. */
async function lineCount(page: Page, selector: string) {
  return page.evaluate((query) => {
    const el = document.querySelector(query);
    if (!el) return 0;
    const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight);
    const range = document.createRange();
    range.selectNodeContents(el);
    const centres = [...range.getClientRects()]
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => (r.top + r.bottom) / 2)
      .sort((a, b) => a - b);
    return centres.filter(
      (c, i) => i === 0 || c - (centres[i - 1] ?? 0) > lineHeight * 0.6,
    ).length;
  }, selector);
}

test("B1.2 The name: profile.name at 136 px at 1440 and 64 px at 390, from --step-display, on one line and then two", async ({
  page,
}) => {
  for (const [width, size, lines] of [
    [1440, 136, 1],
    [390, 64, 2],
  ] as const) {
    await open(page, width);
    const where = `at ${width}`;
    const found = await page.evaluate(() => {
      const h1 = document.querySelector("main > header h1");
      const probe = document.createElement("div");
      probe.style.fontSize = "var(--step-display)";
      document.body.append(probe);
      const token = Number.parseFloat(getComputedStyle(probe).fontSize);
      probe.remove();
      return {
        text: h1?.textContent ?? null,
        size: h1
          ? Number.parseFloat(getComputedStyle(h1).fontSize)
          : Number.NaN,
        token,
        count: document.querySelectorAll("h1").length,
      };
    });
    expect(found.count, `h1 elements ${where}`).toBe(1);
    expect(found.text, `the name ${where}`).toBe(profile.name);
    expect(
      Math.abs(found.size - size),
      `the name's size ${found.size} against ${size} ${where}`,
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(found.size - found.token),
      `the name's size against var(--step-display) (${found.token}) ${where}`,
    ).toBeLessThanOrEqual(0.05);
    expect(
      await lineCount(page, "main > header h1"),
      `lines of the name ${where}`,
    ).toBe(lines);
  }
  const tokens = await rootTokens(page, ["--step-display"]);
  expect(tokens["--step-display"], "--step-display on :root").not.toBe("");
});

// ---------------------------------------------------------------------------------------------

/** The thick-and-thin rule at a band's top edge, read from pixels: runs of ink and ground. */
async function rulePattern(page: Page, band: { left: number; top: number }) {
  const ink = (await resolveColors(page))["--foreground"]?.rgba ?? [0, 0, 0, 1];
  const ground = (await resolveColors(page))["--background"]?.rgba ?? [
    255, 255, 255, 1,
  ];
  const lum = (c: number[]) =>
    0.2126 * (c[0] ?? 0) + 0.7152 * (c[1] ?? 0) + 0.0722 * (c[2] ?? 0);
  const start = Math.floor(band.top) - 2;
  // A column 3 px inside the band's left edge: past any corner, above any text.
  const png = decodePng(
    await page.screenshot({
      clip: { x: Math.round(band.left) + 3, y: start, width: 1, height: 12 },
    }),
  );
  const marks: string[] = [];
  for (let y = 0; y < png.height; y++) {
    const value = lum([
      png.data[y * 4] ?? 0,
      png.data[y * 4 + 1] ?? 0,
      png.data[y * 4 + 2] ?? 0,
    ]);
    marks.push(
      Math.abs(value - lum(ink)) < Math.abs(value - lum(ground)) ? "I" : ".",
    );
  }
  // Runs from the first row of ink: "III..I" is a 3 px rule, a 2 px gap, a 1 px rule.
  return marks.join("").replace(/^\.+/, "").replace(/\.+$/, "");
}

test("B1.3 The band: a thick-and-thin rule over three cells in order, the home line in the third, full width", async ({
  page,
}) => {
  const SPAN = lineSpan(N);
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of [390, 768, 1024, 1440]) {
      await open(page, width);
      const where = `at ${width} (${scheme})`;
      const found = await page.evaluate(() => {
        const header = document.querySelector("main > header");
        const h1 = header?.querySelector("h1") ?? null;
        const bands = [...(header?.querySelectorAll("[data-hero-band]") ?? [])];
        const band = bands[0] ?? null;
        const rect = (el: Element | null | undefined) => {
          const r = el?.getBoundingClientRect();
          return r
            ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
            : null;
        };
        const cells = [...(band?.querySelectorAll("[data-hero-cell]") ?? [])];
        return {
          bands: bands.length,
          afterName:
            h1 !== null &&
            band !== null &&
            Boolean(
              h1.compareDocumentPosition(band) &
                Node.DOCUMENT_POSITION_FOLLOWING,
            ),
          band: rect(band),
          cells: cells.map((cell) => ({
            text: cell.textContent ?? "",
            overflow: cell.scrollWidth - cell.clientWidth,
            ...rect(cell),
          })),
          cw: document.documentElement.clientWidth,
          vw: innerWidth,
        };
      });
      expect(found.bands, `[data-hero-band] in the header ${where}`).toBe(1);
      expect(found.afterName, `the band follows the name ${where}`).toBe(true);
      expect(
        found.cells.map((cell) => cell.text),
        `the band's cells ${where}`,
      ).toEqual([profile.headline, profile.location, `Build log${SPAN}`]);

      // Reading order: each cell is beside the one before it, or under it.
      found.cells.slice(1).forEach((cell, i) => {
        const before = found.cells[i];
        if (!(before && "top" in cell && "top" in before)) return;
        const under = (cell.top ?? 0) > (before.top ?? 0) + 1;
        const beside =
          Math.abs((cell.top ?? 0) - (before.top ?? 0)) <= 1 &&
          (cell.left ?? 0) > (before.left ?? 0);
        expect
          .soft(
            under || beside,
            `cell ${i + 1} follows cell ${i} in reading order ${where}`,
          )
          .toBe(true);
      });

      // Full width: the content box of the page, margin to margin.
      expect(found.band, `the band's box ${where}`).not.toBeNull();
      if (!found.band) continue;
      // Below 1024 the headline has the whole row (at 768 it once sat in one of six subgrid
      // columns and broke a word a line), and no cell spills out of its box.
      const headline = found.cells[0];
      if (width < 1024 && headline && "left" in headline) {
        expect
          .soft(
            Math.abs((headline.left ?? 0) - found.band.left),
            `headline cell left against the band's ${where}`,
          )
          .toBeLessThanOrEqual(1);
        expect
          .soft(
            Math.abs((headline.right ?? 0) - found.band.right),
            `headline cell right against the band's ${where}`,
          )
          .toBeLessThanOrEqual(1);
      }
      expect
        .soft(
          found.cells.map((cell) => cell.overflow),
          `overflow (scrollWidth - clientWidth) of each cell ${where}`,
        )
        .toEqual([0, 0, 0]);
      const margin = Math.min(48, Math.max(20, 0.034 * found.vw));
      expect
        .soft(Math.abs(found.band.left - margin), `band left ${where}`)
        .toBeLessThanOrEqual(1);
      expect
        .soft(
          Math.abs(found.band.right - (found.cw - margin)),
          `band right ${where}`,
        )
        .toBeLessThanOrEqual(1);

      // The rule: 3 px of ink, 2 px of ground, 1 px of ink, whatever draws it.
      expect(
        await rulePattern(page, found.band),
        `rows from the band's top edge: ink, ground ${where}`,
      ).toBe("III..I");
    }
  }
  const tokens = await rootTokens(page, [...DERIVED_TOKENS]);
  expect(tokens["--rule-strong"], "--rule-strong on :root").not.toBe("");
});

// ---------------------------------------------------------------------------------------------
// B1.4. The planks

type Expected = { sprint: number | null; mix: number | null; copper: boolean };

/**
 * The tones the contract gives each of the 22 planks, in DOM order, for the sprints in the log:
 * sprint n goes to ORDER[(n - 1) mod 22], the newest sprint to a plank wins it, the highest sprint
 * is copper, and an older one is bronze at M = round(75 - 45 x age), age = (L - n) / (L - 1).
 */
function expectedPlanks(sprints: readonly number[]): Expected[] {
  const out: Expected[] = Array.from({ length: ORDER.length }, () => ({
    sprint: null,
    mix: null,
    copper: false,
  }));
  const latest = Math.max(0, ...sprints);
  for (const n of [...sprints].sort((a, b) => a - b)) {
    out[plankOfSprint(n)] = { sprint: n, mix: null, copper: false };
  }
  for (const plank of out) {
    if (plank.sprint === null) continue;
    if (plank.sprint === latest) plank.copper = true;
    else
      plank.mix = Math.round(
        75 - (45 * (latest - plank.sprint)) / (latest - 1),
      );
  }
  return out;
}

const contiguous = (sprints: readonly number[]) =>
  [...sprints].sort((a, b) => a - b).every((n, i) => n === i + 1);

/** Browser-resolved sRGB for CSS colour strings, color-mix() included. */
async function paint(page: Page, colors: readonly string[]) {
  return page.evaluate((list) => {
    const ctx = document
      .createElement("canvas")
      .getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("no 2d canvas");
    return list.map((css) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000000";
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3) as Rgb;
    });
  }, colors);
}

const rgbCss = (c: readonly number[]) => `rgb(${c[0]} ${c[1]} ${c[2]})`;
const apart = (a: readonly number[], b: readonly number[]) =>
  Math.max(...a.map((v, i) => Math.abs(v - (b[i] ?? 0))));

test("B1.4 The planks: 22, N of them numbered, the newest copper where ORDER says, every tone by the formula", async ({
  page,
}) => {
  expect(
    N,
    "valid retros (the oracle's premise: at least sprints 1 to 11)",
  ).toBeGreaterThanOrEqual(11);
  expect(
    contiguous(VALID),
    "the valid sprints are 1 to N, so the age formula's N is the highest sprint",
  ).toBe(true);
  const want = expectedPlanks(VALID);

  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, 1440);
    const where = `(${scheme})`;
    const planks = await readPlanks(page, { step: 4 });

    // Structure: 22 shapes, min(N, 22) numbered, the numbers distinct, one copper.
    expect(planks, `[data-hero-plank] count ${where}`).toHaveLength(22);
    const numbered = planks.filter((plank) => plank.sprint !== null);
    expect(numbered.length, `planks with data-sprint ${where}`).toBe(
      Math.min(N, 22),
    );
    expect(
      new Set(numbered.map((plank) => plank.sprint)).size,
      `distinct data-sprint values ${where}`,
    ).toBe(numbered.length);
    expect(
      planks.filter((plank) => plank.copper).length,
      `[data-hero-copper] planks ${where}`,
    ).toBe(1);

    // Which plank holds which sprint, and where the copper one sits.
    for (const plank of planks) {
      const expected = want[plank.index];
      expect
        .soft(
          plank.sprint,
          `data-sprint of plank ${placeOf(plank.index)} ${where}`,
        )
        .toBe(expected?.sprint === null ? null : String(expected?.sprint));
    }
    const copper = planks.find((plank) => plank.copper);
    expect
      .soft(
        copper?.index,
        `copper plank is ${ORDER[(Math.max(...VALID) - 1) % 22]} (index ${plankOfSprint(Math.max(...VALID))}) ${where}`,
      )
      .toBe(plankOfSprint(Math.max(...VALID)));
    expect
      .soft(copper?.sprint, `the copper plank's sprint ${where}`)
      .toBe(String(Math.max(...VALID)));

    // "lift.plank" has to mean one thing: DOM order is deck first, and stern to bow in each lift.
    let at = 0;
    const lifts = PLANKS_PER_LIFT.map((count) => {
      const lift = planks.slice(at, at + count);
      at += count;
      return lift;
    });
    for (const [k, lift] of lifts.entries()) {
      const xs = lift.map((plank) => plank.centroid.x);
      expect
        .soft(
          xs.every((x, i) => i === 0 || x > (xs[i - 1] ?? 0)),
          `lift ${k}'s planks run stern to bow in DOM order: centroid x ${xs.map((x) => x.toFixed(0)).join(", ")} ${where}`,
        )
        .toBe(true);
    }
    const heights = lifts.map(
      (lift) =>
        lift.reduce((sum, plank) => sum + plank.centroid.y, 0) / lift.length,
    );
    expect
      .soft(
        heights.every((y, i) => i === 0 || y > (heights[i - 1] ?? 0)),
        `the lifts run from the deck down in DOM order: mean centroid y ${heights.map((y) => y.toFixed(0)).join(", ")} ${where}`,
      )
      .toBe(true);

    // The tones. Expected colours are mixed by the browser from the page's own tokens.
    const tokens = await resolveColors(page, [
      "--background",
      "--muted",
      "--bronze",
    ]);
    const [ground, muted, bronze] = ["--background", "--muted", "--bronze"].map(
      (name) => tokens[name]?.rgba.slice(0, 3) as Rgb | undefined,
    );
    expect(
      ground && muted && bronze,
      `--background, --muted and --bronze resolve ${where}`,
    ).toBeTruthy();
    if (!(ground && muted && bronze)) continue;
    const originalShare = scheme === "light" ? 46 : 30;
    const original = `color-mix(in oklab, ${rgbCss(muted)} ${originalShare}%, ${rgbCss(ground)})`;
    const mixes = want.flatMap((plank) =>
      plank.mix === null
        ? []
        : [`color-mix(in oklab, ${rgbCss(bronze)} ${plank.mix}%, ${original})`],
    );
    const [originalTone, ...replacedTones] = await paint(page, [
      original,
      ...mixes,
    ]);
    let nextReplaced = 0;
    const measured: { index: number; copper: boolean; ratio: number }[] = [];
    for (const plank of planks) {
      const expected = want[plank.index];
      expect(
        plank.tone,
        `plank ${plank.index} has a plain fill ${where}`,
      ).not.toBeNull();
      if (!(plank.tone && expected)) continue;
      const painted = composite(plank.tone, ground).map(Math.round) as Rgb;
      measured.push({
        index: plank.index,
        copper: plank.copper,
        ratio: contrast(painted, ground),
      });
      if (expected.copper) continue;
      const tone =
        expected.mix === null ? originalTone : replacedTones[nextReplaced++];
      expect
        .soft(
          apart(painted, tone ?? [0, 0, 0]),
          `plank ${plank.index} (${expected.mix === null ? `original, muted ${originalShare}%` : `sprint ${expected.sprint}, bronze ${expected.mix}%`}) paints rgb(${painted.join(",")}), want rgb(${tone?.join(",")}) ${where}`,
        )
        .toBeLessThanOrEqual(3);
    }

    // The newest plank is loud: at least 1.5 x the contrast of any other, against the ground.
    const loud = measured.find((plank) => plank.copper);
    const rest = measured.filter((plank) => !plank.copper);
    const loudest = rest.reduce((a, b) => (b.ratio > a.ratio ? b : a));
    expect(
      (loud?.ratio ?? 0) / loudest.ratio,
      `copper contrast ${loud?.ratio.toFixed(2)} over plank ${loudest.index}'s ${loudest.ratio.toFixed(2)} ${where}`,
    ).toBeGreaterThanOrEqual(1.5);

    // --bronze is a token (a hex in each scheme), as the contract names it.
    const derived = await rootTokens(page, [...DERIVED_TOKENS]);
    expect(derived["--bronze"], `--bronze on :root ${where}`).not.toBe("");
    expect(
      parseColor(`rgb(${bronze.join(", ")})`),
      `--bronze is a colour ${where}`,
    ).not.toBeNull();
  }
});

// The reader the page is built from (`lib/hull-planks.ts`, the interface in specs-probe.md), fed
// fixtures no repo has: no sprint, one, two, today's, a full set, a cycle and then some. It is
// loaded when the test runs, from a path in a variable, so this file still loads and typechecks
// while the module is missing and only these tests fail, naming it.
const PLANKS_MODULE = "../lib/hull-planks";

type PlankTone = { sprint: number | null; mix: number | null; copper: boolean };
type Planks = {
  ORDER: readonly string[];
  PLANKS_PER_LIFT: readonly number[];
  plankTones: (sprints: readonly number[]) => readonly PlankTone[];
};

async function loadPlanks(): Promise<Planks> {
  const loaded = (await import(PLANKS_MODULE)) as Partial<Planks>;
  if (
    !(
      loaded.ORDER &&
      loaded.PLANKS_PER_LIFT &&
      typeof loaded.plankTones === "function"
    )
  ) {
    throw new Error(
      "lib/hull-planks.ts must export ORDER, PLANKS_PER_LIFT and plankTones",
    );
  }
  return loaded as Planks;
}

test("B1.4 fixtures: ORDER, and the tone of every plank for no sprint, one, two, 14, 22, 24 and 36", async () => {
  const planks = await loadPlanks();
  expect([...planks.ORDER], "ORDER, as the direction gives it").toEqual([
    ...ORDER,
  ]);
  expect([...planks.PLANKS_PER_LIFT], "planks per lift").toEqual([
    ...PLANKS_PER_LIFT,
  ]);
  // None of these N make 45 x age fall on a half, where `round` could go either way.
  for (const n of [0, 1, 2, 14, 22, 24, 36]) {
    const sprints = Array.from({ length: n }, (_, i) => i + 1);
    const got = planks.plankTones(sprints);
    const want = expectedPlanks(sprints);
    expect(got, `plankTones for N = ${n}`).toHaveLength(22);
    expect(
      got.map((plank) => ({
        sprint: plank.sprint,
        mix: plank.mix,
        copper: plank.copper,
      })),
      `plankTones for N = ${n}`,
    ).toEqual(want);

    const bronze = got.filter((plank) => plank.mix !== null);
    expect(
      got.filter((plank) => plank.copper).length,
      `copper planks for N = ${n}`,
    ).toBe(n === 0 ? 0 : 1);
    expect(
      Math.max(0, ...bronze.map((plank) => plank.mix ?? 0)),
      `highest bronze share for N = ${n}`,
    ).toBeLessThanOrEqual(75);
    // Older means a smaller share, strictly while 45 x age steps by more than 1 per sprint.
    const byAge = [...bronze].sort((a, b) => (b.sprint ?? 0) - (a.sprint ?? 0));
    byAge.slice(1).forEach((plank, i) => {
      expect(
        plank.mix ?? Number.NaN,
        `bronze share of sprint ${plank.sprint} against sprint ${byAge[i]?.sprint}, N = ${n}`,
      ).toBeLessThan(byAge[i]?.mix ?? Number.NaN);
    });
  }
  // N = 14 is today's published case: 72 just behind the newest, 30 at sprint 1.
  const fourteen = planks.plankTones(
    Array.from({ length: 14 }, (_, i) => i + 1),
  );
  expect(
    fourteen.find((plank) => plank.sprint === 13)?.mix,
    "sprint 13 at N = 14",
  ).toBe(72);
  expect(
    fourteen.find((plank) => plank.sprint === 1)?.mix,
    "sprint 1 at N = 14",
  ).toBe(30);
  // Past a cycle each plank shows the newest sprint that replaced it, not the oldest.
  const past = planks.plankTones(Array.from({ length: 36 }, (_, i) => i + 1));
  expect(
    past.map((plank) => plank.sprint).sort((a, b) => (a ?? 0) - (b ?? 0)),
    "sprints shown at N = 36",
  ).toEqual(Array.from({ length: 22 }, (_, i) => 15 + i));
});

// ---------------------------------------------------------------------------------------------

test("B1.5 The newest plank can be seen: at least 75% of every plank, so of whichever is newest, is on the first screen", async ({
  page,
}) => {
  // Each of the 22 planks is the newest once in 22 sprints (N = 22 puts the worst one, 1.0, there),
  // so reading all of them keeps a later merge from breaking this spec when the copper moves.
  for (const [width, height] of [
    [390, 844],
    [1440, 900],
    [1024, 768],
  ] as const) {
    await open(page, width, height);
    const planks = await readPlanks(page);
    const where = `at ${width} x ${height}`;
    expect(planks, `[data-hero-plank] count ${where}`).toHaveLength(22);
    const copper = planks.find((plank) => plank.copper);
    expect
      .soft(
        copper?.visible ?? 0,
        `the copper plank (${ORDER[(Math.max(...VALID) - 1) % 22]}): share on screen ${where}`,
      )
      .toBeGreaterThanOrEqual(0.75);
    const hidden = planks
      .filter((plank) => !(plank.visible >= 0.75))
      .map((plank) => `${placeOf(plank.index)}: ${plank.visible.toFixed(2)}`);
    expect
      .soft(hidden, `planks (lift.plank) with under 75% on screen ${where}`)
      .toEqual([]);
  }
});

// ---------------------------------------------------------------------------------------------

test("B1.11 Hard gates: axe finds nothing at 320, 390 and 1440 in both schemes, no console error, no overflow at 320", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of [320, 390, 1440]) {
      await open(page, width);
      await expect(
        page.locator("[data-hero]"),
        "the hero is on the page",
      ).toHaveCount(1);
      const results = await new AxeBuilder({ page })
        .withTags(AXE_TAGS)
        .analyze();
      expect
        .soft(
          results.violations.map((v) => ({
            rule: v.id,
            impact: v.impact,
            targets: v.nodes.map((node) => node.target.join(" ")),
          })),
          `axe violations (${scheme}, ${width} px)`,
        )
        .toEqual([]);
      if (width === 320) {
        expect(
          await horizontalOverflow(page),
          `scrollWidth - clientWidth at 320 (${scheme})`,
        ).toBe(0);
      }
    }
  }
  expect(problems, "errors on load").toEqual([]);
});
