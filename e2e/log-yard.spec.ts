import AxeBuilder from "@axe-core/playwright";
import {
  type APIRequestContext,
  type Browser,
  expect,
  type Page,
  test,
} from "@playwright/test";
import { atRest, scanSeats } from "./ghost";
import {
  horizontalOverflow,
  installRgba,
  measureLcp,
  resolvedBackground,
  SCHEMES,
  textStyles,
} from "./helpers";
import {
  LOG,
  open,
  RECORD,
  type Rgba,
  recordOf,
  sameColor,
  tokenRgba,
  withoutScripts,
  YARD_WORDS,
} from "./log";
import { pause } from "./model";
import {
  COUNT_AT,
  GHOST,
  GHOST_AT,
  NEWEST_STEP,
  neighbours,
  PLANK_IDS,
  QUESTION_STEP,
  SEAT_OF,
  STEPS,
  stepIndex,
  THESEUS_AT,
} from "./retros";
import { type ModelOptions, openModel, refuseWebGl } from "./webgl";

// Sprint 53, Ya: every step of the Log is a page (.crew/sprint/52/first-contract.md, Y1 to Y8;
// amended in .crew/sprint/53/contract.md, every count from the record). /log/n draws the Theseus
// (`[data-theseus]`) and the ghost (`[data-ghost]`) as they stood after sprint n; the record's
// previous and next are step links in its head (`a[data-step="previous|next"]`), /log has Start
// again (`a[data-step="start"]`), and the step where k = 22 asks the question
// (`p[data-yard-question]`). Every expected value comes from the oracle in e2e/retros.ts
// (THESEUS_AT, GHOST_AT, COUNT_AT), implemented from the contract's rule, and every word from
// YARD_WORDS in e2e/log.ts. Reads of every step take the server's HTML through `request` and parse
// it with scripts off, so the 51 steps cost seconds, not page loads; the checks that need paint load
// the contract's sample pages.

const THESEUS = "[data-theseus]";
const GHOST_HULL = "[data-ghost]";
const QUESTION = "p[data-yard-question]";
/** /log, then every merged step. */
const EVERY_PAGE = [LOG, ...STEPS.map(recordOf)];
/** The pages Y6 and Y8 name. */
const SAMPLED = [LOG, recordOf(13), recordOf(QUESTION_STEP ?? 23)] as const;
/** Y7's pages: the B2.9 invariants ROUTES doesn't already run. */
const Y7_PAGES = [
  ...new Set([
    recordOf(1),
    recordOf(QUESTION_STEP ?? 23),
    recordOf(NEWEST_STEP),
  ]),
];
const SIZES = [
  [1440, 900],
  [390, 844],
] as const;
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

/** The step a page shows: /log is the newest. */
const stepOf = (url: string) =>
  url === LOG ? NEWEST_STEP : Number(url.slice(`${LOG}/`.length));

const sortedEntries = (map: Record<string, number>) =>
  Object.entries(map).sort(([a], [b]) => a.localeCompare(b));

test.beforeEach(async ({ context }) => {
  await context.addInitScript(installRgba);
  await context.addInitScript(refuseWebGl);
});

// ---------------------------------------------------------------------------------------------
// Readers

/** Everything the yard's checks read, from the DOM alone (page.evaluate: it works with scripts off). */
function readYard(page: Page) {
  return page.evaluate(
    ({ theseusSel, ghostSel, record, question, caption }) => {
      const squash = (el: Element | null) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim();
      const before = (a: Element | null, b: Element | null) =>
        Boolean(
          a &&
            b &&
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
      const shown = (el: Element) =>
        el.getClientRects().length > 0 &&
        el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
      const planks = (root: Element | null) =>
        [...(root?.querySelectorAll("path[data-plank]") ?? [])].map((p) => ({
          id: p.getAttribute("data-plank") ?? "",
          sprint: p.getAttribute("data-sprint"),
          original: p.classList.contains("plank-original"),
          current: p.hasAttribute("data-current"),
          shown: shown(p),
        }));
      const focusable = (root: Element | null) =>
        root?.querySelectorAll(
          'a[href], button, input, select, textarea, [tabindex], [contenteditable=""], [contenteditable="true"]',
        ).length ?? 0;
      const theseusAll = document.querySelectorAll(theseusSel);
      const theseus = theseusAll[0] ?? null;
      const ghostAll = document.querySelectorAll(ghostSel);
      const ghost = ghostAll[0] ?? null;
      const recordEl = document.querySelector(record);
      const h2 = recordEl?.querySelector("h2") ?? null;
      const count = document.querySelector("p[data-ghost-count]");
      // The link's name as assistive tech reads it here: its aria-label, else its words without
      // the parts hidden from it (Iris's arrows). The shown pages confirm it with Playwright's own.
      const nameOf = (a: Element) => {
        const label = a.getAttribute("aria-label");
        if (label) return label.replace(/\s+/g, " ").trim();
        const copy = a.cloneNode(true) as Element;
        for (const hidden of copy.querySelectorAll('[aria-hidden="true"]'))
          hidden.remove();
        return squash(copy);
      };
      const links = (kind: string) =>
        [...document.querySelectorAll(`a[data-step="${kind}"]`)].map((a) => ({
          href: a.getAttribute("href"),
          name: nameOf(a),
          inRecord: Boolean(recordEl?.contains(a)),
          inHead: Boolean(recordEl?.contains(a)) && before(a, h2),
        }));
      // The caption: the innermost element outside the drawings whose words open with Iris's.
      const skip =
        "script, style, template, [data-theseus], [data-ghost], [data-plan]";
      const opens = (el: Element) => squash(el).startsWith(caption);
      const captions = [...document.querySelectorAll("main *")]
        .filter(
          (el) =>
            !el.closest(skip) &&
            opens(el) &&
            ![...el.children].some((child) => opens(child)),
        )
        .map(squash);
      return {
        theseus: {
          count: theseusAll.length,
          ariaHidden: theseus?.getAttribute("aria-hidden") ?? null,
          crossed: Boolean(
            theseus?.closest("[data-plan], [data-ghost]") ||
              theseus?.querySelector("[data-plan], [data-ghost]"),
          ),
          focusable: focusable(theseus),
          planks: planks(theseus),
          bytes: theseus
            ? new TextEncoder().encode(theseus.outerHTML).length
            : 0,
        },
        ghost: {
          count: ghostAll.length,
          ariaHidden: ghost?.getAttribute("aria-hidden") ?? null,
          focusable: focusable(ghost),
          planks: planks(ghost),
          modelNext:
            ghost?.nextElementSibling?.matches("[data-model]") ?? false,
        },
        count: squash(count),
        questions: [...document.querySelectorAll(question)].map((q) => ({
          text: squash(q),
          afterCount: before(count, q),
          beforeRecord: recordEl ? before(q, recordEl) : true,
        })),
        captions,
        previous: links("previous"),
        next: links("next"),
        start: links("start"),
      };
    },
    {
      theseusSel: THESEUS,
      ghostSel: GHOST_HULL,
      record: RECORD,
      question: QUESTION,
      caption: YARD_WORDS.caption,
    },
  );
}

type Yard = Awaited<ReturnType<typeof readYard>>;

/**
 * The server's HTML for each page, parsed with scripts off: one request each, no page load. The
 * document has no stylesheet, so it answers structure and words, never paint.
 */
async function serverYards(
  browser: Browser,
  request: APIRequestContext,
  urls: readonly string[] = EVERY_PAGE,
) {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.route("**/*", (route) => route.abort());
  const reads = new Map<string, Yard>();
  for (const url of urls) {
    const response = await request.get(url);
    expect.soft(response.status(), `status of ${url}`).toBe(200);
    await page.setContent(await response.text(), { waitUntil: "commit" });
    reads.set(url, await readYard(page));
  }
  await context.close();
  return reads;
}

/** A drawing's planks as the oracle's map: seat to number, the numbered ones only. */
const numbered = (planks: Yard["theseus"]["planks"]) =>
  Object.fromEntries(
    planks.flatMap((p) =>
      p.sprint === null ? [] : [[p.id, Number(p.sprint)]],
    ),
  );

// ---------------------------------------------------------------------------------------------

test("Y1 Each step's drawings: on /log and every merged /log/n, in the server HTML with scripts off, one aria-hidden [data-theseus] with 22 path[data-plank], the seated ones' data-sprint THESEUS_AT(n) and the rest .plank-original, never [data-plan] or [data-ghost]; [data-ghost]'s planks GHOST_AT(n), [data-model] right after it; /log's the newest step's and GHOST; shown with scripts off at 1440, /log/1 has 1 ghost plank and 21 originals, /log/13 13 and 9, /log/23 22 and 0, and /log/24 a seat whose Theseus number isn't its ghost number", async ({
  browser,
  request,
}) => {
  test.setTimeout(180_000);
  expect(STEPS.length, "merged steps in the record").toBeGreaterThan(22);
  const reads = await serverYards(browser, request);
  for (const [url, yard] of reads) {
    const n = stepOf(url);
    const where = `${url} (step ${n}), server HTML`;
    const theseus = THESEUS_AT(n);
    expect.soft(yard.theseus.count, `${THESEUS} on ${where}`).toBe(1);
    expect
      .soft(yard.theseus.ariaHidden, `${THESEUS}'s aria-hidden on ${where}`)
      .toBe("true");
    expect
      .soft(
        yard.theseus.crossed,
        `${THESEUS} is, holds or sits in [data-plan] or [data-ghost] on ${where}`,
      )
      .toBe(false);
    expect
      .soft(
        yard.theseus.planks.map((p) => p.id).sort(),
        `the Theseus's planks, once each, on ${where}`,
      )
      .toEqual([...PLANK_IDS].sort());
    expect
      .soft(
        sortedEntries(numbered(yard.theseus.planks)),
        `the Theseus's numbered planks (THESEUS_AT(${n})) on ${where}`,
      )
      .toEqual(sortedEntries(theseus));
    expect
      .soft(
        yard.theseus.planks
          .filter((p) => (p.id in theseus ? p.original : !p.original))
          .map(
            (p) =>
              `${p.id}: ${p.original ? "" : "not "}.plank-original, data-sprint ${p.sprint}`,
          ),
        `Theseus planks whose .plank-original disagrees with the rule on ${where}`,
      )
      .toEqual([]);
    expect.soft(yard.ghost.count, `${GHOST_HULL} on ${where}`).toBe(1);
    expect
      .soft(
        sortedEntries(numbered(yard.ghost.planks)),
        `the ghost's planks (GHOST_AT(${n})) on ${where}`,
      )
      .toEqual(sortedEntries(GHOST_AT(n)));
    expect
      .soft(
        yard.ghost.planks.length,
        `ghost planks, each numbered, on ${where}`,
      )
      .toBe(Object.keys(GHOST_AT(n)).length);
    expect
      .soft(
        yard.ghost.modelNext,
        `[data-model] right after the ghost on ${where}`,
      )
      .toBe(true);
  }
  expect
    .soft(sortedEntries(GHOST_AT(NEWEST_STEP)), "GHOST_AT(newest) is GHOST")
    .toEqual(sortedEntries(GHOST));

  // Shown, with scripts off at 1440: the contract's four, read as painted.
  const shownCounts: [number, number, number][] = [
    [1, 1, 21],
    [13, 13, 9],
    [23, 22, 0],
  ];
  for (const n of [1, 13, 23, 24]) {
    const url = recordOf(n);
    const bare = await withoutScripts(browser, url, 1440);
    expect(bare.status, `status of ${url} with scripts off`).toBe(200);
    const yard = await readYard(bare.page);
    await bare.context.close();
    const where = `${url}, scripts off at 1440`;
    const ghostShown = yard.ghost.planks.filter((p) => p.shown);
    const originalsShown = yard.theseus.planks.filter(
      (p) => p.shown && p.original,
    );
    expect
      .soft(
        yard.theseus.planks.filter((p) => !p.shown).map((p) => p.id),
        `Theseus planks not shown on ${where}`,
      )
      .toEqual([]);
    const expected = shownCounts.find(([m]) => m === n);
    if (expected) {
      expect
        .soft(ghostShown.length, `ghost planks shown on ${where}`)
        .toBe(expected[1]);
      expect
        .soft(originalsShown.length, `Theseus originals shown on ${where}`)
        .toBe(expected[2]);
    } else {
      const ghostOf = numbered(ghostShown);
      const differs = yard.theseus.planks.filter(
        (p) =>
          p.shown &&
          p.sprint !== null &&
          ghostOf[p.id] !== undefined &&
          ghostOf[p.id] !== Number(p.sprint),
      );
      expect
        .soft(
          differs.map((p) => p.id),
          `seats whose shown Theseus number differs from the ghost's on ${where}`,
        )
        .not.toEqual([]);
    }
  }
});

test("Y2 The plank that just went in: on every /log/n exactly one Theseus plank carries data-current, at n's seat, numbered n, and the ghost's one data-current is at that seat (B5.4); on /log neither ship has one, scripts on and off", async ({
  browser,
  request,
  page,
}) => {
  test.setTimeout(120_000);
  const current = (planks: Yard["theseus"]["planks"]) =>
    planks.filter((p) => p.current).map((p) => `${p.id} ${p.sprint}`);
  const check = (url: string, yard: Yard, how: string) => {
    const n = stepOf(url);
    const seat = SEAT_OF.get(n);
    const where = `${url} (${how})`;
    expect
      .soft(
        current(yard.theseus.planks),
        `the Theseus's [data-current] on ${where}`,
      )
      .toEqual(url === LOG ? [] : [`${seat} ${n}`]);
    expect
      .soft(
        yard.ghost.planks.filter((p) => p.current).map((p) => p.id),
        `the ghost's [data-current] on ${where}`,
      )
      .toEqual(url === LOG ? [] : [seat]);
  };
  for (const [url, yard] of await serverYards(browser, request)) {
    check(url, yard, "server HTML");
  }
  for (const url of [LOG, recordOf(24)]) {
    await open(page, url, 1440);
    check(url, await readYard(page), "scripts on");
  }
});

test("Y3 The words say what the drawings show: on every step the count line is the rule's for k, the Theseus's caption names its step's sprint, and p[data-yard-question] is on the k = 22 step alone, after the count line and before the record, scripts on and off; /log/1, /log/22 and /log/24 read the contract's worked examples", async ({
  browser,
  request,
  page,
}) => {
  test.setTimeout(120_000);
  const reads = await serverYards(browser, request);
  for (const [url, yard] of reads) {
    const n = stepOf(url);
    const k = stepIndex(n);
    const where = `${url} (step ${n}, k = ${k}), server HTML`;
    expect.soft(yard.count, `the count line on ${where}`).toBe(COUNT_AT(k));
    expect
      .soft(
        yard.captions,
        `elements opening with "${YARD_WORDS.caption}" on ${where}`,
      )
      .toHaveLength(1);
    expect
      .soft(
        new RegExp(`\\bsprint ${n}(?!\\d)`).test(yard.captions[0] ?? ""),
        `the Theseus's caption "${yard.captions[0]}" names sprint ${n} on ${where}`,
      )
      .toBe(true);
    expect
      .soft(
        yard.captions[0],
        `the Theseus's caption, Iris's words, on ${where}`,
      )
      .toBe(YARD_WORDS.captionAt(n, url === LOG));
    const asks = url !== LOG && n === QUESTION_STEP;
    expect
      .soft(
        yard.questions.map((q) => q.text),
        `${QUESTION} on ${where}`,
      )
      .toEqual(asks ? [YARD_WORDS.question] : []);
    for (const q of yard.questions) {
      expect
        .soft(q.afterCount, `the question after the count line on ${where}`)
        .toBe(true);
      expect
        .soft(q.beforeRecord, `the question before the record on ${where}`)
        .toBe(true);
    }
  }

  // The contract's worked examples, word for word.
  const examples: [number, string][] = [
    [1, "1 of 22 original planks is out. The gaps are the 21 still sailing."],
    [22, "21 of 22 original planks are out. The gap is the 1 still sailing."],
    [
      24,
      "All 22 original planks are out: the last went with sprint 23. Since then the crew has replaced 1 plank of its own.",
    ],
  ];
  for (const [n, words] of examples) {
    expect
      .soft(reads.get(recordOf(n))?.count, `the count line on /log/${n}`)
      .toBe(words);
  }

  // With scripts: the question where k = 22 and nowhere beside it.
  const at = STEPS.indexOf(QUESTION_STEP ?? Number.NaN);
  for (const url of [
    LOG,
    recordOf(STEPS[at - 1] ?? 0),
    recordOf(QUESTION_STEP ?? 0),
    recordOf(STEPS[at + 1] ?? 0),
  ]) {
    await open(page, url, 1440);
    const yard = await readYard(page);
    const asks = url === recordOf(QUESTION_STEP ?? 0);
    expect
      .soft(
        yard.questions.map((q) => q.text),
        `${QUESTION} on ${url} (scripts on)`,
      )
      .toEqual(asks ? [YARD_WORDS.question] : []);
    for (const q of yard.questions) {
      expect
        .soft(
          q.afterCount,
          `the question after the count line on ${url} (scripts on)`,
        )
        .toBe(true);
      expect
        .soft(
          q.beforeRecord,
          `the question before the record on ${url} (scripts on)`,
        )
        .toBe(true);
    }
  }
});

/** A link's paint and box, at rest or as it is now. */
function linkLook(page: Page, selector: string) {
  return page.evaluate((css) => {
    const rgba = (window as Window & { __rgba?: (c: string) => Rgba }).__rgba;
    const el = [...document.querySelectorAll(css)].find(
      (a) => a.getClientRects().length > 0,
    );
    if (!el) return null;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      color: rgba ? rgba(s.color) : null,
      decoration: rgba ? rgba(s.textDecorationColor) : null,
      outline: {
        style: s.outlineStyle,
        width: Number.parseFloat(s.outlineWidth),
        offset: Number.parseFloat(s.outlineOffset),
        color: rgba ? rgba(s.outlineColor) : null,
      },
      box: { x: r.left, y: r.top, width: r.width, height: r.height },
      focused: el === document.activeElement,
    };
  }, selector);
}

test("Y4 The steps are links, in order: in each record's head, before its h2, previous to the merged sprint before (not on step 1) and next to the one after (not on the newest), each once, /log/15's next /log/17; /log alone has one Start again, to /log/1; all three ink, never copper, at rest, hovered and focused, with the site's ring, 44 px tall below 1024 and 24 x 24 from it; with scripts off at 390 x 844, Start again then next 21 times walks 1 to 15 and 17 to 23 to the question, and Back returns to /log/22", async ({
  browser,
  request,
  page,
}) => {
  test.setTimeout(240_000);
  for (const [url, yard] of await serverYards(browser, request)) {
    const where = `${url}, server HTML`;
    if (url === LOG) {
      expect
        .soft(
          yard.start.map((a) => [a.href, a.name]),
          `a[data-step="start"] on ${where}`,
        )
        .toEqual([[recordOf(STEPS[0] ?? 1), YARD_WORDS.start(STEPS[0] ?? 1)]]);
      expect
        .soft(
          [...yard.previous, ...yard.next].map((a) => a.href),
          `previous or next links on ${where}`,
        )
        .toEqual([]);
      continue;
    }
    const n = stepOf(url);
    const { previous, next } = neighbours(n);
    expect.soft(yard.start, `a[data-step="start"] on ${where}`).toEqual([]);
    for (const [kind, links, to, words] of [
      ["previous", yard.previous, previous, YARD_WORDS.previous],
      ["next", yard.next, next, YARD_WORDS.next],
    ] as const) {
      expect
        .soft(
          links.map((a) => [a.href, a.name, a.inHead]),
          `a[data-step="${kind}"] on ${where}: [href, name, in the record's head before its h2]`,
        )
        .toEqual(to === undefined ? [] : [[recordOf(to), words(to), true]]);
    }
  }
  expect.soft(neighbours(15).next, "the step after 15 in the record").toBe(17);

  // Ink, never copper, at rest, hovered and focused; the ring; the target.
  for (const scheme of SCHEMES) {
    for (const [width, height] of SIZES) {
      for (const [url, kinds] of [
        [LOG, ["start"]],
        [recordOf(13), ["previous", "next"]],
      ] as const) {
        await open(page, url, width, scheme, height);
        const ink = await tokenRgba(page, "--foreground");
        const copper = await tokenRgba(page, "--accent");
        for (const kind of kinds) {
          const selector = `a[data-step="${kind}"]`;
          const where = `${selector} on ${url} at ${width} x ${height}, ${scheme}`;
          const rest = await linkLook(page, selector);
          expect(rest, `${where} is shown`).not.toBeNull();
          if (!rest) continue;
          const { previous, next } = neighbours(13);
          await expect
            .soft(page.locator(selector), `${where}'s accessible name`)
            .toHaveAccessibleName(
              kind === "start"
                ? YARD_WORDS.start(STEPS[0] ?? 1)
                : kind === "previous"
                  ? YARD_WORDS.previous(previous ?? 0)
                  : YARD_WORDS.next(next ?? 0),
            );
          await page.mouse.move(
            rest.box.x + rest.box.width / 2,
            rest.box.y + rest.box.height / 2,
          );
          await pause(250);
          const hovered = await linkLook(page, selector);
          await page.mouse.move(1, 1);
          // Focused by Tab, so :focus-visible holds: from main, as far as the link.
          await page
            .locator("main")
            .evaluate((el) => (el as HTMLElement).focus());
          let focused = await linkLook(page, selector);
          for (let i = 0; i < 80 && !focused?.focused; i++) {
            await page.keyboard.press("Tab");
            focused = await linkLook(page, selector);
          }
          await pause(250);
          focused = await linkLook(page, selector);
          for (const [state, look] of [
            ["at rest", rest],
            ["hovered", hovered],
            ["focused", focused],
          ] as const) {
            expect
              .soft(
                sameColor(look?.color ?? null, ink) &&
                  sameColor(look?.decoration ?? null, ink),
                `${where} ${state}: text ${JSON.stringify(look?.color)} and underline ${JSON.stringify(look?.decoration)} are ink ${JSON.stringify(ink)}`,
              )
              .toBe(true);
            expect
              .soft(
                sameColor(look?.color ?? null, copper) ||
                  sameColor(look?.decoration ?? null, copper) ||
                  sameColor(look?.outline.color ?? null, copper),
                `${where} ${state} wears copper`,
              )
              .toBe(false);
          }
          expect
            .soft(focused?.focused, `${where} takes focus by Tab`)
            .toBe(true);
          const ring = focused?.outline;
          expect
            .soft(
              ring?.style === "solid" &&
                Math.abs((ring?.width ?? 0) - 2) <= 0.05 &&
                Math.abs((ring?.offset ?? 0) - 2) <= 0.05 &&
                sameColor(ring?.color ?? null, ink),
              `${where} focused wears the site's ring, 2 px ink 2 px out: ${JSON.stringify(ring)}`,
            )
            .toBe(true);
          const [tall, wide] = width < 1024 ? [44, 0] : [24, 24];
          expect
            .soft(
              rest.box.height >= tall - 0.05 && rest.box.width >= wide - 0.05,
              `${where} measures ${rest.box.width} x ${rest.box.height}, at least ${wide || "any"} x ${tall}`,
            )
            .toBe(true);
        }
      }
    }
  }

  // The walk, scripts off at 390 x 844: Start again, then next 21 times, by the keyboard.
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const walker = await context.newPage();
  const pressLink = async (kind: string) => {
    const found = await walker.evaluate((css) => {
      const a = document.querySelector<HTMLAnchorElement>(css);
      a?.focus();
      return Boolean(a && document.activeElement === a);
    }, `a[data-step="${kind}"]`);
    expect(found, `a[data-step="${kind}"] on ${walker.url()}`).toBe(true);
    const from = walker.url();
    await Promise.all([
      walker.waitForURL((u) => u.href !== from, { waitUntil: "commit" }),
      walker.keyboard.press("Enter"),
    ]);
    await walker.waitForLoadState("domcontentloaded");
  };
  expect(
    (await walker.goto(LOG))?.status(),
    "status of /log, scripts off",
  ).toBe(200);
  const visited: number[] = [];
  await pressLink("start");
  visited.push(stepOf(new URL(walker.url()).pathname));
  for (let press = 0; press < 21; press++) {
    await pressLink("next");
    visited.push(stepOf(new URL(walker.url()).pathname));
  }
  const expectedWalk = [
    ...Array.from({ length: 15 }, (_, i) => i + 1),
    ...Array.from({ length: 7 }, (_, i) => i + 17),
  ];
  expect.soft(visited, "the steps the walk lands on").toEqual(expectedWalk);
  expect
    .soft(visited, "the walk is the record's first 22 steps")
    .toEqual(STEPS.slice(0, 22));
  expect
    .soft(
      (await readYard(walker)).questions.map((q) => q.text),
      `the question on ${walker.url()}, scripts off`,
    )
    .toEqual([YARD_WORDS.question]);
  await walker.goBack({ waitUntil: "domcontentloaded" });
  expect
    .soft(new URL(walker.url()).pathname, "Back from the question's step")
    .toBe(recordOf(STEPS[20] ?? 22));
  await context.close();
});

test("Y5 In the first screen, at 1440 x 900 and 390 x 844 in both schemes: on /log Start again and the top of both drawings; on /log/13, /log/23 and the newest step its next link (on the newest, previous) and the top of both drawings", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const tops = (selectors: string[]) =>
    page.evaluate(
      (list) =>
        list.map((selector) => {
          const el = [...document.querySelectorAll(selector)].find(
            (e) => e.getClientRects().length > 0,
          );
          const top = el ? el.getBoundingClientRect().top : Number.NaN;
          return { selector, top, inside: top >= 0 && top < innerHeight };
        }),
      selectors,
    );
  const pages: [string, string][] = [
    [LOG, 'a[data-step="start"]'],
    ...[...new Set([13, QUESTION_STEP ?? 23, NEWEST_STEP])].map(
      (n): [string, string] => [
        recordOf(n),
        `a[data-step="${n === NEWEST_STEP ? "previous" : "next"}"]`,
      ],
    ),
  ];
  for (const scheme of SCHEMES) {
    for (const [width, height] of SIZES) {
      for (const [url, link] of pages) {
        await open(page, url, width, scheme, height);
        for (const found of await tops([link, THESEUS, GHOST_HULL])) {
          expect
            .soft(
              found.inside,
              `${found.selector} starts at ${found.top} on ${url}, ${width} x ${height}, ${scheme}`,
            )
            .toBe(true);
        }
      }
    }
  }
});

/** Each plank of both drawings, as painted: its fill, and its alpha through every ancestor's opacity. */
function paintedPlanks(page: Page) {
  return page.evaluate(
    ({ theseusSel, ghostSel }) => {
      const alpha = (el: Element, root: Element) => {
        const s = getComputedStyle(el);
        if (s.fill === "none" || s.fill === "transparent") return 0;
        const parts = s.fill.match(/^rgba?\((.*)\)$/)?.[1]?.split(/[\s,/]+/);
        let a =
          (parts?.length === 4 ? Number(parts[3]) : 1) * Number(s.fillOpacity);
        for (let up: Element | null = el; up; up = up.parentElement) {
          a *= Number(getComputedStyle(up).opacity);
          if (up === root) break;
        }
        return a;
      };
      const read = (css: string) => {
        const root = document.querySelector(css);
        return [...(root?.querySelectorAll("path[data-plank]") ?? [])].map(
          (p) => ({
            id: p.getAttribute("data-plank") ?? "",
            fill: getComputedStyle(p).fill,
            alpha: root ? alpha(p, root) : 0,
            seen:
              p.getClientRects().length > 0 &&
              p.checkVisibility({
                opacityProperty: true,
                visibilityProperty: true,
              }),
          }),
        );
      };
      return {
        theseus: read(theseusSel),
        ghost: read(ghostSel),
        canvases: document.querySelectorAll("canvas").length,
        modelCanvases: document.querySelectorAll(
          "[data-ghost] + [data-model] canvas",
        ).length,
      };
    },
    { theseusSel: THESEUS, ghostSel: GHOST_HULL },
  );
}

const unpainted = (
  planks: { id: string; fill: string; alpha: number; seen: boolean }[],
) =>
  planks
    .filter((p) => !p.seen || Math.abs(p.alpha - 1) > 0.001)
    .map((p) => `${p.id}: fill ${p.fill}, alpha ${p.alpha}, seen ${p.seen}`);

for (const url of SAMPLED) {
  test(`Y6 Whole in every mode, on ${url}: with WebGL refused, Off stored or scripts off, every plank of both drawings painted at full opacity at 1440 and 390; in Full and in Calm at rest, one canvas, the ghost's, the 3D ghost's planks exactly GHOST_AT(n), and no console errors (the Theseus at rest is the canvas's since Yc: Y12 checks it)`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(420_000);
    const n = stepOf(url);
    const seats = Object.keys(GHOST_AT(n)).sort();
    for (const [width, height] of SIZES) {
      for (const [mode, options] of [
        ["WebGL refused", { refuse: true }],
        ["Off stored", { stored: "off" }],
        ["scripts off", { noScript: true }],
      ] as [string, ModelOptions][]) {
        const where = `${url} at ${width} x ${height}, ${mode}`;
        const run = await openModel(browser, { width, height, ...options });
        await run.goto(url);
        if (!options.noScript) await pause(1500);
        const paint = await paintedPlanks(run.page);
        await run.close();
        expect
          .soft(paint.theseus.length, `Theseus planks, ${where}`)
          .toBe(PLANK_IDS.length);
        expect
          .soft(paint.ghost.length, `ghost planks, ${where}`)
          .toBe(seats.length);
        expect
          .soft(
            unpainted(paint.theseus),
            `Theseus planks not painted whole, ${where}`,
          )
          .toEqual([]);
        expect
          .soft(
            unpainted(paint.ghost),
            `ghost planks not painted whole, ${where}`,
          )
          .toEqual([]);
      }
      for (const [mode, options] of [
        ["Full", {}],
        ["Calm", { stored: "calm" }],
      ] as [string, ModelOptions][]) {
        const where = `${url} at ${width} x ${height}, ${mode} at rest`;
        const run = await openModel(browser, { width, height, ...options });
        await run.goto(url);
        await atRest(run, where);
        await pause(300);
        const paint = await paintedPlanks(run.page);
        expect.soft(paint.canvases, `canvases on the page, ${where}`).toBe(1);
        expect
          .soft(
            paint.modelCanvases,
            `the canvas is the ghost's model's, ${where}`,
          )
          .toBe(1);
        // Retired in sprint 55 (Yc): "the Theseus's planks still painted" at rest in Full and Calm.
        // The Theseus is drawn in the one canvas now and its svg goes under the model as the
        // ghost's does; Y12 (e2e/log-press.spec.ts) checks it there, frame 1's registration and
        // fills on [data-theseus] and its settled pixels in that box (accepted by Atlas for Lens).
        const scan = await scanSeats(run, width >= 1280 ? 6 : 2);
        const picked = [...new Set(scan.grid.map(([, , seat]) => seat))].sort();
        testInfo.annotations.push({
          type: "3D seats",
          description: `${where}: ${picked.length} seats picked of GHOST_AT(${n})'s ${seats.length}`,
        });
        expect
          .soft(
            picked,
            `the 3D ghost's seats, by a scan of data-pick, ${where}`,
          )
          .toEqual(seats);
        expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
        await run.close();
      }
    }
  });
}

for (const url of Y7_PAGES) {
  test(`Y7 Accessible, on ${url}: B2.9's invariants (axe at 390 and 1440 with and without the skip link, text from tokens and body text 16 px in both schemes, no overflow from 320 to 1440, 24 px targets at 390, nothing animating with WebGL refused); both drawings aria-hidden with nothing focusable, nothing in them hit by elementFromPoint at 390 and 1440; in forced colours every Theseus plank's edge shows`, async ({
    page,
  }) => {
    test.setTimeout(300_000);
    for (const scheme of SCHEMES) {
      for (const width of [390, 1440]) {
        for (const skipShowing of [false, true]) {
          const where = `${url}, ${width} px, ${scheme}, ${skipShowing ? "skip link showing" : "nothing focused"}`;
          await open(page, url, width, scheme);
          if (skipShowing) await page.keyboard.press("Tab");
          const results = await new AxeBuilder({ page })
            .withTags(AXE_TAGS)
            .analyze();
          expect
            .soft(
              results.violations.map((v) => ({
                rule: v.id,
                targets: v.nodes.map((node) => node.target.join(" ")),
              })),
              `axe violations (${where})`,
            )
            .toEqual([]);
          const passed = results.passes.map((p) => p.id);
          for (const rule of [
            "color-contrast",
            "landmark-one-main",
            "region",
          ]) {
            expect
              .soft(passed, `axe passed ${rule} (${where})`)
              .toContain(rule);
          }
        }
      }
      for (const width of [320, 1440]) {
        const where = `${url} at ${width} px (${scheme})`;
        await open(page, url, width, scheme);
        const { tokenColors, tokenSizes, texts } = await textStyles(page);
        expect
          .soft(
            texts
              .filter(
                ({ color, fontSize }) =>
                  !tokenColors.includes(color) ||
                  !tokenSizes.includes(fontSize),
              )
              .map(
                ({ element, color, fontSize }) =>
                  `${element}: ${color}, ${fontSize}`,
              ),
            `text not set in a token on ${where}`,
          )
          .toEqual([]);
        const body = await page.evaluate(() => {
          const s = getComputedStyle(document.body);
          return {
            size: Number.parseFloat(s.fontSize),
            background: s.backgroundColor,
          };
        });
        expect
          .soft(body.size, `body font size on ${where}`)
          .toBeGreaterThanOrEqual(16);
        expect
          .soft(body.background, `body background is --background on ${where}`)
          .toBe(await resolvedBackground(page));
      }
    }
    for (const width of [320, 390, 768, 1024, 1440]) {
      await open(page, url, width);
      expect
        .soft(
          await horizontalOverflow(page),
          `overflow on ${url} at ${width} px`,
        )
        .toBeLessThanOrEqual(0);
    }
    await open(page, url, 390, undefined, 844);
    await page.keyboard.press("Tab");
    expect
      .soft(
        await page.evaluate(() =>
          [...document.querySelectorAll("a, button")]
            .filter((el) => el.getClientRects().length > 0)
            .flatMap((el) => {
              const r = el.getBoundingClientRect();
              return r.width >= 24 && r.height >= 24
                ? []
                : [
                    `${el.getAttribute("href") ?? el.tagName}: ${r.width} x ${r.height}`,
                  ];
            }),
        ),
        `links and buttons under 24 x 24 px on ${url} at 390`,
      )
      .toEqual([]);
    // Nothing animates (WebGL refused, the context's): at load, 2 s later, at the bottom and top.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await open(page, url, 1440);
    const animations = () =>
      page.evaluate(() => document.getAnimations().length);
    expect.soft(await animations(), `animations at load on ${url}`).toBe(0);
    await pause(2000);
    expect.soft(await animations(), `animations 2 s later on ${url}`).toBe(0);
    for (const to of ["bottom", "top"] as const) {
      await page.evaluate((where) => {
        scrollTo(
          0,
          where === "top" ? 0 : document.documentElement.scrollHeight,
        );
      }, to);
      await pause(100);
      expect
        .soft(await animations(), `animations at the ${to} on ${url}`)
        .toBe(0);
    }

    // Both drawings hidden, unfocusable, never hit.
    for (const width of [390, 1440]) {
      await open(page, url, width);
      const yard = await readYard(page);
      for (const [name, drawing] of [
        [THESEUS, yard.theseus],
        [GHOST_HULL, yard.ghost],
      ] as const) {
        expect
          .soft(drawing.ariaHidden, `${name}'s aria-hidden on ${url}`)
          .toBe("true");
        expect
          .soft(drawing.focusable, `focusable elements in ${name} on ${url}`)
          .toBe(0);
      }
      for (const selector of [THESEUS, GHOST_HULL]) {
        const hits = await page.evaluate((css) => {
          const drawing = document.querySelector(css);
          if (!drawing) return null;
          drawing.scrollIntoView({ block: "center" });
          const r = drawing.getBoundingClientRect();
          const points = [1 / 6, 1 / 2, 5 / 6].flatMap((fy) =>
            [1 / 6, 1 / 2, 5 / 6].map(
              (fx) => [r.left + r.width * fx, r.top + r.height * fy] as const,
            ),
          );
          for (const plank of drawing.querySelectorAll("[data-plank]")) {
            const p = plank.getBoundingClientRect();
            if (p.width > 0)
              points.push([p.left + p.width / 2, p.top + p.height / 2]);
          }
          return points.flatMap(([x, y]) => {
            const el = document.elementFromPoint(x, y);
            return el && drawing.contains(el)
              ? [
                  `<${el.tagName.toLowerCase()}> at ${Math.round(x)},${Math.round(y)}`,
                ]
              : [];
          });
        }, selector);
        expect(hits, `${selector} on ${url} at ${width}`).not.toBeNull();
        expect
          .soft(
            hits,
            `${selector}'s elements hit by elementFromPoint on ${url} at ${width}`,
          )
          .toEqual([]);
      }
    }

    // Forced colours: every Theseus plank's edge shows against the system's ground.
    await page.emulateMedia({ forcedColors: "active" });
    for (const width of [390, 1440]) {
      await open(page, url, width, "light");
      const edges = await page.evaluate((css) => {
        const rgba = (window as Window & { __rgba?: (c: string) => Rgba })
          .__rgba;
        const ground = rgba
          ? rgba(getComputedStyle(document.body).backgroundColor)
          : null;
        return {
          ground,
          planks: [...document.querySelectorAll(`${css} path[data-plank]`)].map(
            (p) => {
              const s = getComputedStyle(p);
              return {
                id: p.getAttribute("data-plank") ?? "",
                stroke: rgba ? rgba(s.stroke) : null,
                width: Number.parseFloat(s.strokeWidth),
              };
            },
          ),
        };
      }, THESEUS);
      expect
        .soft(
          edges.planks.length,
          `Theseus planks in forced colours on ${url} at ${width}`,
        )
        .toBe(PLANK_IDS.length);
      expect
        .soft(
          edges.planks
            .filter(
              (p) =>
                !p.stroke ||
                !(p.width > 0) ||
                sameColor(
                  p.stroke.slice(0, 3),
                  (edges.ground ?? []).slice(0, 3),
                ),
            )
            .map((p) => `${p.id}: ${JSON.stringify(p.stroke)} ${p.width} px`),
          `Theseus planks whose edge doesn't show in forced colours on ${url} at ${width} (Canvas ${JSON.stringify(edges.ground)})`,
        )
        .toEqual([]);
    }
  });
}

test("Y8 Budgets: the Theseus drawing's outerHTML at most 32,768 B on every step; the LCP on /log, /log/13 and /log/23 at 4x CPU is text in main outside both drawings within 2,500 ms at 390 and 1440; CLS 0 from load to rest + 2 s on /log/23 at 320, 390 and 1440", async ({
  browser,
  request,
  page,
}, testInfo) => {
  test.setTimeout(300_000);
  let largest = 0;
  for (const [url, yard] of await serverYards(browser, request)) {
    largest = Math.max(largest, yard.theseus.bytes);
    expect.soft(yard.theseus.count, `${THESEUS} on ${url}`).toBe(1);
    expect
      .soft(yard.theseus.bytes, `${THESEUS}'s outerHTML in bytes on ${url}`)
      .toBeLessThanOrEqual(32_768);
  }
  testInfo.annotations.push({
    type: "bytes",
    description: `the largest Theseus drawing: ${largest} B of outerHTML`,
  });

  for (const url of SAMPLED) {
    for (const [width, height] of [
      [390, 844],
      [1440, 900],
    ] as const) {
      const where = `on ${url} at ${width} x ${height}`;
      const fresh = await page.context().newPage();
      await fresh.setViewportSize({ width, height });
      await fresh.addInitScript(
        ({ theseus, ghost }) => {
          const win = window as Window & {
            __lcpWhere?: { main: boolean; drawing: boolean }[];
          };
          win.__lcpWhere = [];
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const el = (
                entry as PerformanceEntry & { element: Element | null }
              ).element;
              win.__lcpWhere?.push({
                main: Boolean(el?.closest("main")),
                drawing: Boolean(el?.closest(`${theseus}, ${ghost}`)),
              });
            }
          }).observe({ type: "largest-contentful-paint", buffered: true });
        },
        { theseus: THESEUS, ghost: GHOST_HULL },
      );
      const lcp = await measureLcp(fresh, url);
      // The page's own drawings first, or "text, outside the drawings" holds on the 404 too.
      await expect(fresh.locator(THESEUS), `the Theseus ${where}`).toHaveCount(
        1,
      );
      await expect(fresh.locator(GHOST_HULL), `the ghost ${where}`).toHaveCount(
        1,
      );
      const placed = await fresh.evaluate(
        () =>
          (
            window as Window & {
              __lcpWhere?: { main: boolean; drawing: boolean }[];
            }
          ).__lcpWhere?.at(-1) ?? null,
      );
      await fresh.close();
      expect(lcp, `an LCP candidate ${where}`).not.toBeNull();
      if (!lcp) continue;
      expect
        .soft(
          placed,
          `LCP <${lcp.tag}> "${lcp.text}" in main, outside both drawings, ${where}`,
        )
        .toEqual({ main: true, drawing: false });
      expect.soft(lcp.url, `LCP has a url ${where}`).toBe("");
      expect
        .soft(lcp.tag, `LCP is text ${where}`)
        .not.toMatch(/^(?:img|image|video|svg|canvas|path)$/);
      expect.soft(lcp.time, `LCP time (ms) ${where}`).toBeLessThanOrEqual(2500);
      testInfo.annotations.push({
        type: "lcp",
        description: `${where}: <${lcp.tag}> "${lcp.text}" at ${lcp.time.toFixed(0)} ms`,
      });
    }
  }

  const question = recordOf(QUESTION_STEP ?? 23);
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [1440, 900],
  ] as const) {
    const where = `${question} at ${width} x ${height}`;
    const run = await openModel(browser, { width, height });
    await run.goto(question);
    await atRest(run, where);
    await pause(2000);
    expect
      .soft(
        await run.page.evaluate(
          () => (window as Window & { __cls?: number }).__cls ?? Number.NaN,
        ),
        `layout shift from load to rest + 2 s, ${where}`,
      )
      .toBe(0);
    await run.close();
  }
});
