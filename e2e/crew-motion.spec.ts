import { expect, test } from "@playwright/test";
import { MOVE, openCrewModel, pressMode, rested, svgBox } from "./crew-model";
import { markVisit, sinceMark } from "./ghost";
import { FIRST, FRAME, note, pause, REST, runTo, SHOWN } from "./model";
import type { ModelOptions } from "./webgl";

// Sprint 36, B4.38 (.crew/sprint/36/contract.md, with decision 7): Full, Calm and reduced motion on
// /crew, once a visit, on B3's harness against the suite's default server. It needs no fixture
// site, so it runs on the plain `test` with the suite's bulk (decision 10: in crew-model.spec.ts
// it waited for the feed specs' tail); its body is as it was there.

const SWIFTSHADER =
  "SwiftShader, headless Chromium's software WebGL: a floor, not a GPU's number";
const SIZES = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];
/** Two animation frames on the clock: "within 2 frames". */
const TWO_FRAMES = Math.ceil(2 * FRAME);

test("B4.38 Full, Calm and reduced motion, once a visit: Full moves from frame 1 and settles 1.8 s +/- one frame on the clock; a reload and a Back from / open settled with one live context, a new tab plays the move; a key, a click, a wheel, a tap and a scroll each settle it within 2 frames; Full from Calm or Off replays it; Calm stored or reduce with nothing stored never set landed or moving; Calm mid-move settles within 2 frames and stores calm; under reduce the fade is /'s, opacity, fill and visibility with nothing moving (decision 7), ending within 300 ms", async ({
  browser,
}, testInfo) => {
  test.setTimeout(420_000);
  for (const size of SIZES) {
    const where = `/crew at ${size.width} x ${size.height}`;
    // The move on the clock, then each input in a replay.
    const run = await openCrewModel(browser, {
      ...size,
      touch: true,
      clock: true,
    });
    await run.goto("/crew");
    expect(
      await run.until(SHOWN, 4, FIRST),
      `frame 1 is landed, ${where}`,
    ).toBe("landed");
    await run.until(["lofting"], 4, 20_000);
    const t0 =
      (await run.states()).find((s) => s.state === "lofting")?.t ?? Number.NaN;
    await runTo(run, t0 + MOVE - FRAME);
    await run.until([...REST], 4, 10_000);
    const settledAt =
      (await run.states()).find((s) => s.state === "settled")?.t ?? Number.NaN;
    const moving = (await run.frames()).filter(
      (f) => f.state === "landed" || f.state === "lofting",
    );
    note(
      testInfo,
      "move",
      `${where}: settled ${(settledAt - t0).toFixed(1)} ms after the first lofting frame, ${moving.length} moving frames. ${SWIFTSHADER}.`,
    );
    expect.soft(moving.length, `moving frames, ${where}`).toBeGreaterThan(1);
    expect
      .soft(
        Math.abs(settledAt - t0 - MOVE),
        `ms from the first moving frame to settled, against ${MOVE} +/- one frame, ${where}`,
      )
      .toBeLessThanOrEqual(FRAME + 0.5);
    const middle = async () => {
      const b = await svgBox(run.page);
      return {
        x: (b?.x ?? 0) + (b?.width ?? 0) / 2,
        y: (b?.y ?? 0) + (b?.height ?? 0) / 2,
      };
    };
    const replay = async (from: "Calm" | "Off") => {
      await run.page.evaluate(() => {
        scrollTo(0, 0);
        (document.activeElement as HTMLElement | null)?.blur();
      });
      await pressMode(run.page, from);
      await run.step(from === "Off" ? 500 : 100);
      const drawn = (await run.frames()).length;
      await pressMode(run.page, "Full");
      await run.until(["lofting"], 4, FIRST);
      expect
        .soft(
          (await run.frames())[drawn]?.state,
          `the first frame after Full pressed from ${from}, ${where}`,
        )
        .toBe("landed");
    };
    const inputs: [string, () => Promise<unknown>][] = [
      ["a key (Tab)", () => run.page.keyboard.press("Tab")],
      [
        "a click on the hull",
        async () => {
          const at = await middle();
          await run.page.mouse.click(at.x, at.y);
        },
      ],
      [
        "a wheel over the hull",
        async () => {
          const at = await middle();
          await run.page.mouse.move(at.x, at.y);
          await run.page.mouse.wheel(0, 120);
        },
      ],
      [
        "a tap on the hull",
        async () => {
          const at = await middle();
          await run.page.touchscreen.tap(at.x, at.y);
        },
      ],
      [
        "a scroll",
        // /crew can fit a 1440 x 900 screen: a spacer after main gives it room to scroll, as a
        // longer panel would.
        () =>
          run.page.evaluate(() => {
            if (document.documentElement.scrollHeight <= innerHeight + 60) {
              const spacer = document.createElement("div");
              spacer.style.height = "200px";
              document.body.append(spacer);
            }
            scrollTo(0, 60);
          }),
      ],
    ];
    for (const [name, act] of inputs) {
      await replay("Calm");
      await act();
      await pause(150);
      await run.step(TWO_FRAMES);
      expect
        .soft(
          await run.state(),
          `${name} during the move settles it within 2 frames, ${where}`,
        )
        .toBe("settled");
      await run.step(300);
    }
    await replay("Off");
    // Calm pressed mid-move.
    await pressMode(run.page, "Calm");
    await pause(150);
    await run.step(TWO_FRAMES);
    expect
      .soft(
        [
          await run.state(),
          await run.page.evaluate(() => localStorage.getItem("theseus:motion")),
        ],
        `Calm pressed mid-move: settled within 2 frames, and calm stored, ${where}`,
      )
      .toEqual(["settled", "calm"]);
    expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
    await run.close();

    // Once a visit, in real time.
    const visit = await openCrewModel(browser, size);
    await rested(visit, "/crew");
    // The move played: its frame 1 (landed) or a moving frame. In real time on CI's SwiftShader the
    // first visit went landed then settled with no lofting frame between (run 41199003978): the
    // move began and the slow device cut it short. The clock run above holds its frames and length.
    const movingStates = (states: string[]) =>
      states.filter((s) => s === "landed" || s === "lofting");
    expect
      .soft(
        movingStates((await visit.states()).map((s) => s.state)).length,
        `landed or lofting states on the first visit, which plays the move, ${where}`,
      )
      .toBeGreaterThan(0);
    for (const [label, go] of [
      ["a reload", () => visit.page.reload()],
      [
        "Back from /",
        async () => {
          await visit.page.goto("/");
          await visit.waitFor([...REST], FIRST);
          await markVisit(visit.page);
          await visit.page.goBack();
          await visit.page.waitForURL((u) => u.pathname === "/crew");
        },
      ],
    ] as const) {
      await markVisit(visit.page);
      await go();
      await visit.waitFor([...REST], FIRST);
      await pause(300);
      const since = await sinceMark(visit.page);
      expect
        .soft(
          {
            state: await visit.state(),
            moving: since.states.filter(
              (s) => s === "landed" || s === "lofting",
            ),
            live: await visit.live(),
          },
          `${label} opens settled, with no moving state and one live context, ${where}`,
        )
        .toEqual({ state: "settled", moving: [], live: 1 });
    }
    const tab = await visit.context.newPage();
    await tab.goto("/crew");
    const end = Date.now() + FIRST;
    let seen: string[] = [];
    while (Date.now() < end && !seen.some((s) => REST.includes(s))) {
      seen = await tab.evaluate(
        () =>
          (window as Window & { __states?: { state: string }[] }).__states?.map(
            (s) => s.state,
          ) ?? [],
      );
      await pause(100);
    }
    expect
      .soft(
        movingStates(seen).length,
        `landed or lofting states in a new tab, which plays the move again, ${where}`,
      )
      .toBeGreaterThan(0);
    expect
      .soft(visit.errors, `console errors over the visit, ${where}`)
      .toEqual([]);
    await visit.close();

    // Calm stored, and reduce with nothing stored.
    for (const [label, options] of [
      ["Calm stored", { stored: "calm" }],
      ["reduce with nothing stored", { reducedMotion: "reduce" }],
    ] as [string, ModelOptions][]) {
      const at = `${label}, ${where}`;
      const quiet = await openCrewModel(browser, { ...size, ...options });
      await quiet.context.addInitScript(() => {
        // The fade: transitions in the drawing and the model layer (the panel's own, a dot's or a
        // button's, aren't the model's fade).
        const list: { property: string; end: number; target: string }[] = [];
        (window as Window & { __runs?: typeof list }).__runs = list;
        addEventListener(
          "transitionrun",
          (event) => {
            const e = event as TransitionEvent;
            const el = e.target as Element | null;
            if (!el?.closest?.("[data-plan], [data-model]")) return;
            const own = (el.getAnimations?.() ?? []).find(
              (a) =>
                (a as Animation & { transitionProperty?: string })
                  .transitionProperty === e.propertyName,
            );
            list.push({
              property: e.propertyName,
              end: Number(
                own?.effect?.getComputedTiming().endTime ?? Number.NaN,
              ),
              target: `<${el.tagName.toLowerCase()} ${el.getAttribute("class") ?? ""}>`,
            });
          },
          true,
        );
      });
      await rested(quiet, "/crew");
      await pause(600);
      const states = (await quiet.states()).map((s) => s.state);
      expect
        .soft(
          {
            settled: states.includes("settled"),
            moving: states.filter((s) => s === "landed" || s === "lofting"),
          },
          `the states, ${at}`,
        )
        .toEqual({ settled: true, moving: [] });
      if (options.reducedMotion) {
        const runs = await quiet.page.evaluate(
          () =>
            (
              window as Window & {
                __runs?: { property: string; end: number; target: string }[];
              }
            ).__runs ?? [],
        );
        expect
          .soft(
            {
              any: runs.length > 0,
              other: [
                ...new Set(
                  runs
                    // Decision 7: /'s fade, opacity, fill and visibility; nothing that moves.
                    .filter(
                      (r) =>
                        !["opacity", "fill", "visibility"].includes(r.property),
                    )
                    .map((r) => `${r.property} on ${r.target}`),
                ),
              ],
              late: runs
                .filter((r) => !(r.end <= 300))
                .map((r) => `${r.property} ${r.end}`),
            },
            `the fade under reduce: transitions run, none but opacity, fill and visibility (decision 7: no transform, position or size), all ending within 300 ms, ${at}`,
          )
          .toEqual({ any: true, other: [], late: [] });
      }
      expect.soft(quiet.errors, `console errors, ${at}`).toEqual([]);
      await quiet.close();
    }
  }
});
