import { expect, type Page, test } from "@playwright/test";

// Sprint 5's contract (.crew/sprint/5/contract.md), one test per numbered check: sections below
// the fold ease in on scroll with a CSS view timeline, the header never moves, reduced motion and
// browsers without scroll-driven animations get the static page, and nothing is hidden from a
// keyboard visitor or with scripts off.
//
// Every test that says "nothing moves" first demands that, with motion allowed, the reveal is there.
// Without that, a page with no reveal at all would pass them for the wrong reason.

test.use({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "no-preference",
});

const SECTION = "main section";
const CONTACT = 'section[aria-labelledby="contact"]';
const CONTACT_LINK = `${CONTACT} li:first-child a`;
/** The only properties a reveal may animate, with the keyframe bookkeeping keys. */
const ALLOWED = new Set([
  "opacity",
  "transform",
  "translate",
  "offset",
  "computedOffset",
  "easing",
  "composite",
]);
const MAX_RISE_PX = 24;

type Box = { left: number; top: number; width: number; height: number };
type Anim = {
  kind: "CSSAnimation" | "CSSTransition" | "Animation";
  /** The timeline is a ViewTimeline (animation-timeline: view() or a named view-timeline). */
  view: boolean;
  playState: string;
  name: string;
  target: string;
  /** The id of the section the target sits in (or is), null when it is not in a section. */
  section: string | null;
  inMain: boolean;
  /** The target is the header, inside it, or an ancestor of it (which would move the header too). */
  touchesHeader: boolean;
  /** The target itself is at opacity < 1 or transformed right now. */
  targetNotAtRest: boolean;
  /** Keyframe properties beyond opacity, transform, translate and the bookkeeping keys. */
  extraProps: string[];
  /** The largest vertical offset, in px, any keyframe puts on the target. */
  rise: number;
};
type Sec = {
  id: string;
  /** Viewport coordinates, as now. */
  top: number;
  bottom: number;
  section: Box;
  h2: Box;
  /** The section and every descendant that is not at opacity 1 with no transform or translate. */
  notAtRest: string[];
  /** Elements with an animation that runs on a clock (no scroll or view timeline). */
  clock: string[];
};
type Snap = {
  scrollY: number;
  vh: number;
  docHeight: number;
  animations: number;
  sections: Sec[];
  anims: Anim[];
  header: { found: boolean; notAtRest: string[] };
};

/** Everything the checks need to know about the page right now, read in one pass. */
async function read(page: Page): Promise<Snap> {
  return page.evaluate(
    ({ sectionSelector, allowed }) => {
      const num = (value: string) => Number.parseFloat(value);
      const identity = (value: string, kind: "matrix" | "translate") => {
        if (value === "none" || value === "") return true;
        if (kind === "translate") {
          return value.split(/\s+/).every((part) => Math.abs(num(part)) < 0.01);
        }
        const numbers = (value.match(/-?[\d.]+(?:e-?\d+)?/g) ?? []).map(Number);
        const wanted =
          numbers.length === 16
            ? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
            : [1, 0, 0, 1, 0, 0];
        return (
          numbers.length === wanted.length &&
          numbers.every((n, i) => Math.abs(n - (wanted[i] ?? 0)) < 0.01)
        );
      };
      const restProblems = (el: Element) => {
        const style = getComputedStyle(el);
        const why: string[] = [];
        if (Math.abs(num(style.opacity) - 1) > 0.001)
          why.push(`opacity ${style.opacity}`);
        if (!identity(style.transform, "matrix"))
          why.push(`transform ${style.transform}`);
        if (!identity(style.translate, "translate"))
          why.push(`translate ${style.translate}`);
        return why;
      };
      const label = (el: Element) =>
        `<${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}>`;
      const box = (el: Element): Box => {
        const r = el.getBoundingClientRect();
        return {
          left: r.left + scrollX,
          top: r.top + scrollY,
          width: r.width,
          height: r.height,
        };
      };
      const ViewTimelineCtor = (
        window as unknown as { ViewTimeline?: new () => AnimationTimeline }
      ).ViewTimeline;

      const main = document.querySelector("main");
      const header = document.querySelector("main > header");
      const sectionEls = [...document.querySelectorAll(sectionSelector)];
      const idOf = (s: Element) => s.getAttribute("aria-labelledby") ?? "";

      // Is a keyframe's offset a rise? Resolve its transform and translate on a probe the target's size.
      const riseOf = (target: Element, frame: Record<string, unknown>) => {
        const probe = document.createElement("div");
        const html = target instanceof HTMLElement ? target : null;
        const width = html?.offsetWidth ?? 0;
        const height = html?.offsetHeight ?? 0;
        probe.style.cssText = `position:absolute;visibility:hidden;width:${width}px;height:${height}px;font-size:${getComputedStyle(target).fontSize}`;
        (target.parentElement ?? document.body).append(probe);
        let rise = 0;
        if (typeof frame.transform === "string") {
          probe.style.transform = frame.transform;
          const numbers = (
            getComputedStyle(probe).transform.match(/-?[\d.]+(?:e-?\d+)?/g) ??
            []
          ).map(Number);
          const y = numbers.length === 16 ? numbers[13] : numbers[5];
          rise = Math.max(rise, Math.abs(y ?? 0));
        }
        if (typeof frame.translate === "string") {
          probe.style.translate = frame.translate;
          const y = getComputedStyle(probe).translate.split(/\s+/)[1] ?? "0";
          rise = Math.max(
            rise,
            Math.abs(y.endsWith("%") ? (num(y) / 100) * height : num(y)),
          );
        }
        probe.remove();
        return rise;
      };

      const anims: Anim[] = document.getAnimations().map((animation) => {
        const effect = animation.effect as KeyframeEffect | null;
        const target = effect?.target ?? null;
        const frames = (effect?.getKeyframes() ?? []) as Record<
          string,
          unknown
        >[];
        const sectionEl = target
          ? sectionEls.find((s) => s.contains(target))
          : undefined;
        return {
          kind:
            animation instanceof CSSAnimation
              ? "CSSAnimation"
              : animation instanceof CSSTransition
                ? "CSSTransition"
                : "Animation",
          view:
            ViewTimelineCtor !== undefined &&
            animation.timeline instanceof ViewTimelineCtor,
          playState: animation.playState,
          name:
            animation instanceof CSSAnimation ? animation.animationName : "",
          target: target ? label(target) : "(none)",
          section: sectionEl ? idOf(sectionEl) : null,
          inMain: Boolean(target && main?.contains(target)),
          touchesHeader: Boolean(
            target &&
              header &&
              (header.contains(target) || target.contains(header)),
          ),
          targetNotAtRest: target ? restProblems(target).length > 0 : false,
          extraProps: [
            ...new Set(frames.flatMap((f) => Object.keys(f))),
          ].filter((key) => !allowed.includes(key)),
          rise: target
            ? Math.max(0, ...frames.map((f) => riseOf(target, f)))
            : 0,
        };
      });

      const sections: Sec[] = sectionEls.map((s) => {
        const rect = s.getBoundingClientRect();
        const clock = [s, ...s.querySelectorAll("*")].flatMap((el) => {
          const style = getComputedStyle(el);
          const names = style.animationName.split(/,\s*/);
          const timelines = style
            .getPropertyValue("animation-timeline")
            .split(/,\s*(?![^(]*\))/);
          const durations = style.animationDuration.split(/,\s*/);
          return names.flatMap((name, i) => {
            const timeline = timelines[i % timelines.length] ?? "auto";
            const duration = durations[i % durations.length] ?? "0s";
            const onClock =
              name !== "none" &&
              timeline === "auto" &&
              duration !== "auto" &&
              num(duration) > 0;
            return onClock ? [`${label(el)} ${name} ${duration}`] : [];
          });
        });
        const h2 = s.querySelector("h2");
        return {
          id: idOf(s),
          top: rect.top,
          bottom: rect.bottom,
          section: box(s),
          h2: h2 ? box(h2) : { left: 0, top: 0, width: 0, height: 0 },
          notAtRest: [s, ...s.querySelectorAll("*")].flatMap((el) => {
            const why = restProblems(el);
            return why.length ? [`${label(el)} ${why.join(", ")}`] : [];
          }),
          clock,
        };
      });

      // The header's own state, with its ancestors': a faded parent fades the name too.
      const h1 = document.querySelector("main > header h1");
      const headerProblems: string[] = [];
      for (let el: Element | null = h1; el; el = el.parentElement) {
        const why = restProblems(el);
        if (why.length) headerProblems.push(`${label(el)} ${why.join(", ")}`);
      }

      return {
        scrollY,
        vh: innerHeight,
        docHeight: document.documentElement.scrollHeight,
        animations: anims.length,
        sections,
        anims,
        header: { found: Boolean(h1), notAtRest: headerProblems },
      };
    },
    { sectionSelector: SECTION, allowed: [...ALLOWED] },
  );
}

/**
 * Waits until the scroll position has held for a quarter second (many frames), with fonts loaded.
 * It polls from the test, not with requestAnimationFrame or timers in the page: with scripts off
 * those never fire, and the page's own code is not what is under test.
 */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  let still = 0;
  let last = -1;
  for (let i = 0; i < 100 && still < 5; i++) {
    await new Promise((done) => setTimeout(done, 50));
    const y = await page.evaluate(() => scrollY);
    if (y === last) still++;
    else {
      still = 0;
      last = y;
    }
  }
}

async function scrollToSection(page: Page, id: string) {
  await page.evaluate((selector) => {
    document
      .querySelector(selector)
      ?.scrollIntoView({ block: "center", behavior: "instant" });
  }, `section[aria-labelledby="${id}"]`);
  await settle(page);
}

async function scrollToBottom(page: Page) {
  await page.evaluate(() =>
    scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    }),
  );
  await settle(page);
}

async function load(page: Page) {
  await page.goto("/");
  await settle(page);
}

/** The reveal exists: running CSSAnimations on view timelines, in at least one section. */
function viewReveals(snap: Snap) {
  return snap.anims.filter(
    (a) => a.kind === "CSSAnimation" && a.view && a.section !== null,
  );
}

function expectRevealExists(snap: Snap, where: string) {
  expect(
    viewReveals(snap).length,
    `with motion allowed there is a view-timeline CSSAnimation in a section (${where}); without a reveal this check would pass for nothing`,
  ).toBeGreaterThan(0);
}

/** Presses Tab until the focused element matches `selector`, at most `max` times. */
async function tabUntil(page: Page, selector: string, max = 20) {
  for (let presses = 0; presses < max; presses++) {
    await page.keyboard.press("Tab");
    const found = await page.evaluate(
      (sel) => document.activeElement?.matches(sel) ?? false,
      selector,
    );
    if (found) return true;
  }
  return false;
}

const sectionIds = ["experience", "projects", "stack", "education", "contact"];

test("C1. Sections below the fold wait, then arrive", async ({ page }) => {
  await load(page);
  const start = await read(page);
  expect(start.scrollY, "fresh load is at the top").toBe(0);
  const below = start.sections.filter((s) => s.top >= start.vh);
  expect(
    below.length,
    "sections whose top edge is below the fold",
  ).toBeGreaterThan(0);

  for (const s of below) {
    const own = start.anims.filter(
      (a) =>
        a.section === s.id &&
        a.kind === "CSSAnimation" &&
        a.view &&
        a.playState === "running",
    );
    expect(
      own.length,
      `running view-timeline CSSAnimations on ${s.id} or inside it`,
    ).toBeGreaterThan(0);
    expect(
      own.some((a) => a.targetNotAtRest) || s.notAtRest.length > 0,
      `${s.id} is visibly not at rest while below the fold`,
    ).toBe(true);
  }

  for (const s of below) {
    await scrollToSection(page, s.id);
    const now = await read(page);
    const seen = now.sections.find((x) => x.id === s.id);
    expect(seen, `${s.id} exists`).toBeDefined();
    expect(
      (seen?.top ?? -1) >= 0 && (seen?.bottom ?? Infinity) <= now.vh,
      `${s.id} is wholly in the viewport (test setup): ${seen?.top}..${seen?.bottom} of ${now.vh}`,
    ).toBe(true);
    expect(
      seen?.notAtRest,
      `${s.id} elements not at rest once it is wholly in view`,
    ).toEqual([]);
  }
});

test("C2. At rest nothing moved", async ({ page }) => {
  await load(page);
  expectRevealExists(await read(page), "load");
  const moving = new Map<string, { section: Box; h2: Box }>();
  for (const id of sectionIds) {
    await scrollToSection(page, id);
    const now = await read(page);
    const s = now.sections.find((x) => x.id === id);
    if (s) moving.set(id, { section: s.section, h2: s.h2 });
  }
  await scrollToBottom(page);
  const movingHeight = (await read(page)).docHeight;

  await page.emulateMedia({ reducedMotion: "reduce" });
  await load(page);
  const still = await read(page);
  expect(
    still.sections.map((s) => s.id),
    "sections on the page",
  ).toEqual(sectionIds);
  for (const s of still.sections) {
    const was = moving.get(s.id);
    for (const part of ["section", "h2"] as const) {
      for (const key of ["left", "top", "width", "height"] as const) {
        expect(
          Math.abs((was?.[part][key] ?? Number.NaN) - s[part][key]),
          `${s.id} ${part} ${key}: with motion ${was?.[part][key]}, reduced ${s[part][key]}`,
        ).toBeLessThanOrEqual(0.5);
      }
    }
  }
  expect(movingHeight, "document height, motion vs reduced motion").toBe(
    still.docHeight,
  );
});

test("C3. The header never animates", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const where = `${viewport.width} x ${viewport.height}`;
    await page.setViewportSize(viewport);
    await page.goto("/");
    const onLoad = await read(page);
    expectRevealExists(onLoad, where);

    const checkHeader = (snap: Snap, when: string) => {
      expect(snap.header.found, `header h1 exists (${where}, ${when})`).toBe(
        true,
      );
      expect(
        snap.anims
          .filter((a) => a.touchesHeader)
          .map((a) => `${a.kind} ${a.name} on ${a.target}`),
        `animations on the header, inside it or above it (${where}, ${when})`,
      ).toEqual([]);
      expect(
        snap.header.notAtRest,
        `h1 and its ancestors at opacity 1 with no transform (${where}, ${when})`,
      ).toEqual([]);
    };
    checkHeader(onLoad, "on load");
    await settle(page);
    checkHeader(await read(page), "settled");
    // Scrolling away and back must not catch the header in a reveal either.
    await scrollToBottom(page);
    checkHeader(await read(page), "at the bottom");
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await settle(page);
    checkHeader(await read(page), "back at the top");
  }
});

test("C4. Only opacity and transform", async ({ page }) => {
  await load(page);
  const seen: Anim[] = [];
  const clock: string[] = [];
  const collect = async () => {
    const snap = await read(page);
    seen.push(...snap.anims);
    for (const s of snap.sections) clock.push(...s.clock);
  };
  await collect();
  expectRevealExists(await read(page), "load");
  for (const id of sectionIds) {
    await scrollToSection(page, id);
    await collect();
  }
  await scrollToBottom(page);
  await collect();

  const animations = seen.filter((a) => a.kind !== "CSSTransition");
  expect(animations.length, "animations seen while scrolling").toBeGreaterThan(
    0,
  );
  expect(
    animations.flatMap((a) =>
      a.extraProps.map(
        (p) => `${a.name || a.kind} on ${a.target} animates ${p}`,
      ),
    ),
    "keyframe properties other than opacity, transform and translate",
  ).toEqual([]);
  expect(
    Math.max(0, ...animations.map((a) => a.rise)),
    `the largest rise in px (at most ${MAX_RISE_PX})`,
  ).toBeLessThanOrEqual(MAX_RISE_PX + 0.01);
  expect(
    [
      ...new Set([
        ...clock,
        ...animations
          .filter((a) => a.kind === "CSSAnimation" && !a.view && a.inMain)
          .map((a) => `${a.target} ${a.name} runs on the document timeline`),
      ]),
    ],
    "reveals that run on a clock instead of a view timeline",
  ).toEqual([]);
});

test("C5. Reduced motion is still", async ({ page }) => {
  await load(page);
  expectRevealExists(await read(page), "motion allowed");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await load(page);
  expect(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    "reduced motion is on",
  ).toBe(true);
  const stillness = async (when: string) => {
    const snap = await read(page);
    expect(
      snap.anims.map((a) => `${a.kind} ${a.name} on ${a.target}`),
      `document.getAnimations() under reduced motion (${when})`,
    ).toEqual([]);
    expect(
      snap.sections.flatMap((s) => s.notAtRest.map((p) => `${s.id}: ${p}`)),
      `elements not at rest under reduced motion (${when})`,
    ).toEqual([]);
  };
  await stillness("top");
  await scrollToBottom(page);
  await stillness("bottom");
});

test("C6. Unsupported browsers see the static page", async ({ page }) => {
  await load(page);
  const start = await read(page);
  expectRevealExists(start, "load");
  const names = [
    ...new Set(
      viewReveals(start)
        .map((a) => a.name)
        .filter(Boolean),
    ),
  ];
  expect(names.length, "named keyframes the reveal runs").toBeGreaterThan(0);

  const report = await page.evaluate(
    ({ revealNames, sectionSelector }) => {
      const squash = (text: string) => text.replace(/\s+/g, "").toLowerCase();
      const sections = [...document.querySelectorAll(sectionSelector)];
      const shorten = (text: string) => text.replace(/\s+/g, " ").slice(0, 160);
      const named: string[] = [];
      const ungated: string[] = [];
      const hiding: string[] = [];
      const walk = (rules: CSSRuleList, supports: boolean, motion: boolean) => {
        for (const rule of Array.from(rules)) {
          let s = supports;
          let m = motion;
          if (rule instanceof CSSSupportsRule) {
            s = s || squash(rule.conditionText).includes("animation-timeline");
          } else if (rule instanceof CSSMediaRule) {
            m =
              m ||
              squash(rule.conditionText || rule.media.mediaText).includes(
                "prefers-reduced-motion:no-preference",
              );
          }
          if (rule instanceof CSSStyleRule) {
            const text = rule.cssText;
            const reveals =
              text.includes("animation-timeline") ||
              rule.style.getPropertyValue("animation-timeline") !== "" ||
              revealNames.some(
                (name) =>
                  rule.style.animationName.split(/,\s*/).includes(name) ||
                  text.includes(name),
              );
            if (reveals) {
              named.push(shorten(text));
              if (!(s && m))
                ungated.push(
                  `[supports ${s}, no-preference ${m}] ${shorten(text)}`,
                );
            }
            if (!(s && m)) {
              const opacity = rule.style.getPropertyValue("opacity");
              const dims = ["transform", "translate", "scale", "rotate"].filter(
                (p) => {
                  const v = rule.style.getPropertyValue(p);
                  return v !== "" && v !== "none";
                },
              );
              const dims2 = dims.length > 0;
              const dims1 = opacity !== "" && Number.parseFloat(opacity) < 1;
              if (dims1 || dims2) {
                const hits = sections.some((el) => {
                  try {
                    return el.matches(rule.selectorText);
                  } catch {
                    return false;
                  }
                });
                if (hits) hiding.push(shorten(text));
              }
            }
          }
          if ("cssRules" in rule) walk(rule.cssRules as CSSRuleList, s, m);
        }
      };
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          walk(sheet.cssRules, false, false);
        } catch {
          // A cross-origin sheet can't be read; the page ships none.
        }
      }
      const inline = sections
        .filter((el) => {
          const style = (el as HTMLElement).style;
          return (
            (style.opacity !== "" && Number.parseFloat(style.opacity) < 1) ||
            (style.transform !== "" && style.transform !== "none") ||
            (style.translate !== "" && style.translate !== "none")
          );
        })
        .map((el) => el.getAttribute("style") ?? "");
      return { named, ungated, hiding, inline };
    },
    { revealNames: names, sectionSelector: SECTION },
  );

  expect(
    report.named.length,
    "CSS rules that set animation-timeline or run the reveal",
  ).toBeGreaterThan(0);
  expect(
    report.ungated,
    "reveal rules outside @supports (animation-timeline) AND @media (prefers-reduced-motion: no-preference)",
  ).toEqual([]);
  expect(
    [...report.hiding, ...report.inline],
    "rules or inline styles outside that gate that fade or transform a section",
  ).toEqual([]);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("C7. Works without JavaScript", async ({ page }) => {
    await page.goto("/");
    expect(
      await page.evaluate(() => (self as { __next_f?: unknown }).__next_f),
      "page scripts are off (Next's flight data is never set)",
    ).toBeUndefined();
    await settle(page);
    const start = await read(page);
    expectRevealExists(start, "scripts off, at load");
    const contact = start.sections.find((s) => s.id === "contact");
    expect(
      contact?.notAtRest.length ?? 0,
      "Contact waits below the fold even with scripts off",
    ).toBeGreaterThan(0);

    await scrollToBottom(page);
    const end = await read(page);
    expect(
      end.sections.find((s) => s.id === "contact")?.notAtRest,
      "Contact section and its links, scripts off, at the bottom",
    ).toEqual([]);
  });
});

test("C8. Keyboard never lands on something hidden", async ({ page }) => {
  await load(page);
  const start = await read(page);
  expectRevealExists(start, "load");
  expect(
    start.sections.find((s) => s.id === "contact")?.notAtRest.length ?? 0,
    "Contact waits below the fold before the first Tab",
  ).toBeGreaterThan(0);

  expect(
    await tabUntil(page, CONTACT_LINK),
    "Tab reaches the first Contact link",
  ).toBe(true);
  await settle(page);
  const end = await read(page);
  const contact = end.sections.find((s) => s.id === "contact");
  expect(
    contact?.notAtRest,
    "Contact section and links once the scroll settles",
  ).toEqual([]);
  const link = await page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el || el !== document.activeElement) return null;
    let opacity = 1;
    for (let up: Element | null = el; up; up = up.parentElement) {
      opacity *= Number.parseFloat(getComputedStyle(up).opacity);
    }
    const r = el.getBoundingClientRect();
    return {
      opacity,
      inView: r.top >= 0 && r.bottom <= innerHeight,
    };
  }, CONTACT_LINK);
  expect(
    link,
    "the first Contact link is still the focused element",
  ).not.toBeNull();
  expect(
    link?.opacity,
    "the focused link's opacity, with its ancestors'",
  ).toBeCloseTo(1, 3);
  expect(link?.inView, "the focused link is in the viewport").toBe(true);
});
