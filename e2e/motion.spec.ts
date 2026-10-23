import AxeBuilder from "@axe-core/playwright";
import { type Browser, expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";
import {
  horizontalOverflow,
  MODES,
  MOTION,
  motionReady,
  SCHEMES,
} from "./helpers";
import {
  type Box,
  box,
  CANVAS,
  type Drawing,
  DURATION,
  drawing,
  drawingAt,
  FIRST,
  FRAME,
  profile as hull,
  MODEL,
  modelCoverage,
  note,
  outlineCoverage,
  pause,
  REST,
  runTo,
  SHOWN,
  whole,
} from "./model";
import { channelDelta, crop, decodePng, edges, hausdorff } from "./pixels";
import { bioParts } from "./retros";
import { type ModelOptions, type ModelRun, openModel } from "./webgl";

// Sprint 27, B3.16 to B3.23 (.crew/sprint/27/contract.md): the Full, Calm and Off control in the
// bar, remembered on the device, with Calm's settled rest, Off's no-3D guarantee and the hints
// setting the default. Written before the build, against the contract's data rules and these hooks
// alone: `[data-motion]` in the bar's nav with `data-mode`, its `[role="group"][aria-label="Motion"]`
// and three `button[aria-pressed]` reading Full, Calm, Off; `localStorage["theseus:motion"]`;
// `[data-model]` and its `data-state`; the Off page's plank fills and numbers. A press is a real
// click at the button's centre (it works with Playwright's clock paused) or a key on the focused
// button; a mode is only ever set by script through localStorage before a load (`stored`).

const KEY = "theseus:motion";
const GROUP = `${MOTION} [role="group"][aria-label="Motion"]`;
const SIZES = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const;
const WIDTHS = [320, 390, 768, 1024, 1440] as const;
/** Past load, the idle callback's 2,000 ms timeout and a margin (B3.5's wait). */
const IDLE = 3500;
/** Two animation frames on the clock: "within 2 frames". */
const TWO_FRAMES = Math.ceil(2 * FRAME);
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];
type Label = (typeof MODES)[number];
const at = (size: { width: number; height: number }) =>
  `at ${size.width} x ${size.height}`;

/** The control as the page shows it: the slot's mode and each button, in DOM order. */
function control(page: Page) {
  return page.evaluate(
    ({ slot, group }) => {
      const el = document.querySelector(slot);
      const buttons = [...document.querySelectorAll(`${group} button`)];
      const text = (b: Element) =>
        (b.textContent ?? "").replace(/\s+/g, " ").trim();
      return {
        slot: el !== null,
        mode: el?.getAttribute("data-mode") ?? null,
        buttons: buttons.map((b) => ({
          text: text(b),
          type: b.getAttribute("type"),
          pressed: b.getAttribute("aria-pressed"),
          disabled: (b as HTMLButtonElement).disabled,
        })),
        pressed: buttons
          .filter((b) => b.getAttribute("aria-pressed") === "true")
          .map(text),
        disabled: buttons
          .filter((b) => (b as HTMLButtonElement).disabled)
          .map(text),
      };
    },
    { slot: MOTION, group: GROUP },
  );
}

/** `localStorage["theseus:motion"]`, or "(throws)". */
function stored(page: Page) {
  return page.evaluate((key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return "(throws)";
    }
  }, KEY);
}

/** A real click at the centre of the button `label`: it needs no animation frame to land. */
async function press(page: Page, label: Label) {
  const centre = await page.evaluate(
    ({ group, label }) => {
      const b = [...document.querySelectorAll(`${group} button`)].find(
        (el) => (el.textContent ?? "").trim() === label,
      );
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    { group: GROUP, label },
  );
  expect(centre, `the ${label} button to press`).not.toBeNull();
  if (centre) await page.mouse.click(centre.x, centre.y);
}

type Count = { state: string | null; frames: number | null };
type CountWindow = Window & { __count?: Count & { armed: boolean } };

/**
 * Arms a count for the next click inside the control, in real time: the state `[data-model]` had
 * when it came, and the animation frames from it until the model is `want` (gone: no data-state
 * and no canvas; settled), up to 10, else -1. Read it back with `counted`.
 */
function armCount(page: Page, want: "gone" | "settled") {
  return page.evaluate(
    ({ want, group }) => {
      const w = window as CountWindow;
      const count = { state: null, frames: null, armed: true } as NonNullable<
        CountWindow["__count"]
      >;
      w.__count = count;
      const met = () => {
        const model = document.querySelector("[data-model]");
        const state = model?.getAttribute("data-state") ?? null;
        return want === "gone"
          ? state === null && !model?.querySelector("canvas")
          : state === "settled";
      };
      window.addEventListener(
        "click",
        (event) => {
          if (!count.armed || !(event.target as Element).closest?.(group)) {
            return;
          }
          count.armed = false;
          count.state =
            document
              .querySelector("[data-model]")
              ?.getAttribute("data-state") ?? null;
          let frame = 0;
          const tick = () => {
            frame++;
            if (met()) count.frames = frame;
            else if (frame >= 10) count.frames = -1;
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        },
        { capture: true },
      );
    },
    { want, group: GROUP },
  );
}

async function counted(page: Page): Promise<Count> {
  for (let i = 0; i < 40; i++) {
    const count = await page.evaluate(
      () => (window as CountWindow).__count ?? null,
    );
    if (count && count.frames !== null) return count;
    await pause(50);
  }
  return (
    (await page.evaluate(() => (window as CountWindow).__count ?? null)) ?? {
      state: "(no press reached the page)",
      frames: null,
    }
  );
}

/** What the model left: canvases in `[data-model]` and its data-state. */
function modelLeft(page: Page) {
  return page.evaluate(
    ({ model, canvas }) => ({
      canvases: document.querySelectorAll(canvas).length,
      state: document.querySelector(model)?.getAttribute("data-state") ?? null,
    }),
    { model: MODEL, canvas: CANVAS },
  );
}

/** States set since `from` (an index into the recorded states). */
async function statesSince(run: ModelRun, from: number) {
  return (await run.states()).slice(from).map((s) => s.state);
}

/** Frames drawn landed or lofting since `from` (an index into the recorded frames). */
async function movingSince(run: ModelRun, from: number) {
  return (await run.frames())
    .slice(from)
    .filter((f) => f.state === "landed" || f.state === "lofting").length;
}

/** Script paths fetched so far. */
async function scriptPaths(run: ModelRun) {
  return (await run.scripts()).list.map((s) => new URL(s.url).pathname);
}

/** The Off page's drawing at a size: the page with WebGL refused, what "whole" means there. */
async function offDrawing(browser: Browser, options: ModelOptions) {
  const off = await openModel(browser, { ...options, refuse: true });
  await off.goto();
  const seen = await drawing(off.page);
  await off.close();
  return seen;
}

/** The drawing against the Off page's: every plank filled as there, its numbers and leaders. */
function expectWhole(seen: Drawing, off: Drawing, when: string) {
  expect
    .soft(
      seen.planks.filter((p) => p.alpha === 0).map((p) => `${p.id} ${p.fill}`),
      `planks with a transparent fill ${when}`,
    )
    .toEqual([]);
  expect
    .soft(
      Object.fromEntries(seen.planks.map((p) => [p.id, p.fill])),
      `each plank's fill ${when}, against the Off page's`,
    )
    .toEqual(Object.fromEntries(off.planks.map((p) => [p.id, p.fill])));
  expect
    .soft(seen.numbers, `plank numbers shown ${when}, against the Off page's`)
    .toEqual(off.numbers);
  expect
    .soft(seen.leaders, `leaders shown ${when}, against the Off page's`)
    .toBe(off.leaders);
}

/** Opens `/` on the clock and holds it at the first `lofting` frame (B3.3's method). */
async function atLofting(run: ModelRun, where: string) {
  await run.goto();
  await motionReady(run.page);
  const first = await run.until(SHOWN, 4, FIRST);
  expect(first, `the model shows first at landed, ${where}`).toBe("landed");
  await run.until(["lofting"], 4, 20_000);
}

/** Off's guarantees after a press (B3.19): checked once the count says the model went. */
async function expectOffAfterPress(
  run: ModelRun,
  off: Drawing,
  when: string,
  frames: number | null,
) {
  expect
    .soft(frames, `animation frames from the press of Off to no model, ${when}`)
    .not.toBeNull();
  expect
    .soft(frames ?? -1, `frames from the press of Off (-1: never), ${when}`)
    .toBeGreaterThanOrEqual(0);
  expect
    .soft(frames ?? 99, `frames from the press of Off to no model, ${when}`)
    .toBeLessThanOrEqual(2);
  const left = await modelLeft(run.page);
  expect.soft(left.state, `data-state after Off, ${when}`).toBeNull();
  expect
    .soft(left.canvases, `canvases in [data-model] after Off, ${when}`)
    .toBe(0);
  expect
    .soft(await run.live(), `live WebGL contexts after Off, ${when}`)
    .toBe(0);
  expect.soft(await stored(run.page), `${KEY} after Off, ${when}`).toBe("off");
  const shown = await control(run.page);
  expect
    .soft(shown.pressed, `the pressed button after Off, ${when}`)
    .toEqual(["Off"]);
  expect.soft(shown.mode, `data-mode after Off, ${when}`).toBe("off");
  // The fills come back as the Off page draws them (a fade may run first, as in B3.15).
  await pause(300);
  expectWhole(await drawing(run.page), off, `after Off, ${when}`);
}

/** The sheet below the bar, the whole page's length, as device pixels. */
async function belowTheBar(page: Page) {
  const top = await page.evaluate(() => {
    const bar = document.querySelector("header:has(nav)");
    return Math.ceil(bar?.getBoundingClientRect().bottom ?? 0);
  });
  const image = decodePng(await page.screenshot({ fullPage: true }));
  return crop(image, 0, top, image.width, image.height - top);
}

/** Layout shifts without recent input, each with its sources (`window.__shifts`). */
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
      w.__shifts?.push(
        `${shift.value.toFixed(5)} at ${shift.startTime.toFixed(0)} ms from ${(
          shift.sources ?? []
        )
          .map((s) =>
            s.node instanceof Element
              ? `<${s.node.tagName.toLowerCase()}${s.node.id ? `#${s.node.id}` : ""}>`
              : "a node",
          )
          .join(", ")}`,
      );
    }
  }).observe({ type: "layout-shift", buffered: true });
}

/**
 * The boxes B3.16 compares with scripts on and off, in document coordinates: the wordmark, every
 * bar link, the h1, the first fact heading and the slot. With page.evaluate alone, which works with
 * scripts off.
 */
function layoutBoxes(page: Page) {
  return page.evaluate((slot) => {
    const squashed = (el: Element) =>
      (el.textContent ?? "").replace(/\s+/g, " ").trim();
    const bar = document.querySelector("header:has(nav)");
    const wordmark = [...(bar?.querySelectorAll("*") ?? [])]
      .filter((el) => squashed(el) === "Theseus")
      .at(-1);
    const named: [string, Element | null | undefined][] = [
      ["the wordmark", wordmark],
      ...[...(bar?.querySelectorAll("nav a") ?? [])].map(
        (a) => [`the bar link ${squashed(a)}`, a] as [string, Element],
      ),
      ["the h1", document.querySelector("main h1")],
      ["the first fact heading", document.getElementById("work")],
      ["the slot", document.querySelector(slot)],
    ];
    return Object.fromEntries(
      named.map(([name, el]) => {
        if (!el) return [name, null];
        const r = el.getBoundingClientRect();
        return [
          name,
          [r.left + scrollX, r.top + scrollY, r.width, r.height].map(
            (v) => Math.round(v * 100) / 100,
          ),
        ];
      }),
    ) as Record<string, number[] | null>;
  }, MOTION);
}

// ---------------------------------------------------------------------------------------------

test("B3.16 the control: at 320, 390, 768, 1024 and 1440 [data-motion] follows the four links in the bar's nav and holds a group named Motion with Full, Calm and Off in order, Full alone pressed, each a target of the width's size inside the viewport, the group right of Read as page at 1440; with scripts off the slot is in the HTML, empty, and the wordmark, bar links, h1, first fact heading and slot sit as with scripts on; no layout shift over load + 2 s with the model loading; no overflow at 320; axe is clean on the bar", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  for (const width of WIDTHS) {
    const where = `at ${width}`;
    const height = width === 390 ? 844 : 900;
    const run = await openModel(browser, { width, height });
    await run.context.addInitScript(recordShifts);
    await run.goto();
    await motionReady(run.page);
    const page = run.page;

    const placed = await page.evaluate(
      ({ slot, group }) => {
        const el = document.querySelector(slot);
        const nav = el?.closest("header nav");
        const links = [...(nav?.querySelectorAll("a") ?? [])];
        const cw = document.documentElement.clientWidth;
        const ch = document.documentElement.clientHeight;
        const read = links
          .find((a) => (a.textContent ?? "").trim() === "Read as page")
          ?.getBoundingClientRect();
        const g = document.querySelector(group)?.getBoundingClientRect();
        return {
          inNav: Boolean(nav),
          links: links.map((a) => (a.textContent ?? "").trim()),
          afterLinks:
            links.length > 0 &&
            links.every((a) =>
              Boolean(
                el &&
                  a.compareDocumentPosition(el) &
                    Node.DOCUMENT_POSITION_FOLLOWING,
              ),
            ),
          groups: el?.querySelectorAll('[role="group"]').length ?? 0,
          readRight: read?.right ?? null,
          groupLeft: g?.left ?? null,
          targets: [...document.querySelectorAll(`${group} button`)].map(
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
              };
            },
          ),
        };
      },
      { slot: MOTION, group: GROUP },
    );
    expect
      .soft(placed.inNav, `[data-motion] inside the bar's nav ${where}`)
      .toBe(true);
    expect
      .soft(placed.links, `the bar's links before the slot ${where}`)
      .toEqual(["Work", "Log", "Contact", "Read as page"]);
    expect
      .soft(placed.afterLinks, `the slot after the four links ${where}`)
      .toBe(true);
    expect.soft(placed.groups, `groups in the slot ${where}`).toBe(1);
    await expect
      .soft(
        page.getByRole("group", { name: "Motion", exact: true }),
        `a group named Motion ${where}`,
      )
      .toHaveCount(1);
    const shown = await control(page);
    expect
      .soft(
        shown.buttons.map((b) => b.text),
        `the group's buttons, in order ${where}`,
      )
      .toEqual([...MODES]);
    expect
      .soft(
        shown.buttons.filter((b) => b.type !== "button").map((b) => b.text),
        `buttons without type="button" ${where}`,
      )
      .toEqual([]);
    expect
      .soft(
        shown.buttons
          .filter((b) => b.pressed !== "true" && b.pressed !== "false")
          .map((b) => `${b.text}: ${b.pressed}`),
        `buttons without aria-pressed true or false ${where}`,
      )
      .toEqual([]);
    expect
      .soft(shown.pressed, `the pressed button by default ${where}`)
      .toEqual(["Full"]);
    expect
      .soft(shown.mode, `the slot's data-mode by default ${where}`)
      .toBe("full");
    await expect
      .soft(
        page.getByRole("button", { name: "Full", exact: true, pressed: true }),
        `Full is a pressed button to assistive tech ${where}`,
      )
      .toHaveCount(1);

    const floor = width < 1024 ? 44 : 24;
    expect
      .soft(placed.targets, `the motion buttons' targets ${where}`)
      .toHaveLength(3);
    expect
      .soft(
        placed.targets.filter(
          (t) => t.width < floor - 0.05 || t.height < floor - 0.05,
        ),
        `motion buttons smaller than ${floor} x ${floor} px ${where}`,
      )
      .toEqual([]);
    expect
      .soft(
        placed.targets.filter((t) => !t.inside).map((t) => t.text),
        `motion buttons not wholly inside the viewport ${where}`,
      )
      .toEqual([]);
    if (width === 1440) {
      expect
        .soft(
          (placed.groupLeft ?? Number.NEGATIVE_INFINITY) -
            (placed.readRight ?? Number.POSITIVE_INFINITY),
          `the group's left (${placed.groupLeft}) past Read as page's right (${placed.readRight}) at 1440`,
        )
        .toBeGreaterThanOrEqual(-0.5);
    }
    if (width === 320) {
      expect
        .soft(await horizontalOverflow(page), "page overflow at 320")
        .toBe(0);
    }

    // No layout shift over load + 2 s, the control's arrival and the model's loading included.
    await pause(2000);
    const shifts = await page.evaluate(
      () => (window as Window & { __shifts?: string[] }).__shifts ?? [],
    );
    expect.soft(shifts, `layout shifts over load + 2 s ${where}`).toEqual([]);
    const on = await layoutBoxes(page);
    expect.soft(run.errors, `console errors ${where}`).toEqual([]);
    await run.close();

    // Scripts off: the slot in the server's HTML, empty, and nothing placed differently.
    const bare = await openModel(browser, { width, height, noScript: true });
    await bare.goto();
    for (
      let i = 0;
      i < 50 &&
      (await bare.page.evaluate(() => document.fonts.status)) !== "loaded";
      i++
    ) {
      await pause(100);
    }
    const empty = await bare.page.evaluate((slot) => {
      const el = document.querySelector(slot);
      return el
        ? {
            elements: el.children.length,
            text: (el.textContent ?? "").trim(),
          }
        : null;
    }, MOTION);
    expect
      .soft(empty, `the slot in the bar's nav with scripts off ${where}`)
      .not.toBeNull();
    expect
      .soft(empty, `the slot's content with scripts off ${where}`)
      .toEqual({ elements: 0, text: "" });
    const off = await layoutBoxes(bare.page);
    await bare.close();
    const moved = Object.keys(on).flatMap((name) => {
      const [a, b] = [on[name], off[name]];
      if (!a || !b)
        return [`${name}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`];
      return a.some((v, i) => Math.abs(v - (b[i] ?? Number.NaN)) > 0.5)
        ? [`${name}: on ${a.join(" ")}, off ${b.join(" ")}`]
        : [];
    });
    expect
      .soft(
        moved,
        `boxes (x y width height) that differ without scripts ${where}`,
      )
      .toEqual([]);
  }

  // axe on the bar, Full pressed and then Calm, in both schemes at a phone's width and a desktop's.
  for (const scheme of SCHEMES) {
    for (const width of [390, 1440]) {
      const run = await openModel(browser, { width, height: 900, scheme });
      await run.goto();
      await motionReady(run.page);
      for (const pressed of ["Full", "Calm"] as const) {
        if (pressed === "Calm") await press(run.page, "Calm");
        await pause(300);
        const results = await new AxeBuilder({ page: run.page })
          .include("header")
          .withTags(AXE_TAGS)
          .analyze();
        expect
          .soft(
            results.violations.map((v) => ({
              rule: v.id,
              targets: v.nodes.map((n) => n.target.join(" ")),
            })),
            `axe on the bar with ${pressed} pressed, ${width} px, ${scheme}`,
          )
          .toEqual([]);
      }
      await run.close();
    }
  }
  note(
    testInfo,
    "B1.1",
    "B1.1's fold at 390 x 844 runs unedited in sheet.spec.ts",
  );
});

test("B3.17 Full: at 1440 and 390 x 844, Calm pressed at rest then Full stores full and replays the loft from frame 1, landed registered on the drawing within B3.1's bound at DPR 1, then lofting, then settled after the duration; Off then Full plays the loft again; Full pressed while Full sets no new landed state", async ({
  browser,
}, testInfo) => {
  test.setTimeout(600_000);
  for (const size of SIZES) {
    const where = at(size);
    const shown = drawingAt(size.width);

    // On the clock: Calm at rest, then Full.
    const run = await openModel(browser, { ...size, clock: true });
    await run.goto();
    await motionReady(run.page);
    await run.until([...REST], 50, FIRST + 30_000);
    await press(run.page, "Calm");
    await pause(150);
    await run.step(200);
    expect
      .soft(await run.state(), `data-state after Calm at rest, ${where}`)
      .toBe("settled");
    const fromStates = (await run.states()).length;
    const fromFrames = (await run.frames()).length;
    await press(run.page, "Full");
    await pause(150);
    const first = await run.until(
      SHOWN.filter((s) => s !== "settled"),
      4,
      20_000,
    );
    expect.soft(first, `the first state after Full, ${where}`).toBe("landed");
    expect
      .soft(await stored(run.page), `${KEY} after Full, ${where}`)
      .toBe("full");
    expect
      .soft(
        (await control(run.page)).pressed,
        `the pressed button after Full, ${where}`,
      )
      .toEqual(["Full"]);
    const firstFrame = (await run.frames())[fromFrames];
    expect
      .soft(firstFrame?.state, `the first frame drawn after Full, ${where}`)
      .toBe("landed");

    // Frame 1 on the drawing: the canvas's silhouette against `.ln-outline` filled (B3.1's measure).
    const planBox = await box(run.page, shown);
    expect(planBox, `${shown}'s box, ${where}`).not.toBeNull();
    const clip = whole(planBox as Box);
    const geometry = await hull(run.page, shown);
    expect(geometry, `the profile's geometry, ${where}`).not.toBeNull();
    const svg = await outlineCoverage(run.page, clip, shown);
    const model = await modelCoverage(run.page, clip);
    const [w, h] = [model.image.width, model.image.height];
    const cut = Math.round((geometry?.limit ?? clip.x + w) - clip.x);
    const distance = hausdorff(
      edges(svg.alpha, w, h),
      edges(model.alpha, w, h),
      w,
      h,
      cut,
    );
    note(
      testInfo,
      "registration",
      `${where}, frame 1 after Full: Hausdorff ${distance.max.toFixed(2)} CSS px (p99 ${distance.p99.toFixed(2)}), bound 1.5 at DPR 1. SwiftShader.`,
    );
    expect
      .soft(
        distance.b,
        `the model's silhouette edge has pixels after Full, ${where}`,
      )
      .toBeGreaterThan(0);
    expect
      .soft(
        distance.max,
        `frame 1 after Full on .ln-outline (Hausdorff, CSS px), ${where}`,
      )
      .toBeLessThanOrEqual(1.5);

    await run.until(["lofting"], 4, 20_000);
    const t0 =
      (await run.states()).slice(fromStates).find((s) => s.state === "lofting")
        ?.t ?? Number.NaN;
    await runTo(run, t0 + DURATION - FRAME);
    await run.until([...REST], 4, 10_000);
    const after = (await run.states()).slice(fromStates);
    const settledAt = after.find((s) => s.state === "settled")?.t ?? Number.NaN;
    expect
      .soft(
        after.map((s) => s.state),
        `states after Full from Calm, ${where}`,
      )
      .toEqual(["landed", "lofting", "settled"]);
    expect
      .soft(
        Math.abs(settledAt - t0 - DURATION),
        `ms from the first lofting frame to settled after Full, against ${DURATION} +/- one frame, ${where}`,
      )
      .toBeLessThanOrEqual(FRAME + 0.5);
    expect
      .soft(run.errors, `console errors, Calm then Full, ${where}`)
      .toEqual([]);
    await run.close();

    // In real time: Off, then Full, then Full again.
    const visit = await openModel(browser, size);
    await visit.goto();
    await motionReady(visit.page);
    await visit.waitFor([...REST], FIRST);
    await armCount(visit.page, "gone");
    await press(visit.page, "Off");
    const went = await counted(visit.page);
    expect
      .soft(went.frames, `frames from Off to no model, ${where}`)
      .not.toBeNull();
    const scripts = (await scriptPaths(visit)).length;
    const since = (await visit.states()).length;
    await press(visit.page, "Full");
    await visit.waitFor(["lofting", ...REST], 20_000);
    await visit.waitFor([...REST], 30_000);
    const replay = await statesSince(visit, since);
    expect
      .soft(replay, `states after Off then Full, ${where}`)
      .toEqual(["landed", "lofting", "settled"]);
    expect
      .soft(
        (await modelLeft(visit.page)).canvases,
        `canvases after Off then Full, ${where}`,
      )
      .toBe(1);
    note(
      testInfo,
      "chunk",
      `${where}: ${(await scriptPaths(visit)).length - scripts} script responses after Full from Off (0 when the module is reused from memory, which the contract allows as "served from cache").`,
    );

    const again = (await visit.states()).length;
    const framesAgain = (await visit.frames()).length;
    await press(visit.page, "Full");
    await pause(1000);
    expect
      .soft(
        await statesSince(visit, again),
        `states after Full pressed while Full, ${where}`,
      )
      .toEqual([]);
    expect
      .soft(
        await movingSince(visit, framesAgain),
        `frames drawn landed or lofting after Full pressed while Full, ${where}`,
      )
      .toBe(0);
    expect
      .soft(
        (await control(visit.page)).pressed,
        `pressed after Full while Full, ${where}`,
      )
      .toEqual(["Full"]);
    expect
      .soft(visit.errors, `console errors, Off then Full, ${where}`)
      .toEqual([]);
    await visit.close();
  }
});

test("B3.18 Calm: at 1440 and 390 x 844, Calm pressed mid-loft settles within 2 frames and stores calm; a reload and a new tab open settled with no landed or lofting state and Calm pressed; at rest 0 frames over 2 s and 1 on a scheme switch; from Off, Calm requests the chunk and opens settled", async ({
  browser,
}) => {
  test.setTimeout(600_000);
  for (const size of SIZES) {
    const where = at(size);

    const run = await openModel(browser, { ...size, clock: true });
    await atLofting(run, `before Calm, ${where}`);
    await press(run.page, "Calm");
    await pause(150);
    await run.step(TWO_FRAMES);
    expect
      .soft(
        await run.state(),
        `Calm mid-loft sets settled within 2 frames, ${where}`,
      )
      .toBe("settled");
    expect
      .soft(await stored(run.page), `${KEY} after Calm, ${where}`)
      .toBe("calm");
    expect
      .soft((await control(run.page)).pressed, `pressed after Calm, ${where}`)
      .toEqual(["Calm"]);
    expect
      .soft(run.errors, `console errors, Calm mid-loft, ${where}`)
      .toEqual([]);
    await run.close();

    // In real time: Calm pressed, then a reload and a new tab, each with its own document.
    const visit = await openModel(browser, size);
    await visit.goto();
    await motionReady(visit.page);
    await visit.waitFor(["lofting", ...REST], FIRST);
    await press(visit.page, "Calm");
    await visit.waitFor([...REST], 10_000);
    const opens = async (page: Page, label: string) => {
      await motionReady(page);
      const end = Date.now() + FIRST;
      let states: string[] = [];
      while (Date.now() < end && !states.includes("settled")) {
        states = await page.evaluate(
          () =>
            (
              window as Window & { __states?: { state: string }[] }
            ).__states?.map((s) => s.state) ?? [],
        );
        await pause(100);
      }
      // Past the 240 ms fade, and a beat more for any late state.
      await pause(1000);
      const final = await page.evaluate(() => ({
        states:
          (window as Window & { __states?: { state: string }[] }).__states?.map(
            (s) => s.state,
          ) ?? [],
        moving:
          (
            window as Window & { __gl?: { frames: { state: string | null }[] } }
          ).__gl?.frames.filter(
            (f) => f.state === "landed" || f.state === "lofting",
          ).length ?? 0,
      }));
      expect
        .soft(final.states, `states after ${label} in Calm, ${where}`)
        .toEqual(["settled"]);
      expect
        .soft(
          final.moving,
          `frames drawn landed or lofting after ${label} in Calm, ${where}`,
        )
        .toBe(0);
      expect
        .soft((await control(page)).pressed, `pressed after ${label}, ${where}`)
        .toEqual(["Calm"]);
    };
    await visit.page.reload();
    await visit.page.evaluate(() => document.fonts.ready);
    await opens(visit.page, "a reload");

    // At rest: nothing drawn, then one frame for a scheme switch.
    await pause(300);
    const f0 = (await visit.frames()).length;
    await pause(2000);
    const f1 = (await visit.frames()).length;
    await visit.page.emulateMedia({ colorScheme: "dark" });
    await pause(800);
    const f2 = (await visit.frames()).length;
    expect
      .soft(f1 - f0, `frames drawn in Calm at rest over 2 s, ${where}`)
      .toBe(0);
    expect
      .soft(f2 - f1, `frames drawn in Calm on a scheme switch, ${where}`)
      .toBe(1);

    const tab = await visit.context.newPage();
    await tab.goto("/");
    await opens(tab, "a new tab");
    await tab.close();
    expect
      .soft(visit.errors, `console errors over the Calm visit, ${where}`)
      .toEqual([]);
    await visit.close();

    // From Off at load: Calm imports the chunk and opens settled.
    const off = await openModel(browser, { ...size, stored: "off" });
    await off.goto();
    await motionReady(off.page);
    await pause(IDLE);
    const before = await scriptPaths(off);
    const since = (await off.states()).length;
    const framesSince = (await off.frames()).length;
    await press(off.page, "Calm");
    await off.waitFor(["settled"], FIRST);
    await pause(1000);
    expect
      .soft(
        await statesSince(off, since),
        `states after Calm from Off, ${where}`,
      )
      .toEqual(["settled"]);
    expect
      .soft(
        await movingSince(off, framesSince),
        `moving frames after Calm from Off, ${where}`,
      )
      .toBe(0);
    const after = await scriptPaths(off);
    expect
      .soft(
        after.filter((s) => !before.includes(s)),
        `scripts requested after Calm from Off, ${where}`,
      )
      .not.toEqual([]);
    expect
      .soft(await stored(off.page), `${KEY} after Calm from Off, ${where}`)
      .toBe("calm");
    expect
      .soft(off.errors, `console errors, Calm from Off, ${where}`)
      .toEqual([]);
    await off.close();
  }
});

test("B3.19 Off: at 1440 and 390 x 844, Off pressed at rest or mid-loft leaves within 2 frames no data-state, no canvas, the Off page's fills and numbers, 0 live contexts and off stored, and requests nothing more; with off stored before load no WebGL context is requested, no script beyond the WebGL-refused page's, Off is pressed and the sheet below the bar is the refused page's to the pixel in both schemes; with WebGL refused and nothing stored Off is pressed, Full and Calm disabled, nothing stored", async ({
  browser,
}, testInfo) => {
  test.setTimeout(600_000);
  for (const size of SIZES) {
    const where = at(size);
    const offPage = await offDrawing(browser, size);
    expect(offPage.planks.length, `planks on the Off page, ${where}`).toBe(22);

    // At rest, in real time.
    const rest = await openModel(browser, size);
    await rest.goto();
    await motionReady(rest.page);
    await rest.waitFor([...REST], FIRST);
    await pause(300);
    await armCount(rest.page, "gone");
    await press(rest.page, "Off");
    const count = await counted(rest.page);
    note(
      testInfo,
      "Off at rest",
      `${where}: pressed at ${count.state}, gone ${count.frames} frames later`,
    );
    await expectOffAfterPress(rest, offPage, `at rest ${where}`, count.frames);
    const scripts = (await scriptPaths(rest)).length;
    const requests = (await rest.requests()).length;
    await pause(IDLE);
    expect
      .soft(
        (await scriptPaths(rest)).length - scripts,
        `scripts requested after Off, ${where}`,
      )
      .toBe(0);
    expect
      .soft(
        (await rest.requests()).length - requests,
        `contexts requested after Off, ${where}`,
      )
      .toBe(0);
    expect
      .soft(rest.errors, `console errors, Off at rest, ${where}`)
      .toEqual([]);
    await rest.close();

    // Mid-loft, on the clock.
    const loft = await openModel(browser, { ...size, clock: true });
    await atLofting(loft, `before Off, ${where}`);
    await press(loft.page, "Off");
    await pause(150);
    await loft.step(TWO_FRAMES);
    const left = await modelLeft(loft.page);
    await expectOffAfterPress(
      loft,
      offPage,
      `mid-loft ${where}`,
      left.state === null && left.canvases === 0 ? 2 : -1,
    );
    expect
      .soft(loft.errors, `console errors, Off mid-loft, ${where}`)
      .toEqual([]);
    await loft.close();

    // `off` stored before load, against the WebGL-refused page, in both schemes.
    for (const scheme of SCHEMES) {
      const refused = await openModel(browser, {
        ...size,
        scheme,
        refuse: true,
      });
      await refused.goto();
      await motionReady(refused.page);
      await pause(IDLE);
      const base = new Set(await scriptPaths(refused));
      const baseView = await belowTheBar(refused.page);
      await refused.close();

      const off = await openModel(browser, { ...size, scheme, stored: "off" });
      await off.goto();
      await motionReady(off.page);
      await pause(IDLE);
      const shown = await control(off.page);
      expect
        .soft(
          (await off.requests()).map((r) => r.type),
          `WebGL or WebGPU context requests with off stored, ${scheme}, ${where}`,
        )
        .toEqual([]);
      expect
        .soft(
          (await scriptPaths(off)).filter((s) => !base.has(s)),
          `scripts beyond the WebGL-refused page's with off stored, ${scheme}, ${where}`,
        )
        .toEqual([]);
      expect
        .soft(shown.pressed, `pressed with off stored, ${scheme}, ${where}`)
        .toEqual(["Off"]);
      expect
        .soft(shown.mode, `data-mode with off stored, ${scheme}, ${where}`)
        .toBe("off");
      expect
        .soft(
          (await modelLeft(off.page)).canvases,
          `canvases with off stored, ${scheme}, ${where}`,
        )
        .toBe(0);
      const view = await belowTheBar(off.page);
      expect
        .soft(
          [view.width, view.height],
          `the sheet below the bar's size with off stored, against the refused page's, ${scheme}, ${where}`,
        )
        .toEqual([baseView.width, baseView.height]);
      if (view.width === baseView.width && view.height === baseView.height) {
        expect
          .soft(
            channelDelta(view, baseView).filter((d) => d > 0).length,
            `pixels below the bar that differ from the refused page's with off stored, ${scheme}, ${where}`,
          )
          .toBe(0);
      }
      expect
        .soft(off.errors, `console errors with off stored, ${scheme}, ${where}`)
        .toEqual([]);
      await off.close();
    }

    // WebGL refused, nothing stored: Off shown, the others disabled, nothing stored.
    const none = await openModel(browser, { ...size, refuse: true });
    await none.goto();
    await motionReady(none.page);
    await pause(IDLE);
    const refusedControl = await control(none.page);
    expect
      .soft(refusedControl.pressed, `pressed with WebGL refused, ${where}`)
      .toEqual(["Off"]);
    expect
      .soft(refusedControl.disabled, `disabled with WebGL refused, ${where}`)
      .toEqual(["Full", "Calm"]);
    expect
      .soft(await stored(none.page), `${KEY} with WebGL refused, ${where}`)
      .toBeNull();
    expect
      .soft(none.errors, `console errors with WebGL refused, ${where}`)
      .toEqual([]);
    await none.close();
  }
});

test("B3.20 storage: at 1440 each mode survives a reload and a new tab; with localStorage throwing on getItem and setItem the default is Full (Calm under reduce) with no error, and a press still switches the mode for the visit, Off tearing down and Full playing", async ({
  browser,
}) => {
  test.setTimeout(600_000);
  const size = SIZES[0];
  // A press of the mode already pressed does nothing, so Full is reached from Calm.
  const routes: Record<string, Label[]> = {
    full: ["Calm", "Full"],
    calm: ["Calm"],
    off: ["Off"],
  };
  for (const [mode, presses] of Object.entries(routes)) {
    const run = await openModel(browser, size);
    await run.goto();
    await motionReady(run.page);
    await run.waitFor(["lofting", ...REST], FIRST);
    for (const label of presses) {
      await press(run.page, label);
      await pause(300);
    }
    const label = presses.at(-1) ?? "Full";
    expect
      .soft(await stored(run.page), `${KEY} after pressing ${label}`)
      .toBe(mode);
    await run.page.reload();
    await motionReady(run.page);
    const reloaded = await control(run.page);
    expect
      .soft(reloaded.pressed, `pressed after a reload in ${mode}`)
      .toEqual([label]);
    expect
      .soft(reloaded.mode, `data-mode after a reload in ${mode}`)
      .toBe(mode);
    const tab = await run.context.newPage();
    await tab.goto("/");
    await motionReady(tab);
    const tabbed = await control(tab);
    expect
      .soft(tabbed.pressed, `pressed in a new tab in ${mode}`)
      .toEqual([label]);
    expect.soft(tabbed.mode, `data-mode in a new tab in ${mode}`).toBe(mode);
    await tab.close();
    expect.soft(run.errors, `console errors, ${mode} stored`).toEqual([]);
    await run.close();
  }

  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const where = `with localStorage throwing, ${reducedMotion}`;
    const run = await openModel(browser, {
      ...size,
      reducedMotion,
      throwingLocalStorage: true,
    });
    await run.goto();
    await motionReady(run.page);
    expect(
      await stored(run.page),
      `localStorage throws (the harness), ${where}`,
    ).toBe("(throws)");
    const first = await control(run.page);
    expect
      .soft(first.pressed, `the default ${where}`)
      .toEqual([reducedMotion === "reduce" ? "Calm" : "Full"]);
    await run.waitFor([...REST], FIRST);
    await armCount(run.page, "gone");
    await press(run.page, "Off");
    const went = await counted(run.page);
    expect
      .soft(went.frames, `frames from Off to no model, ${where}`)
      .not.toBeNull();
    expect
      .soft(
        (await modelLeft(run.page)).canvases,
        `canvases after Off, ${where}`,
      )
      .toBe(0);
    expect
      .soft((await control(run.page)).pressed, `pressed after Off, ${where}`)
      .toEqual(["Off"]);
    const since = (await run.states()).length;
    await press(run.page, "Full");
    await run.waitFor(["lofting", ...REST], 20_000);
    await run.waitFor([...REST], 30_000);
    expect
      .soft(await statesSince(run, since), `states after Full, ${where}`)
      .toEqual(["landed", "lofting", "settled"]);
    expect
      .soft((await control(run.page)).pressed, `pressed after Full, ${where}`)
      .toEqual(["Full"]);
    expect.soft(run.errors, `console and page errors, ${where}`).toEqual([]);
    await run.close();
  }
});

test("B3.21 reduced motion and the default: at 1440 and 390 x 844, reduce with nothing stored opens Calm, settled; full stored plays the loft under reduce; reduce switched on mid-loft with nothing stored settles within 2 frames and presses Calm, and switched off again presses Full with no loft; Save-Data with nothing stored presses Off and downloads nothing; Save-Data with full stored plays the loft", async ({
  browser,
}) => {
  test.setTimeout(600_000);
  for (const size of SIZES) {
    const where = at(size);

    const calm = await openModel(browser, { ...size, reducedMotion: "reduce" });
    await calm.goto();
    await motionReady(calm.page);
    await calm.waitFor(["settled"], FIRST);
    await pause(1000);
    expect
      .soft(
        (await control(calm.page)).pressed,
        `pressed under reduce, nothing stored, ${where}`,
      )
      .toEqual(["Calm"]);
    expect
      .soft(
        await statesSince(calm, 0),
        `states under reduce, nothing stored, ${where}`,
      )
      .toEqual(["settled"]);
    expect
      .soft(await stored(calm.page), `${KEY} under reduce, ${where}`)
      .toBeNull();
    await calm.close();

    const full = await openModel(browser, {
      ...size,
      reducedMotion: "reduce",
      stored: "full",
    });
    await full.goto();
    await motionReady(full.page);
    await full.waitFor([...REST], FIRST);
    expect
      .soft(
        (await control(full.page)).pressed,
        `pressed under reduce, full stored, ${where}`,
      )
      .toEqual(["Full"]);
    expect
      .soft(
        await statesSince(full, 0),
        `states under reduce, full stored, ${where}`,
      )
      .toContain("lofting");
    await full.close();

    // The hint switched on and off mid-visit, nothing stored, on the clock.
    const live = await openModel(browser, { ...size, clock: true });
    await atLofting(live, `before reduce, ${where}`);
    await live.page.emulateMedia({ reducedMotion: "reduce" });
    await pause(150);
    await live.step(TWO_FRAMES);
    expect
      .soft(
        await live.state(),
        `reduce switched on mid-loft settles within 2 frames, ${where}`,
      )
      .toBe("settled");
    expect
      .soft(
        (await control(live.page)).pressed,
        `pressed after reduce switched on, ${where}`,
      )
      .toEqual(["Calm"]);
    expect
      .soft(await stored(live.page), `${KEY} after the hint, ${where}`)
      .toBeNull();
    const since = (await live.states()).length;
    const framesSince = (await live.frames()).length;
    await live.page.emulateMedia({ reducedMotion: "no-preference" });
    await pause(150);
    await live.step(1000);
    expect
      .soft(
        (await control(live.page)).pressed,
        `pressed after reduce switched off, ${where}`,
      )
      .toEqual(["Full"]);
    expect
      .soft(
        await live.state(),
        `data-state after reduce switched off, ${where}`,
      )
      .toBe("settled");
    expect
      .soft(
        (await statesSince(live, since)).filter(
          (s) => s === "landed" || s === "lofting",
        ),
        `landed or lofting after reduce switched off, ${where}`,
      )
      .toEqual([]);
    expect
      .soft(
        await movingSince(live, framesSince),
        `moving frames after reduce switched off, ${where}`,
      )
      .toBe(0);
    expect
      .soft(live.errors, `console errors over the hint's switches, ${where}`)
      .toEqual([]);
    await live.close();

    // Save-Data, against the WebGL-refused page's scripts.
    const refused = await openModel(browser, { ...size, refuse: true });
    await refused.goto();
    await pause(IDLE);
    const base = new Set(await scriptPaths(refused));
    await refused.close();
    const saving = await openModel(browser, { ...size, saveData: true });
    await saving.goto();
    await motionReady(saving.page);
    await pause(IDLE);
    expect
      .soft(
        (await control(saving.page)).pressed,
        `pressed with Save-Data, nothing stored, ${where}`,
      )
      .toEqual(["Off"]);
    expect
      .soft(
        (await saving.requests()).map((r) => r.type),
        `context requests with Save-Data, ${where}`,
      )
      .toEqual([]);
    expect
      .soft(
        (await scriptPaths(saving)).filter((s) => !base.has(s)),
        `scripts beyond the refused page's with Save-Data, ${where}`,
      )
      .toEqual([]);
    await saving.close();

    const asked = await openModel(browser, {
      ...size,
      saveData: true,
      stored: "full",
    });
    await asked.goto();
    await motionReady(asked.page);
    await asked.waitFor([...REST], FIRST);
    expect
      .soft(
        (await control(asked.page)).pressed,
        `pressed with Save-Data, full stored, ${where}`,
      )
      .toEqual(["Full"]);
    expect
      .soft(
        await statesSince(asked, 0),
        `states with Save-Data, full stored, ${where}`,
      )
      .toContain("lofting");
    expect
      .soft(
        asked.errors,
        `console errors with Save-Data, full stored, ${where}`,
      )
      .toEqual([]);
    await asked.close();
  }
});

test("B3.22 forced colours and the keyboard: at 1440 and 390 in forced colours, Tab reaches Full, Calm and Off in order after Read as page, each focused button shows exactly one ring, the pressed button's border or outline differs from the others', and Space and Enter press", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const origin = new URL(baseURL ?? "http://localhost").origin;
  for (const size of SIZES) {
    const where = at(size);
    const run = await openModel(browser, { ...size, forcedColors: "active" });
    // A key that lands on a link instead of a button fails here rather than leaving the site.
    await run.page.route(
      (url) => url.origin !== origin,
      (route) => route.abort(),
    );
    await run.goto();
    await motionReady(run.page);
    const page = run.page;
    expect(
      await page.evaluate(() => matchMedia("(forced-colors: active)").matches),
      "forced colours are on",
    ).toBe(true);

    // At rest, nothing focused: the pressed button's edges against each other button's.
    const edgesOf = () =>
      page.evaluate((group) => {
        (document.activeElement as HTMLElement | null)?.blur?.();
        return [...document.querySelectorAll(`${group} button`)].map((b) => {
          const s = getComputedStyle(b);
          return {
            text: (b.textContent ?? "").trim(),
            pressed: b.getAttribute("aria-pressed") === "true",
            look: [
              ...["Top", "Right", "Bottom", "Left"].map(
                (side) =>
                  `${s.getPropertyValue(`border-${side.toLowerCase()}-style`)} ${s.getPropertyValue(`border-${side.toLowerCase()}-width`)} ${s.getPropertyValue(`border-${side.toLowerCase()}-color`)}`,
              ),
              `outline ${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} ${s.outlineOffset}`,
            ].join(" | "),
          };
        });
      }, GROUP);
    const looks = await edgesOf();
    const pressedLook = looks.find((l) => l.pressed);
    expect
      .soft(pressedLook?.text, `the pressed button in forced colours, ${where}`)
      .toBe("Full");
    expect
      .soft(
        looks
          .filter((l) => !l.pressed && l.look === pressedLook?.look)
          .map((l) => `${l.text}: ${l.look}`),
        `unpressed buttons whose border and outline match the pressed one's (${pressedLook?.look}), ${where}`,
      )
      .toEqual([]);
    expect
      .soft(looks, `the motion buttons in forced colours, ${where}`)
      .toHaveLength(3);

    // The Tab order after Read as page, one ring at each button.
    const stops: string[] = [];
    const problems: string[] = [];
    let reached = false;
    for (let presses = 0; presses < 8 && !reached; presses++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(
        () => document.activeElement?.getAttribute("href") === "/read",
      );
    }
    expect.soft(reached, `Tab reaches Read as page, ${where}`).toBe(true);
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("Tab");
      await pause(250);
      const stop = await page.evaluate((group) => {
        const el = document.activeElement;
        if (!el?.matches(`${group} button`)) {
          return {
            name: el?.getAttribute("href") ?? `<${el?.tagName.toLowerCase()}>`,
            rings: [] as string[],
          };
        }
        const chain: Element[] = [...el.querySelectorAll("*")];
        for (
          let a: Element | null = el;
          a && a !== document.body;
          a = a.parentElement
        ) {
          chain.push(a);
        }
        return {
          name: (el.textContent ?? "").trim(),
          rings: chain
            .filter((c) => {
              const s = getComputedStyle(c);
              return (
                s.outlineStyle !== "none" &&
                Number.parseFloat(s.outlineWidth) > 0
              );
            })
            .map((c) => c.tagName.toLowerCase()),
        };
      }, GROUP);
      stops.push(stop.name);
      if (stop.rings.length !== 1) {
        problems.push(
          `${stop.name}: ${stop.rings.length} rings (${stop.rings.join(", ")})`,
        );
      }
    }
    expect
      .soft(stops, `the three Tab stops after Read as page, ${where}`)
      .toEqual([...MODES]);
    expect
      .soft(problems, `focused buttons without exactly one ring, ${where}`)
      .toEqual([]);

    // Space on Calm, then Enter on Off.
    await page.keyboard.press("Shift+Tab");
    const calmFocused = await page.evaluate(() =>
      (document.activeElement?.textContent ?? "").trim(),
    );
    expect
      .soft(calmFocused, `Shift+Tab from Off focuses, ${where}`)
      .toBe("Calm");
    await page.keyboard.press("Space");
    await pause(300);
    expect
      .soft(
        (await control(page)).pressed,
        `pressed after Space on Calm, ${where}`,
      )
      .toEqual(["Calm"]);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await pause(300);
    expect
      .soft(
        (await control(page)).pressed,
        `pressed after Enter on Off, ${where}`,
      )
      .toEqual(["Off"]);
    expect
      .soft(await stored(page), `${KEY} after Enter on Off, ${where}`)
      .toBe("off");
    expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
    await run.close();
  }
});

test("B3.23 the fallback face: with every .woff2 request aborted, at 320 and 390 in both schemes, the bar's four links share one row, each label on one line, the page doesn't scroll sideways, and at 390 x 844 B1.1's items are in the first viewport", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const [bio1 = "", bio2 = ""] = bioParts(profile.bio);
  for (const scheme of SCHEMES) {
    for (const [width, height] of [
      [320, 568],
      [390, 844],
    ] as const) {
      const where = `at ${width} x ${height}, ${scheme}, fonts refused`;
      const run = await openModel(browser, { width, height, scheme });
      const refused: string[] = [];
      await run.page.route(/\.woff2(\?|$)/, (route) => {
        refused.push(route.request().url());
        return route.abort();
      });
      await run.goto();
      await motionReady(run.page);
      expect(
        refused.length,
        `woff2 requests aborted, ${where}`,
      ).toBeGreaterThan(0);
      const bar = await run.page.evaluate(() => {
        const links = [...document.querySelectorAll("header nav a")];
        const range = document.createRange();
        return links.map((a) => {
          range.selectNodeContents(a);
          const lines = new Set(
            [...range.getClientRects()]
              .filter((r) => r.width > 0)
              .map((r) => Math.round(r.top)),
          );
          return {
            text: (a.textContent ?? "").trim(),
            top: a.getBoundingClientRect().top,
            lines: lines.size,
          };
        });
      });
      expect
        .soft(
          bar.map((l) => l.text),
          `the bar's links, ${where}`,
        )
        .toEqual(["Work", "Log", "Contact", "Read as page"]);
      const tops = bar.map((l) => l.top);
      expect
        .soft(
          Math.max(...tops) - Math.min(...tops),
          `the spread of the bar links' tops (${tops.join(", ")}), ${where}`,
        )
        .toBeLessThanOrEqual(0.5);
      expect
        .soft(
          bar
            .filter((l) => l.lines !== 1)
            .map((l) => `${l.text}: ${l.lines} lines`),
          `bar labels not on one line, ${where}`,
        )
        .toEqual([]);
      expect
        .soft(
          await run.page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          ),
          `scrollWidth past clientWidth, ${where}`,
        )
        .toBe(0);

      if (width === 390) {
        const outside = await run.page.evaluate(
          ({ texts, links }) => {
            const squashed = (el: Element) =>
              (el.textContent ?? "").replace(/\s+/g, " ").trim();
            const header = document.querySelector("main > header");
            const holding = (phrase: string) =>
              [...(header?.querySelectorAll("*") ?? [])]
                .filter((el) => squashed(el).includes(phrase))
                .at(-1) ?? null;
            const items: [string, Element | null][] = [
              ["the h1", header?.querySelector("h1") ?? null],
              ...texts.map(
                (t) =>
                  [`"${t.slice(0, 40)}"`, holding(t)] as [
                    string,
                    Element | null,
                  ],
              ),
              ...links.map(
                (href) =>
                  [
                    `the title block's link to ${href}`,
                    header?.querySelector(`a[href="${href}"]`) ?? null,
                  ] as [string, Element | null],
              ),
            ];
            const vw = document.documentElement.clientWidth;
            return items
              .filter(([, el]) => {
                if (!el) return true;
                const r = el.getBoundingClientRect();
                return !(
                  r.left >= -0.5 &&
                  r.top >= -0.5 &&
                  r.right <= vw + 0.5 &&
                  r.bottom <= innerHeight + 0.5
                );
              })
              .map(
                ([what, el]) =>
                  `${what}: ${JSON.stringify(el?.getBoundingClientRect() ?? null)}`,
              );
          },
          {
            texts: [profile.headline, `${bio1} ${bio2}`],
            links: profile.links.map((link) => link.href),
          },
        );
        expect
          .soft(outside, `B1.1's items outside the first viewport, ${where}`)
          .toEqual([]);
      }
      expect
        .soft(
          run.errors.filter(
            (e) => !/woff2|net::ERR_FAILED|Failed to load resource/.test(e),
          ),
          `console errors but the refused fonts, ${where}`,
        )
        .toEqual([]);
      await run.close();
    }
  }
});
