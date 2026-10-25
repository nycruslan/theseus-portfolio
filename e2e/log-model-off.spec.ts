import { type Browser, expect, type Page, test } from "@playwright/test";
import { type GhostDrawing, ghostDrawing, PAGES, press, SIZES } from "./ghost";
import { FIRST, FRAME, pause, REST, SHOWN } from "./model";
import { type ModelOptions, type ModelRun, openModel } from "./webgl";

// Sprint 33, B5.22 (.crew/sprint/33/contract.md, "Off", call 6): on every Off path the Log is B5a's
// drawing exactly, and no 3D downloads. The baseline is the page with WebGL refused, which the
// contract makes the definition of Off: its scripts, and its ghost (the planks' fills, the `svg`
// shown, the numbers shown and none transformed), read in the same media as each case (forced
// colours and print restyle the drawing by design). A press of Off mid-visit leaves within 2
// frames no data-state and no live context, and requests nothing more.

/** Past load, the idle callback's 2,000 ms timeout and a margin. */
const IDLE = 3500;
const TWO_FRAMES = Math.ceil(2 * FRAME);

type Media = { forcedColors?: "active"; print?: boolean };

/** What the Off page has, per media: its scripts and its ghost. */
/**
 * What the Off page has: its scripts and context requests, and its ghost in each media, read on the
 * one WebGL-refused page with the media switched in place (sprint 33, decision 12: the drawing's
 * CSS is the same whether forced colours or print came at load or after, and the refused page has
 * no model to restyle it either way).
 */
type Baseline = {
  scripts: Set<string>;
  requests: string[];
  drawing: GhostDrawing;
  forced: GhostDrawing;
  print: GhostDrawing;
};

async function baseline(
  browser: Browser,
  url: string,
  size: { width: number; height: number },
): Promise<Baseline> {
  const run = await openModel(browser, { ...size, refuse: true });
  await run.goto(url);
  await pause(IDLE);
  const drawing = await ghostDrawing(run.page);
  await run.page.emulateMedia({ forcedColors: "active" });
  await pause(300);
  const forced = await ghostDrawing(run.page);
  await run.page.emulateMedia({ forcedColors: "none", media: "print" });
  await pause(300);
  const print = await ghostDrawing(run.page);
  const scripts = new Set(
    (await run.scripts()).list.map((s) => new URL(s.url).pathname),
  );
  const requests = (await run.requests()).map((r) => r.type);
  await run.close();
  return { scripts, requests, drawing, forced, print };
}

/** The ghost against the Off page's: each plank's fill, the svg, the numbers, no transform. */
function expectOffGhost(seen: GhostDrawing, off: GhostDrawing, name: string) {
  expect
    .soft(
      Object.fromEntries(
        seen.planks.map((p) => [p.id, `${p.fill} ${p.alpha}`]),
      ),
      `each ghost plank's fill and alpha against the Off page's, ${name}`,
    )
    .toEqual(
      Object.fromEntries(off.planks.map((p) => [p.id, `${p.fill} ${p.alpha}`])),
    );
  expect.soft(seen.svg, `the ghost's svg shows, ${name}`).toBe(off.svg);
  expect
    .soft(
      seen.numbers,
      `the ghost's numbers shown, against the Off page's, ${name}`,
    )
    .toEqual(off.numbers);
  expect
    .soft(seen.transformed, `numbers carrying a transform, ${name}`)
    .toEqual([]);
  expect.soft(seen.canvases, `[data-model] canvases, ${name}`).toBe(0);
  expect.soft(seen.state, `[data-model]'s data-state, ${name}`).toBeNull();
}

/** Animation frames, counted in the page, until `[data-model]` has no data-state (up to 10). */
function framesUntilGone(page: Page) {
  return page.evaluate(async () => {
    const host = document.querySelector("[data-model]");
    for (let frame = 0; frame <= 10; frame++) {
      if (!host?.hasAttribute("data-state")) return frame;
      await new Promise((done) => requestAnimationFrame(done));
    }
    return -1;
  });
}

for (const url of PAGES) {
  test(`B5.22 Off downloads nothing, on ${url}: with off stored before load, WebGL refused, forced colours, Save-Data, print and scripts off, at 1440 and 390, no script beyond the WebGL-refused page's, no WebGL context but the one probe (none with off stored), no canvas, and the ghost's fills, svg and numbers as the Off page has them with no number transformed; Off pressed at rest and mid-move leaves within 2 frames no data-state and 0 live contexts, the Off page's ghost, and requests nothing more`, async ({
    browser,
  }) => {
    test.setTimeout(600_000);
    for (const size of SIZES) {
      const at = `${url} at ${size.width} x ${size.height}`;
      // WebGL refused: the baseline page itself, no canvas, the one probe at most.
      const plain = await baseline(browser, url, size);
      expect(
        plain.scripts.size,
        `scripts the WebGL-refused page fetches, ${at}`,
      ).toBeGreaterThan(0);
      expect
        .soft(
          plain.requests.filter((r) => r !== "webgl2"),
          `context requests but the probe's webgl2, WebGL refused, ${at}`,
        )
        .toEqual([]);
      expect
        .soft(
          plain.requests.length,
          `context requests, WebGL refused, ${at}: the one probe at most`,
        )
        .toBeLessThanOrEqual(1);
      expectOffGhost(plain.drawing, plain.drawing, `WebGL refused, ${at}`);
      const cases: { name: string; options: ModelOptions; media: Media }[] = [
        {
          name: "off stored before load",
          options: { stored: "off" },
          media: {},
        },
        {
          name: "forced colours",
          options: { forcedColors: "active" },
          media: { forcedColors: "active" },
        },
        { name: "Save-Data", options: { saveData: true }, media: {} },
        { name: "print media at load", options: {}, media: { print: true } },
        { name: "scripts off", options: { noScript: true }, media: {} },
      ];
      for (const { name, options, media } of cases) {
        const where = `${name}, ${at}`;
        const base = media.forcedColors
          ? plain.forced
          : media.print
            ? plain.print
            : plain.drawing;
        const run = await openModel(browser, { ...size, ...options });
        if (media.print) await run.page.emulateMedia({ media: "print" });
        if (options.noScript) await run.page.goto(url);
        else await run.goto(url);
        await pause(IDLE);
        const seen = await ghostDrawing(run.page);
        const requests = (await run.requests()).map((r) => r.type);
        const scripts = (await run.scripts()).list.map(
          (s) => new URL(s.url).pathname,
        );
        await run.close();
        expect
          .soft(
            scripts.filter((s) => !plain.scripts.has(s)),
            `scripts beyond the WebGL-refused page's, ${where}`,
          )
          .toEqual([]);
        if (options.stored === "off") {
          expect
            .soft(requests, `WebGL or WebGPU context requests, ${where}`)
            .toEqual([]);
        } else {
          expect
            .soft(
              requests.filter((r) => r !== "webgl2"),
              `context requests but the probe's webgl2, ${where}`,
            )
            .toEqual([]);
          expect
            .soft(
              requests.length,
              `context requests, ${where}: the one probe at most`,
            )
            .toBeLessThanOrEqual(1);
        }
        expectOffGhost(seen, base, where);
      }

      // Off pressed at rest, then mid-move.
      for (const when of ["at rest", "mid-move"] as const) {
        const where = `Off pressed ${when}, ${at}`;
        const run: ModelRun = await openModel(browser, {
          ...size,
          clock: when === "mid-move",
        });
        await run.goto(url);
        if (when === "mid-move") {
          await run.until(SHOWN, 4, FIRST);
          await run.until(["lofting"], 4, 20_000);
        } else {
          await run.waitFor([...REST], FIRST);
          await pause(300);
        }
        const scriptsBefore = (await run.scripts()).list.length;
        const requestsBefore = (await run.requests()).length;
        await press(run.page, "Off");
        let frames: number;
        if (when === "mid-move") {
          await pause(150);
          await run.step(TWO_FRAMES);
          frames = (await run.state()) === null ? 2 : -1;
        } else {
          frames = await framesUntilGone(run.page);
        }
        expect
          .soft(
            frames >= 0 && frames <= 2,
            `frames until data-state is gone (${frames}), ${where}`,
          )
          .toBe(true);
        expect.soft(await run.live(), `live WebGL contexts, ${where}`).toBe(0);
        if (when === "mid-move") await run.step(1000);
        await pause(1000);
        const seen = await ghostDrawing(run.page);
        expect
          .soft(
            (await run.scripts()).list.length - scriptsBefore,
            `scripts requested after the press, ${where}`,
          )
          .toBe(0);
        expect
          .soft(
            (await run.requests()).length - requestsBefore,
            `context requests after the press, ${where}`,
          )
          .toBe(0);
        expect
          .soft(
            await run.page.evaluate(() =>
              localStorage.getItem("theseus:motion"),
            ),
            `the mode stored, ${where}`,
          )
          .toBe("off");
        expectOffGhost(seen, plain.drawing, where);
        expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
        await run.close();
      }
    }
  });
}
