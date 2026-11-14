import { type Browser, expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";
import { horizontalOverflow, installRgba, SCHEMES } from "./helpers";
import { type Rgba, sameColor, tokenRgba } from "./log";
import { MERGED } from "./retros";
import { refuseWebGl } from "./webgl";

// Sprint 66, Td (.crew/sprint/66/contract.md, T22 and T23): the two doors into the trials, written
// before the build. One plain link, "Try to sink Ruslan's contact links", to /trials: on /crew the
// last thing in the keel's rule 1, after its source link, in that link's classes; on /log after the
// table of Every revision, and nowhere else. The oracle is the contract's words built from the
// owner's facts (content/profile.ts), cross-checked against /trials's own dare (p.trials-dare)
// without its full stop. T23's "nothing above moves" reads each page against itself with the door
// removed from the DOM, so it holds whatever the feed or the newest retro puts above it. T24, the
// named rewrites, are in place in their own specs (.crew/sprint/66/mutant.md).

const DOOR = "[data-trials-door]";
const DOOR_LINK = `${DOOR} a`;
const TRIALS = "/trials";
const FIRST = profile.name.trim().split(/\s+/)[0] ?? "";
const WORDS = `Try to sink ${FIRST}'s contact links`;

const WINDOWS = [
  [320, 568],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1440, 900],
] as const;
/** The windows whose first screen the doors stay out of (T23). */
const FIRST_SCREENS = ["320x568", "390x844", "1440x900"];

type PageName = "/crew" | "/log";
const PAGES: PageName[] = ["/crew", "/log"];

/** Each page's door: where it sits, and the link Tab reaches right before it. */
const PLACE = {
  "/crew": {
    where:
      'inside li[data-rule="1"], after its source link (p.keel-source a), in its classes',
    before: 'li[data-rule="1"] p.keel-source a',
  },
  "/log": {
    where: "inside section.log-revs, after table.rev-log",
    before: "section.log-revs table.rev-log a.rev-link",
  },
} as const;

const at = (width: number, height: number) => `${width} x ${height}`;

/** A context with scripts on or off, WebGL refused, in a scheme; web fonts refused if `blocked`. */
async function contextOf(
  browser: Browser,
  options: {
    width: number;
    height: number;
    scheme?: "light" | "dark";
    scripts?: boolean;
    blocked?: boolean;
  },
) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    viewport: { width: options.width, height: options.height },
    colorScheme: options.scheme ?? "light",
    javaScriptEnabled: options.scripts ?? true,
  });
  await context.addInitScript(installRgba);
  await context.addInitScript(refuseWebGl);
  const aborted = { count: 0 };
  if (options.blocked)
    await context.route(/\.woff2(\?|$)/, (route) => {
      aborted.count += 1;
      return route.abort();
    });
  return { context, page: await context.newPage(), aborted };
}

/** `path`, its status asserted, with the fonts settled (loaded or refused). */
async function open(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), `status of ${path}`).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

/** Every door on the page, and the first one's words, href and place against its page's rule. */
function readDoors(page: Page) {
  return page.evaluate((door) => {
    const squash = (s: string | null | undefined) =>
      (s ?? "").replace(/\s+/g, " ").trim();
    const after = (a: Element | null | undefined, b: Element | null) =>
      Boolean(
        a &&
          b &&
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    const holders = [...document.querySelectorAll(door)];
    const links = [...document.querySelectorAll(`${door} a`)];
    const a = links[0] ?? null;
    const rule = a?.closest("li[data-rule]") ?? null;
    const source = rule?.querySelector("p.keel-source a") ?? null;
    const section = a?.closest("section.log-revs") ?? null;
    const table = section?.querySelector("table.rev-log") ?? null;
    // Any link to the trials at all, door or not: a second way in would be a second door.
    const toTrials = [...document.querySelectorAll("a[href]")].filter((link) =>
      /^\/trials(\/|$|[?#])/.test(link.getAttribute("href") ?? ""),
    ).length;
    return {
      holders: holders.length,
      links: links.length,
      toTrials,
      inBar: document.querySelectorAll(
        `header ${door}, header a[href^="/trials"]`,
      ).length,
      text: a ? squash(a.textContent) : null,
      href: a?.getAttribute("href") ?? null,
      inMain: Boolean(a?.closest("main")),
      rule: rule?.getAttribute("data-rule") ?? null,
      afterSource: after(source, a),
      classes: a?.getAttribute("class") ?? null,
      sourceClasses: source?.getAttribute("class") ?? null,
      inRevs: Boolean(section),
      afterTable: after(table, a),
    };
  }, DOOR);
}

type Doors = Awaited<ReturnType<typeof readDoors>>;

/** T22's place and words on one page, read from one load (or its server HTML). */
function expectDoor(read: Doors, name: PageName, where: string) {
  expect.soft(read.links, `[data-trials-door] a on ${name}, ${where}`).toBe(1);
  expect.soft(read.toTrials, `links to /trials on ${name}, ${where}`).toBe(1);
  expect
    .soft(read.inBar, `doors or /trials links in the bar on ${name}, ${where}`)
    .toBe(0);
  expect.soft(read.text, `the door's words on ${name}, ${where}`).toBe(WORDS);
  expect.soft(read.href, `the door's href on ${name}, ${where}`).toBe(TRIALS);
  expect
    .soft(read.inMain, `the door is in main on ${name}, ${where}`)
    .toBe(true);
  if (name === "/crew") {
    expect
      .soft(
        [read.rule, read.afterSource],
        `the door's rule, and whether it follows rule 1's source link, ${where}`,
      )
      .toEqual(["1", true]);
    expect
      .soft(
        read.classes,
        `the door's class attribute is rule 1's source link's, ${where}`,
      )
      .toBe(read.sourceClasses);
    expect
      .soft(read.sourceClasses, `rule 1's source link's classes, ${where}`)
      .not.toBeNull();
  } else {
    expect
      .soft(
        [read.inRevs, read.afterTable],
        `the door is inside section.log-revs, after table.rev-log, ${where}`,
      )
      .toEqual([true, true]);
  }
}

/** The door link's paints (B1.6's properties) and, when focused, its ring and how many rings show. */
function doorPaint(page: Page, accent: Rgba) {
  return page.evaluate(
    ({ door, target }) => {
      const rgba = (
        window as Window & { __rgba?: (c: string) => number[] | null }
      ).__rgba;
      const a = document.querySelector(`${door} a`);
      const holder = document.querySelector(door);
      if (!a || !holder || !rgba) return null;
      const isAccent = (value: string) => {
        const c = rgba(value);
        return Boolean(
          target &&
            c?.every(
              (v, i) => Math.abs(v - (target[i] ?? -9)) <= (i < 3 ? 1 : 0.02),
            ),
        );
      };
      const copper = [holder, ...holder.querySelectorAll("*")].flatMap((el) =>
        ([null, "::before", "::after"] as const).flatMap((pseudo) => {
          const s = getComputedStyle(el, pseudo);
          if (pseudo && (s.content === "none" || s.content === "normal"))
            return [];
          const paints: [string, string][] = [
            ["color", s.color],
            ["text-decoration-color", s.textDecorationColor],
            ["background-color", s.backgroundColor],
            ["outline-color", s.outlineStyle === "none" ? "" : s.outlineColor],
            ...(["Top", "Right", "Bottom", "Left"] as const).map(
              (side) =>
                [
                  `border-${side.toLowerCase()}-color`,
                  Number.parseFloat(s[`border${side}Width`]) > 0
                    ? s[`border${side}Color`]
                    : "",
                ] as [string, string],
            ),
          ];
          return paints
            .filter(([, value]) => value && isAccent(value))
            .map(([p]) => `${el.tagName.toLowerCase()}${pseudo ?? ""} ${p}`);
        }),
      );
      const s = getComputedStyle(a);
      const ringed = (el: Element) => {
        const cs = getComputedStyle(el);
        return (
          cs.outlineStyle !== "none" && Number.parseFloat(cs.outlineWidth) > 0
        );
      };
      // Every outline or shadow in the door and around it up to main: one ring, the link's.
      const around: Element[] = [];
      for (
        let el = holder.parentElement;
        el && el.tagName !== "BODY";
        el = el.parentElement
      )
        around.push(el);
      return {
        copper,
        focused: document.activeElement === a,
        ring: {
          style: s.outlineStyle,
          width: s.outlineWidth,
          ink: rgba(s.outlineColor),
          shadow: s.boxShadow,
        },
        rings:
          [holder, ...holder.querySelectorAll("*"), ...around].filter(ringed)
            .length +
          [holder, ...holder.querySelectorAll("*")].filter(
            (el) => getComputedStyle(el).boxShadow !== "none",
          ).length,
      };
    },
    { door: DOOR, target: accent },
  );
}

/** What has focus: its href and text, and whether it sits in main and in the door. */
function focused(page: Page) {
  return page.evaluate((door) => {
    const el = document.activeElement;
    return {
      href: el?.getAttribute("href") ?? null,
      text: (el?.textContent ?? "").replace(/\s+/g, " ").trim(),
      inMain: Boolean(el?.closest("main")),
      door: Boolean(el?.closest(door)),
    };
  }, DOOR);
}

/**
 * Tab from the link right before the door (rule 1's source on /crew, the last Rev link on /log):
 * the next stop is the door, and the one after is rule 2's source (/crew) or outside main (/log).
 */
async function tabWalk(page: Page, name: PageName, where: string) {
  const before = page.locator(PLACE[name].before).last();
  const ready = await before
    .focus({ timeout: 2000 })
    .then(() => true)
    .catch(() => false);
  expect
    .soft(ready, `${PLACE[name].before} takes focus on ${name}, ${where}`)
    .toBe(true);
  if (!ready) return;
  await page.keyboard.press("Tab");
  const door = await focused(page);
  expect
    .soft(
      [door.door, door.href, door.text],
      `the stop right after ${PLACE[name].before} on ${name}, ${where}`,
    )
    .toEqual([true, TRIALS, WORDS]);
  if (!door.door) return;
  await page.keyboard.press("Tab");
  const next = await focused(page);
  if (name === "/crew") {
    const rule2 = await page.evaluate(
      () =>
        document
          .querySelector('li[data-rule="2"] p.keel-source a')
          ?.getAttribute("href") ?? "no rule 2 source link",
    );
    expect
      .soft(
        next.href,
        `the stop right after the door on /crew is rule 2's source, ${where}`,
      )
      .toBe(rule2);
  } else {
    expect
      .soft(
        next.inMain,
        `the door is the last Tab stop in main on /log, ${where} (next: ${next.href} "${next.text}")`,
      )
      .toBe(false);
  }
}

// ---------------------------------------------------------------------------------------------
// T22, the doors

const T22 =
  "T22 the doors: on /crew and /log, at 320, 390, 768, 1024 and 1440, both schemes, exactly one [data-trials-door] a per page, reading exactly \"Try to sink Ruslan's contact links\", href exactly /trials; on /crew inside li[data-rule=\"1\"] after its source link, its class attribute that link's; on /log after table.rev-log inside section.log-revs; in GET's HTML; following it lands on /trials, 200, its h1, whose dare is the door's words and a full stop; Tab reaches it right after rule 1's source and right before rule 2's (/crew), right after the last Rev link as main's last stop (/log), scripts on and off; one 2 px ink ring, never --accent at rest, hovered or focused";

for (const name of PAGES) {
  test(`${T22} (${name})`, async ({ browser }) => {
    test.setTimeout(150_000);

    // The server's HTML, parsed with no script to move anything: the door is server-rendered.
    const response = await fetch(
      new URL(name, String(test.info().project.use.baseURL)),
    );
    expect(response.status, `status of GET ${name}`).toBe(200);
    const html = await response.text();
    {
      const raw = await contextOf(browser, {
        width: 1440,
        height: 900,
        scripts: false,
      });
      try {
        await raw.page.route("**/*", (route) => route.abort());
        await raw.page.setContent(html, { waitUntil: "domcontentloaded" });
        expectDoor(await readDoors(raw.page), name, `in GET ${name}'s HTML`);
      } finally {
        await raw.context.close();
      }
    }

    for (const [width, height] of WINDOWS) {
      for (const scheme of SCHEMES) {
        const where = `at ${at(width, height)}, ${scheme}`;
        const { context, page } = await contextOf(browser, {
          width,
          height,
          scheme,
        });
        try {
          await open(page, name);
          const read = await readDoors(page);
          expectDoor(read, name, where);
          if (read.links !== 1) continue;
          const accent = await tokenRgba(page, "--accent");
          const ink = await tokenRgba(page, "--foreground");
          expect.soft(accent, `--accent resolves, ${where}`).not.toBeNull();

          const rest = await doorPaint(page, accent);
          expect
            .soft(
              rest?.copper,
              `copper in the door at rest on ${name}, ${where}`,
            )
            .toEqual([]);

          if (rest) {
            await page.locator(DOOR_LINK).first().hover({ timeout: 5000 });
            const hovered = await doorPaint(page, accent);
            expect
              .soft(
                hovered?.copper,
                `copper in the door hovered on ${name}, ${where}`,
              )
              .toEqual([]);
            await page.mouse.move(0, height - 1);
          }

          await tabWalk(page, name, `${where}, scripts on`);
          // The ring, read with the door focused by Tab from the link before it.
          await page.locator(PLACE[name].before).last().focus();
          await page.keyboard.press("Tab");
          const focus = await doorPaint(page, accent);
          expect
            .soft(focus?.focused, `the door has focus on ${name}, ${where}`)
            .toBe(true);
          expect
            .soft(
              [
                focus?.ring.style,
                focus?.ring.width,
                sameColor(focus?.ring.ink ?? null, ink),
              ],
              `the focused door's ring is solid, 2px, ink (${JSON.stringify(focus?.ring)}) on ${name}, ${where}`,
            )
            .toEqual(["solid", "2px", true]);
          expect
            .soft(
              focus?.rings,
              `rings and shadows in and around the focused door on ${name}, ${where}`,
            )
            .toBe(1);
          expect
            .soft(
              focus?.copper,
              `copper in the door focused on ${name}, ${where}`,
            )
            .toEqual([]);
        } finally {
          await context.close();
        }
      }
    }

    // Scripts off, at a phone and a desktop: the door and its Tab stop are the server's.
    for (const [width, height] of [
      [390, 844],
      [1440, 900],
    ] as const) {
      const where = `at ${at(width, height)}, scripts off`;
      const { context, page } = await contextOf(browser, {
        width,
        height,
        scripts: false,
      });
      try {
        await open(page, name);
        expectDoor(await readDoors(page), name, where);
        await tabWalk(page, name, where);
      } finally {
        await context.close();
      }
    }

    // Following the door lands on the trials, whose dare it is.
    const { context, page } = await contextOf(browser, {
      width: 1440,
      height: 900,
    });
    try {
      await open(page, name);
      const link = page.locator(DOOR_LINK).first();
      if ((await page.locator(DOOR_LINK).count()) === 0) {
        expect.soft(false, `a door to follow on ${name}`).toBe(true);
        return;
      }
      const landing = page.waitForResponse(
        (r) =>
          r.request().isNavigationRequest() &&
          r.request().frame() === page.mainFrame(),
        { timeout: 15_000 },
      );
      await link.click({ timeout: 5000 });
      const landed = await landing;
      await page.waitForLoadState("domcontentloaded");
      expect
        .soft(
          [new URL(landed.url()).pathname, landed.status()],
          `where following the door on ${name} lands, and its status`,
        )
        .toEqual([TRIALS, 200]);
      const trials = await page.evaluate(() => ({
        h1: (document.querySelector("main h1")?.textContent ?? "").trim(),
        dare: (document.querySelector("p.trials-dare")?.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim(),
      }));
      expect
        .soft(trials.h1, `the landing's h1, from ${name}`)
        .toBe("Sea trials");
      expect
        .soft(trials.dare, `/trials's dare is the door's words and a full stop`)
        .toBe(`${WORDS}.`);
    } finally {
      await context.close();
    }
  });
}

/** The first, a middle and the last merged sprint's record. */
const RECORDS = (() => {
  const sprints = MERGED.map((retro) => retro.sprint).sort((a, b) => a - b);
  return [
    ...new Set([
      sprints[0],
      sprints[Math.floor(sprints.length / 2)],
      sprints[sprints.length - 1],
    ]),
  ]
    .filter((n): n is number => n !== undefined)
    .map((n) => `/log/${n}`);
})();

test(`T22 the doors, nowhere else: no [data-trials-door], no link to /trials and none reading the door's words on /, /read or the records ${RECORDS.join(", ")} (the first, a middle and the last), at 1440 x 900 and 390 x 844, scripts off; none in the bar on /crew and /log (the doors' own pass)`, async ({
  browser,
}) => {
  expect(RECORDS.length, "records sampled").toBe(3);
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ] as const) {
    const { context, page } = await contextOf(browser, {
      width,
      height,
      scripts: false,
    });
    try {
      for (const path of ["/", "/read", ...RECORDS]) {
        await open(page, path);
        const read = await readDoors(page);
        expect
          .soft(
            [read.holders, read.links, read.toTrials, read.text],
            `[data-trials-door], its links, links to /trials and a door's words on ${path} at ${at(width, height)}`,
          )
          .toEqual([0, 0, 0, null]);
        const words = await page.evaluate(
          (w) =>
            [...document.querySelectorAll("a")].filter((a) =>
              (a.textContent ?? "").replace(/\s+/g, " ").includes(w),
            ).length,
          WORDS,
        );
        expect
          .soft(
            words,
            `links reading "${WORDS}" on ${path} at ${at(width, height)}`,
          )
          .toBe(0);
      }
    } finally {
      await context.close();
    }
  }
});

// ---------------------------------------------------------------------------------------------
// T23, the fit

/**
 * The door's fit in one synchronous read: its link's box and lines, its top, and how far every
 * element before it in DOM order moves when the door is taken out of the DOM (and put back).
 * Where each sits is its left, top and width in page coordinates (Iris's read, placement.md section
 * 4): heights are left out, since the door's ancestors grow by design and so does what is sized
 * by them, as /log's [data-model], absolute over all of main, does by 68 px below 1024.
 */
function readFit(page: Page) {
  return page.evaluate((door) => {
    const holder = document.querySelector(door);
    const a = holder?.querySelector("a");
    if (!holder || !a) return null;
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return [r.left + scrollX, r.top + scrollY, r.width, r.height];
    };
    const before = [...document.body.querySelectorAll("*")].filter(
      (el) =>
        el !== holder &&
        !holder.contains(el) &&
        el.compareDocumentPosition(holder) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
    const withDoor = before.map(box);
    const parent = holder.parentNode;
    const next = holder.nextSibling;
    holder.remove();
    const without = before.map(box);
    parent?.insertBefore(holder, next);
    const moved: string[] = [];
    let most = 0;
    before.forEach((el, i) => {
      const d = Math.max(
        ...[0, 1, 2].map((k) =>
          Math.abs((withDoor[i]?.[k] ?? 0) - (without[i]?.[k] ?? 0)),
        ),
      );
      most = Math.max(most, d);
      if (d > 0.5 && moved.length < 6) {
        const cls = el.getAttribute("class")?.split(" ")[0];
        moved.push(
          `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ""} "${(el.textContent ?? "").trim().slice(0, 24)}" by ${d.toFixed(2)}`,
        );
      }
    });
    // The words' line boxes: one line has one top, whatever fragments it splits into.
    const range = document.createRange();
    range.selectNodeContents(a);
    const tops: number[] = [];
    for (const r of range.getClientRects()) {
      if (r.width === 0 || r.height === 0) continue;
      if (!tops.some((t) => Math.abs(t - r.top) < 2)) tops.push(r.top);
    }
    const r = a.getBoundingClientRect();
    return {
      before: before.length,
      most,
      moved,
      lines: tops.length,
      width: r.width,
      height: r.height,
      top: r.top + scrollY,
      fold: innerHeight,
    };
  }, DOOR);
}

const T23 =
  "T23 the fit: at 320, 390, 768, 1024 and 1440, webfont and fonts blocked, each door one line, at least 44 px tall below 1024 and 24 x 24 from it, no horizontal overflow on the page, every element before it in DOM order within 0.5 px of where it sits (left, top and width) with the door removed from the DOM, and outside the first screen at 320 x 568, 390 x 844 and 1440 x 900";

for (const name of PAGES) {
  test(`${T23} (${name})`, async ({ browser }) => {
    test.setTimeout(120_000);
    for (const blocked of [false, true]) {
      for (const [width, height] of WINDOWS) {
        const where = `at ${at(width, height)}, ${blocked ? "fonts blocked" : "webfont"}`;
        const { context, page, aborted } = await contextOf(browser, {
          width,
          height,
          blocked,
        });
        try {
          await open(page, name);
          // The local() faces load without a request, so only the web faces count (sprint 60).
          const loaded = await page.evaluate(
            () =>
              [...document.fonts].filter(
                (face) =>
                  face.status === "loaded" &&
                  !/\b(local|fallback)\b/i.test(face.family),
              ).length,
          );
          expect(
            [loaded > 0, aborted.count > 0],
            `web faces loaded (${loaded}) and woff2 requests aborted (${aborted.count}) on ${name}, ${where}`,
          ).toEqual(blocked ? [false, true] : [true, false]);
          // Let any entrance settle before the boxes are read (memory: sprints 3 and 5).
          await page.evaluate(() =>
            Promise.all(
              document
                .getAnimations()
                .filter((anim) => anim.timeline === document.timeline)
                .map((anim) => anim.finished.catch(() => undefined)),
            ),
          );
          const fit = await readFit(page);
          expect.soft(fit, `a door on ${name}, ${where}`).not.toBeNull();
          if (!fit) continue;
          expect
            .soft(fit.lines, `the door's lines on ${name}, ${where}`)
            .toBe(1);
          if (width < 1024)
            expect
              .soft(fit.height, `the door's height on ${name}, ${where}`)
              .toBeGreaterThanOrEqual(44);
          else
            expect
              .soft(
                [fit.width >= 24, fit.height >= 24],
                `the door is 24 x 24 (${fit.width} x ${fit.height}) on ${name}, ${where}`,
              )
              .toEqual([true, true]);
          expect
            .soft(
              await horizontalOverflow(page),
              `sideways overflow on ${name}, ${where}`,
            )
            .toBeLessThanOrEqual(0);
          expect
            .soft(fit.before, `elements before the door on ${name}, ${where}`)
            .toBeGreaterThan(20);
          expect
            .soft(
              fit.most,
              `the most any element before the door moves for it on ${name}, ${where}: ${fit.moved.join("; ")}`,
            )
            .toBeLessThanOrEqual(0.5);
          if (FIRST_SCREENS.includes(`${width}x${height}`))
            expect
              .soft(
                fit.top,
                `the door's top on ${name}, ${where}, against the first screen's ${fit.fold}`,
              )
              .toBeGreaterThanOrEqual(fit.fold);
        } finally {
          await context.close();
        }
      }
    }
  });
}
