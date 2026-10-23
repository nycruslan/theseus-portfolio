import { type Browser, expect, type Page, test } from "@playwright/test";
import { CANVAS, canvasFit, FIRST, MODEL, pause, REST, TITLE } from "./model";
import { PLANK_IDS, SEATED } from "./retros";
import { type ModelOptions, openModel } from "./webgl";

// B3.5 (.crew/sprint/25/contract.md, rewritten by .crew/sprint/26/contract.md): without WebGL, in
// forced colours, with Save-Data, in print or with scripts off, the visitor gets today's sheet and
// downloads no 3D, at a desktop's width and a phone's. A viewport's width is no longer an Off path
// (sprint 26): the model runs at every width, on the drawing the page shows. The baseline for "no
// script beyond" is the page with WebGL refused, which the contract makes the definition of Off.
// The 3D chunk is requested on requestIdleCallback after load with a 2,000 ms timeout, so each case
// waits past that before it counts.

/** Past load, the idle callback's 2,000 ms timeout and a margin. */
const IDLE = 3500;

/** What a visitor gets on the sheet, read with page.evaluate alone (it works with scripts off). */
function sheet(page: Page) {
  return page.evaluate(
    ({ title, model, canvas }) => ({
      title: (document.querySelector(title)?.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim(),
      planks: [
        ...document.querySelectorAll("[data-plan] .plan-view [data-plank]"),
      ]
        .filter((p) => p.getClientRects().length > 0)
        .map(
          (p) =>
            `${p.getAttribute("data-plank")}:${p.getAttribute("data-sprint") ?? ""}`,
        ),
      models: document.querySelectorAll(model).length,
      canvases: document.querySelectorAll(canvas).length,
    }),
    { title: TITLE, model: MODEL, canvas: CANVAS },
  );
}

/** Each plank as the oracle seats it, `id:sprint`, in drawing order, for one drawing. */
const ORACLE = PLANK_IDS.map((id) => `${id}:${SEATED[id] ?? ""}`).sort();

/** A desktop and a phone: the model runs at both now, so each Off path is checked at both. */
const SIZES = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const;

test("B3.5 the Off paths download nothing: WebGL refused, forced colours, Save-Data, print and scripts off, at 1440 and at 390, fetch no script beyond the refused page's, request no context but the one probe, draw no canvas and keep the 22 planks and the title block; printing after the model settled hides it and keeps the drawing, the planks and every fact", async ({
  browser,
}) => {
  test.setTimeout(360_000);
  const cases: { name: string; options: ModelOptions; print?: boolean }[] =
    SIZES.flatMap((size) => {
      const at = `at ${size.width} x ${size.height}`;
      return [
        { name: `WebGL refused ${at}`, options: { ...size, refuse: true } },
        {
          name: `forced colours ${at}`,
          options: { ...size, forcedColors: "active" as const },
        },
        { name: `Save-Data ${at}`, options: { ...size, saveData: true } },
        { name: `print media at load ${at}`, options: size, print: true },
        { name: `scripts off ${at}`, options: { ...size, noScript: true } },
      ];
    });
  // The refused page at each width is that width's baseline: it comes first among its cases.
  let baseline: Set<string> | null = null;
  let baseTitle = "";
  for (const { name, options, print } of cases) {
    if (options.refuse) baseline = null;
    const run = await openModel(browser, options);
    if (print) await run.page.emulateMedia({ media: "print" });
    if (options.noScript) {
      await run.page.goto("/");
    } else {
      await run.goto();
    }
    await pause(IDLE);
    const seen = await sheet(run.page);
    const requests = (await run.requests()).map((r) => r.type);
    const scripts = (await run.scripts()).list.map(
      (s) => new URL(s.url).pathname,
    );
    await run.close();
    if (!baseline) {
      baseline = new Set(scripts);
      baseTitle = seen.title;
      expect(
        scripts.length,
        "scripts the WebGL-refused page fetches",
      ).toBeGreaterThan(0);
    }
    const base = baseline;
    expect
      .soft(
        scripts.filter((s) => !base.has(s)),
        `scripts beyond the WebGL-refused page's, ${name}`,
      )
      .toEqual([]);
    // With WebGL refused the one throwaway webgl2 probe may ask, and be answered null; otherwise
    // the site asks for no context at all.
    expect
      .soft(requests, `WebGL or WebGPU context requests, ${name}`)
      .toEqual(options.refuse && requests.length > 0 ? ["webgl2"] : []);
    expect.soft(seen.canvases, `[data-model] canvas, ${name}`).toBe(0);
    expect
      .soft(seen.planks.length, `planks shown, ${name}`)
      .toBe(PLANK_IDS.length);
    expect
      .soft([...seen.planks].sort(), `planks seated by the retros, ${name}`)
      .toEqual(ORACLE);
    expect.soft(seen.title, `the title block, ${name}`).toBe(baseTitle);
  }

  // Printing after the model settled: it isn't displayed, and the drawing prints as on main.
  for (const size of SIZES) {
    const at = `at ${size.width} x ${size.height}`;
    const run = await openModel(browser, size);
    await run.goto();
    await run.waitFor([...REST], FIRST);
    await run.page.emulateMedia({ media: "print" });
    const printed = await run.page.evaluate((model) => {
      const seen = (el: Element | null) =>
        Boolean(
          el?.checkVisibility({
            opacityProperty: true,
            visibilityProperty: true,
          }) && el.getClientRects().length > 0,
        );
      const plan = document.querySelector("[data-plan]");
      const facts = [
        "revisions",
        "work",
        "projects",
        "stack",
        "education",
        "contact",
      ].map((id) => document.querySelector(`section[aria-labelledby="${id}"]`));
      const planks = [...(plan?.querySelectorAll("[data-plank]") ?? [])].filter(
        seen,
      );
      return {
        model: getComputedStyle(document.querySelector(model) ?? document.body)
          .display,
        plan: seen(plan),
        planks: planks.length,
        // On paper the drawing is the record: each seated plank's fill and number print as on main.
        // Unfilled is none, or a colour or opacity that paints nothing: the hollow rule's
        // `fill: transparent` computes to rgba(0, 0, 0, 0), not none.
        unfilled: planks
          .filter((p) => {
            const s = getComputedStyle(p);
            if (s.fill === "none" || s.fill === "transparent") return true;
            const parts = s.fill
              .match(/^rgba?\((.*)\)$/)?.[1]
              ?.split(/[\s,/]+/);
            const alpha = parts?.length === 4 ? Number(parts[3]) : 1;
            return alpha * Number(s.fillOpacity) * Number(s.opacity) === 0;
          })
          .map(
            (p) =>
              `${p.getAttribute("data-plank")} ${getComputedStyle(p).fill}`,
          ),
        numbersHidden: [...(plan?.querySelectorAll(".plan-plank") ?? [])]
          .filter((n) => n.getClientRects().length > 0 && !seen(n))
          .map((n) => (n.textContent ?? "").trim()),
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
    }, MODEL);
    expect
      .soft(
        printed.model,
        `[data-model]'s display in print after it settled ${at}`,
      )
      .toBe("none");
    expect
      .soft(printed.plan, `the drawing in print after the model settled ${at}`)
      .toBe(true);
    expect
      .soft(printed.planks, `planks in print after the model settled ${at}`)
      .toBe(PLANK_IDS.length);
    expect
      .soft(
        printed.unfilled,
        `planks printed unfilled after the model settled ${at}`,
      )
      .toEqual([]);
    expect
      .soft(
        printed.numbersHidden,
        `plank numbers hidden in print after the model settled ${at}`,
      )
      .toEqual([]);
    expect
      .soft(
        printed.header,
        `the title block in print after the model settled ${at}`,
      )
      .toBe(true);
    expect
      .soft(
        printed.hidden,
        `facts hidden in print after the model settled ${at}`,
      )
      .toEqual([]);
    expect.soft(run.errors, `console errors ${at}`).toEqual([]);
    await run.close();
  }
});

/** Narrower than the wide drawing's 768 px, as a tablet turned or a window snapped. */
const NARROW = { width: 700, height: 900 };

/**
 * The drawing as a visitor sees it: each shown plank's fill and alpha, the shown plank numbers and
 * the shown leaders. The hollow rule (notes-iris.md call 5) makes the fills transparent and hides
 * the numbers and leaders, so a leak of it shows in all three.
 */
function drawing(page: Page) {
  return page.evaluate(() => {
    const seen = (el: Element) =>
      el.getClientRects().length > 0 &&
      el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    const plan = document.querySelector("[data-plan]");
    const geometry = (el: Element) =>
      el instanceof SVGGeometryElement
        ? el
        : el.querySelector("path, polygon, rect, polyline, ellipse, circle");
    // A fill paints nothing when it is none, or its colour or opacities make it transparent.
    const alpha = (s: CSSStyleDeclaration) => {
      if (s.fill === "none" || s.fill === "transparent") return 0;
      const parts = s.fill.match(/^rgba?\((.*)\)$/)?.[1]?.split(/[\s,/]+/);
      const a = parts?.length === 4 ? Number(parts[3]) : 1;
      return a * Number(s.fillOpacity) * Number(s.opacity);
    };
    const planks = [...(plan?.querySelectorAll("[data-plank]") ?? [])]
      .filter(seen)
      .map((p) => {
        const g = geometry(p);
        const s = g ? getComputedStyle(g) : null;
        return {
          id: p.getAttribute("data-plank") ?? "",
          fill: s?.fill ?? "",
          alpha: s ? alpha(s) : 0,
        };
      });
    return {
      planks,
      numbers: [...(plan?.querySelectorAll(".plan-plank") ?? [])]
        .filter(seen)
        .map((n) => (n.textContent ?? "").trim())
        .sort(),
      leaders: [...(plan?.querySelectorAll(".ln-leader") ?? [])].filter(seen)
        .length,
    };
  });
}

type Drawing = Awaited<ReturnType<typeof drawing>>;

/**
 * Each shown plank's fill at every `data-state` `[data-model]` takes, read in the mutation's own
 * microtask, before the frame paints: what the visitor sees with that state (`window.__fills`).
 */
function recordFills() {
  const w = window as Window & {
    __fills?: { state: string; fills: Record<string, string> }[];
  };
  const fills: { state: string; fills: Record<string, string> }[] = [];
  w.__fills = fills;
  new MutationObserver(() => {
    const state = document
      .querySelector("[data-model]")
      ?.getAttribute("data-state");
    if (!state || fills.at(-1)?.state === state) return;
    const planks = [
      ...document.querySelectorAll("[data-plan] .plan-view [data-plank]"),
    ].filter((p) => p.getClientRects().length > 0);
    fills.push({
      state,
      fills: Object.fromEntries(
        planks.map((p) => [
          p.getAttribute("data-plank") ?? "",
          getComputedStyle(p).fill,
        ]),
      ),
    });
  }).observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-state"],
  });
}

/** The model left nothing: no canvas and no data-state on `[data-model]`. */
function modelLeft(page: Page) {
  return page.evaluate(
    ({ model, canvas }) => ({
      canvases: document.querySelectorAll(canvas).length,
      state: document.querySelector(model)?.getAttribute("data-state") ?? null,
    }),
    { model: MODEL, canvas: CANVAS },
  );
}

/** The Off page's drawing at the narrow size: what the narrowed page shows until the loft. */
async function offDrawing(browser: Browser) {
  const off = await openModel(browser, { refuse: true, ...NARROW });
  await off.goto();
  const seen = await drawing(off.page);
  await off.close();
  return seen;
}

/** The planks against the Off page's at 700 px: every one shown, filled, in the Off page's fill. */
function expectFilled(
  seen: { id: string; fill: string; alpha?: number }[],
  off: Drawing,
  when: string,
) {
  expect
    .soft(seen.map((p) => p.id).sort(), `planks shown ${when}`)
    .toEqual([...PLANK_IDS].sort());
  expect
    .soft(
      seen
        .filter((p) => p.alpha === 0 || /^(none|transparent)$/.test(p.fill))
        .map((p) => `${p.id} ${p.fill}`),
      `planks with a transparent fill ${when}`,
    )
    .toEqual([]);
  expect
    .soft(
      Object.fromEntries(seen.map((p) => [p.id, p.fill])),
      `each plank's fill ${when}, against the Off page's at 700 px`,
    )
    .toEqual(Object.fromEntries(off.planks.map((p) => [p.id, p.fill])));
}

/** Every state recorded before the first lofting frame, but a rest state, shows the Off fills. */
function expectFilledUntilLofting(
  byState: { state: string; fills: Record<string, string> }[],
  off: Drawing,
) {
  const lofting = byState.findIndex((s) => s.state === "lofting");
  const before = byState.slice(0, lofting < 0 ? byState.length : lofting);
  for (const { state, fills } of before.filter(
    (s) => !REST.includes(s.state),
  )) {
    expectFilled(
      Object.entries(fills).map(([id, fill]) => ({ id, fill })),
      off,
      `at 700 px with data-state ${state}`,
    );
  }
}

test("B3.5 a viewport narrowed from 1440 to 700 px while the 3D chunk downloads lands the model on .plan-narrow: the planks keep the Off page's fills until the first lofting frame, data-state reaches a rest state, and the canvas lies on .plan-narrow's box", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const off = await offDrawing(browser);
  expect(off.planks.length, "planks on the Off page at 700 px").toBe(
    PLANK_IDS.length,
  );
  expect(
    off.planks.filter((p) => p.alpha === 0).map((p) => p.id),
    "the Off page's planks with a transparent fill at 700 px",
  ).toEqual([]);
  const run = await openModel(browser);
  await run.context.addInitScript(recordFills);
  // Hold every script requested after load: the 3D chunk is the loader's import on idle.
  let loaded = false;
  let holding = true;
  run.page.on("load", () => {
    loaded = true;
  });
  const held: { url: string; release: () => Promise<void> }[] = [];
  await run.page.route("**/*", (route) => {
    const request = route.request();
    if (!holding || !loaded || request.resourceType() !== "script") {
      return route.continue();
    }
    held.push({ url: request.url(), release: () => route.continue() });
    return Promise.resolve();
  });
  await run.goto();
  for (let i = 0; i < 100 && held.length === 0; i++) await pause(100);
  expect(
    held.map((h) => new URL(h.url).pathname),
    "scripts requested after load, held",
  ).not.toEqual([]);
  expect(
    (await modelLeft(run.page)).state,
    "[data-model]'s data-state while the chunk is held",
  ).toBeNull();

  await run.page.setViewportSize(NARROW);
  await pause(300);
  const narrowed = await drawing(run.page);
  const before = await modelLeft(run.page);
  expect.soft(before.canvases, "[data-model] canvas at 700 px, held").toBe(0);
  expect
    .soft(before.state, "[data-model]'s data-state at 700 px, held")
    .toBeNull();
  expectFilled(narrowed.planks, off, "at 700 px while the chunk is held");
  expect
    .soft(narrowed.leaders, "leaders shown at 700 px, against the Off page's")
    .toBe(off.leaders);

  holding = false;
  await Promise.all(held.map((h) => h.release()));
  await run.waitFor([...REST], FIRST);
  const fit = await canvasFit(run.page);
  const [cw = 0, ch = 0] = fit.css ?? [];
  const [pw = 0, ph = 0] = fit.plan ?? [];
  const ratio = (fit.buffer?.[0] ?? 0) / (cw || 1);
  expect.soft(fit.drawing, "the drawing shown at 700 px").toBe(".plan-narrow");
  expect
    .soft(
      Math.max(Math.abs(cw - pw), Math.abs(ch - ph)),
      `the canvas's CSS size ${cw} x ${ch} against .plan-narrow's ${pw} x ${ph} (px), at 700`,
    )
    .toBeLessThanOrEqual(1 / ratio + 1e-3);
  expect
    .soft(
      Math.max(
        Math.abs((fit.at?.[0] ?? 0) - (fit.planAt?.[0] ?? -99)),
        Math.abs((fit.at?.[1] ?? 0) - (fit.planAt?.[1] ?? -99)),
      ),
      "the canvas's corner on .plan-narrow's (px), at 700",
    )
    .toBeLessThanOrEqual(1 / ratio + 1e-3);

  // The fills at each state, as the visitor saw them: the Off page's until the first lofting
  // frame, then hollow (the hollow rule, on screen at every width).
  const byState = await run.page.evaluate(
    () =>
      (
        window as Window & {
          __fills?: { state: string; fills: Record<string, string> }[];
        }
      ).__fills ?? [],
  );
  const states = byState.map((s) => s.state);
  expectFilledUntilLofting(byState, off);
  const rested = byState.find((s) => REST.includes(s.state));
  expect(
    rested,
    `a rest state recorded (states: ${states.join(" > ")})`,
  ).toBeDefined();
  expect
    .soft(
      Object.entries(rested?.fills ?? {})
        .filter(([, fill]) => !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(fill))
        .map(([id, fill]) => `${id} ${fill}`),
      `planks still filled under the model at ${rested?.state} (the hollow rule)`,
    )
    .toEqual([]);
  expect.soft(run.errors, "console errors").toEqual([]);
  await run.close();
});
