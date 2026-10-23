import { type Browser, expect, type Page, test } from "@playwright/test";
import { CANVAS, FIRST, MODEL, pause, REST, SHOWN, TITLE } from "./model";
import { PLANK_IDS, SEATED } from "./retros";
import { type ModelOptions, type ModelRun, openModel } from "./webgl";

// Sprint 25, B3.5 (.crew/sprint/25/contract.md): without WebGL, below 1024 px, in forced colours,
// with Save-Data, in print or with scripts off, the visitor gets today's sheet and downloads no
// 3D. The baseline for "no script beyond" is the page with WebGL refused, which the contract makes
// the definition of Off. The 3D chunk is requested on requestIdleCallback after load with a
// 2,000 ms timeout, so each case waits past that before it counts.

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

test("B3.5 the Off paths download nothing: WebGL refused, 1023 px, forced colours, Save-Data, print and scripts off fetch no script beyond the refused page's, request no context but the one probe, draw no canvas and keep the 22 planks and the title block; printing after the model settled hides it and keeps the drawing, the planks and every fact", async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const cases: { name: string; options: ModelOptions; print?: boolean }[] = [
    { name: "WebGL refused", options: { refuse: true } },
    { name: "a 1023 px viewport", options: { width: 1023, height: 768 } },
    { name: "forced colours", options: { forcedColors: "active" } },
    { name: "Save-Data", options: { saveData: true } },
    { name: "print media at load", options: {}, print: true },
    { name: "scripts off", options: { noScript: true } },
  ];
  let baseline: Set<string> | null = null;
  let baseTitle = "";
  for (const { name, options, print } of cases) {
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
  const run = await openModel(browser);
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
      unfilled: planks
        .filter((p) => getComputedStyle(p).fill === "none")
        .map((p) => p.getAttribute("data-plank")),
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
    .soft(printed.model, "[data-model]'s display in print after it settled")
    .toBe("none");
  expect
    .soft(printed.plan, "the drawing in print after the model settled")
    .toBe(true);
  expect
    .soft(printed.planks, "planks in print after the model settled")
    .toBe(PLANK_IDS.length);
  expect
    .soft(printed.unfilled, "planks printed unfilled after the model settled")
    .toEqual([]);
  expect
    .soft(
      printed.numbersHidden,
      "plank numbers hidden in print after the model settled",
    )
    .toEqual([]);
  expect
    .soft(printed.header, "the title block in print after the model settled")
    .toBe(true);
  expect
    .soft(printed.hidden, "facts hidden in print after the model settled")
    .toEqual([]);
  expect.soft(run.errors, "console errors").toEqual([]);
  await run.close();
});

/** Below the wide query, as Lens's review drove it (sprint 25): the wide drawing's band. */
const NARROW = { width: 1000, height: 768 };

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

/** Whether `[data-model]` takes a state within `ms`; the state, or null if it never does. */
const stateWithin = (run: ModelRun, ms: number) =>
  run.waitFor(SHOWN, ms).then(
    (state) => state,
    () => null,
  );

/** The Off page's drawing at the narrow size: what a narrowed visit must still show. */
async function offDrawing(browser: Browser) {
  const off = await openModel(browser, { refuse: true, ...NARROW });
  await off.goto();
  const seen = await drawing(off.page);
  await off.close();
  return seen;
}

/** The narrowed page's drawing against the Off page's, B1.4's reads on both. */
function expectOffSheet(
  left: Awaited<ReturnType<typeof modelLeft>>,
  seen: Awaited<ReturnType<typeof drawing>>,
  off: Awaited<ReturnType<typeof drawing>>,
  when: string,
) {
  const seatedNumbers = Object.values(SEATED)
    .filter((n) => n !== undefined)
    .map(String)
    .sort();
  expect(off.numbers, "the Off page's plank numbers at 1000 px").toEqual(
    seatedNumbers,
  );
  expect.soft(left.canvases, `[data-model] canvas ${when}`).toBe(0);
  expect.soft(left.state, `[data-model]'s data-state ${when}`).toBeNull();
  expect
    .soft(seen.planks.map((p) => p.id).sort(), `planks shown ${when}`)
    .toEqual([...PLANK_IDS].sort());
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
    .soft(seen.numbers, `plank numbers shown ${when}, against the retros`)
    .toEqual(seatedNumbers);
  expect
    .soft(seen.leaders, `leaders shown ${when}, against the Off page's`)
    .toBe(off.leaders);
}

test("B3.5 a viewport narrowed below 1024 px while the 3D chunk downloads keeps the Off sheet at 1000 px: no canvas, no data-state, and the planks filled with their numbers and leaders as the Off page shows them", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const off = await offDrawing(browser);
  const run = await openModel(browser);
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
  holding = false;
  await Promise.all(held.map((h) => h.release()));
  // Long enough for the chunk to arrive and the scene to build and settle unthrottled.
  const state = await stateWithin(run, 10_000);
  expect
    .soft(state, "a state [data-model] took after the narrowing")
    .toBeNull();
  expectOffSheet(
    await modelLeft(run.page),
    await drawing(run.page),
    off,
    "after narrowing to 1000 px during the download",
  );
  expect.soft(run.errors, "console errors").toEqual([]);
  await run.close();
});
