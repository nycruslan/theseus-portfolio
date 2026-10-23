import { type Browser, expect, test } from "@playwright/test";
import { profile as keelAt, LENGTH, sheer } from "../lib/half-model";
import { WIDE } from "../lib/hull-layouts";
import {
  attach,
  BAR,
  type Box,
  box,
  CANVAS,
  canvasFit,
  FIRST,
  modelCoverage,
  note,
  outlineCoverage,
  profile,
  REVISIONS,
  SHOWN,
  stats,
  TITLE,
  textBoxes,
  view,
  whole,
} from "./model";
import {
  channelDelta,
  crop,
  edgeOffsets,
  edges,
  hausdorff,
  type Image,
} from "./pixels";
import { openModel } from "./webgl";

// Sprint 25, B3 (.crew/sprint/25/contract.md): the white card model's first frame lands on the
// inked profile. B3.1 is the registration, the whole-pixel canvas and the hand-off; B3.7 the
// model's colours. Hooks, and nothing else: `[data-model]` as `[data-plan]`'s next sibling, its
// `data-state` and its one canvas, and the drawing's `.plan-wide`, `.ln-outline`, `[data-plank]`
// and plank numbers. Headless Chromium draws WebGL with SwiftShader: every GPU-dependent number
// here is a floor, and its note says so.
//
// The registration is S4's method (.crew/sprint/24/spike/measure/s4-register.mjs) on what the
// page exposes. The page has no switch to draw the model's outline lines alone, so the check
// compares silhouettes, S4's second measure, which read the same as its outline at every size
// (spike.md, S4's table): the canvas's coverage at `landed` against `.ln-outline` filled, each the
// hull plus the outline's outer half-stroke, at a 50% threshold, edge to edge.

const SWIFTSHADER =
  "SwiftShader, headless Chromium's software WebGL: a floor, not a GPU's number";

type Shot = {
  width: number;
  height: number;
  dpr: number;
  scheme: "light" | "dark";
};

/** One registration: the refused page's outline against the model's frame 1, held on the clock. */
async function register(browser: Browser, shot: Shot) {
  const { width, height, dpr, scheme } = shot;
  const name = `${width} x ${height} at DPR ${dpr}, ${scheme}`;

  const off = await openModel(browser, {
    width,
    height,
    dpr,
    scheme,
    refuse: true,
  });
  await off.goto();
  const planBox = await box(off.page, ".plan-wide");
  expect(planBox, `.plan-wide with WebGL refused, ${name}`).not.toBeNull();
  const clip = whole(planBox as Box);
  const where = await profile(off.page);
  expect(where, `the profile's geometry, ${name}`).not.toBeNull();
  const svg = await outlineCoverage(off.page, clip);
  const offView = await view(off.page);
  const offText = await textBoxes(off.page);
  const numbers = await off.page.evaluate(() =>
    [...document.querySelectorAll(".plan-wide .plan-plank")].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        text: (el.textContent ?? "").trim(),
        x: r.left,
        y: r.top,
        width: r.width,
        height: r.height,
      };
    }),
  );
  const regions = {
    title: await box(off.page, TITLE),
    revisions: await box(off.page, REVISIONS),
    bar: await box(off.page, BAR),
  };
  await off.close();

  const on = await openModel(browser, {
    width,
    height,
    dpr,
    scheme,
    clock: true,
  });
  await on.goto();
  const state = await on.until(SHOWN, 4, FIRST);
  expect(state, `[data-model] is held at landed on the clock, ${name}`).toBe(
    "landed",
  );
  expect(
    await box(on.page, ".plan-wide"),
    `.plan-wide with the model, ${name}`,
  ).toEqual(planBox);
  const model = await modelCoverage(on.page, clip);
  const onView = await view(on.page);
  const onText = await textBoxes(on.page);
  const motion = await on.page.evaluate(
    () => (window as Window & { __motion?: string[] }).__motion ?? [],
  );
  const errors = [...on.errors];
  await on.close();

  const { limit, hull, ctm } = where as NonNullable<typeof where>;
  const [w, h] = [model.image.width, model.image.height];
  const cut = Math.round((limit - clip.x) * dpr);
  const [svgEdge, glEdge] = [edges(svg.alpha, w, h), edges(model.alpha, w, h)];
  const distance = hausdorff(svgEdge, glEdge, w, h, cut);

  // The sub-pixel offsets, model minus drawing: columns across the sheer (scanning down) and the
  // keel (scanning up), rows across the transom (scanning right). CSS px, + is down or right.
  const device = (x: number, y: number) => ({
    x: Math.round((ctm.a * x + ctm.e - clip.x) * dpr),
    y: Math.round((ctm.d * y + ctm.f - clip.y) * dpr),
  });
  const columns: number[] = [];
  for (let x = 0.15 * LENGTH; x < 0.85 * LENGTH; x += 3 / (WIDE.s * dpr)) {
    columns.push(device(WIDE.ox + x * WIDE.s, 0).x);
  }
  const down = columns.map((x) =>
    Array.from({ length: h }, (_, y) => ({ x, y })),
  );
  const up = columns.map((x) =>
    Array.from({ length: h }, (_, i) => ({ x, y: h - 1 - i })),
  );
  const top = WIDE.oy + sheer(0) * WIDE.s;
  const bottom = WIDE.oy + keelAt(0) * WIDE.s;
  const rows: { x: number; y: number }[][] = [];
  const from = device(WIDE.ox - 12, 0).x;
  for (
    let y = top + 0.3 * (bottom - top);
    y < top + 0.7 * (bottom - top);
    y += 1 / dpr
  ) {
    const row = device(0, y).y;
    rows.push(
      Array.from({ length: Math.round(24 * dpr) }, (_, i) => ({
        x: from + i,
        y: row,
      })),
    );
  }
  const offset = (lines: { x: number; y: number }[][]) =>
    stats(edgeOffsets(svg.alpha, model.alpha, w, lines).map((d) => d / dpr));

  // The registration image: magenta where only the drawing's edge is, cyan only the model's.
  const diff: Image = { width: w, height: h, data: new Uint8Array(w * h * 4) };
  for (let i = 0; i < w * h; i++) {
    const [a, b] = [svgEdge[i] ?? 0, glEdge[i] ?? 0];
    diff.data.set(
      [Math.round(255 * (1 - b)), Math.round(255 * (1 - a)), 255, 255],
      i * 4,
    );
  }
  return {
    name,
    max: distance.max / dpr,
    p99: distance.p99 / dpr,
    covered: [distance.a, distance.b],
    sheer: offset(down),
    keel: offset(up),
    transom: offset(rows),
    diff,
    clip,
    hull,
    onView,
    offView,
    onText,
    offText,
    numbers,
    regions,
    motion,
    errors,
  };
}

test("B3.1 the first frame lands on the drawing: registered within 1.0 CSS px at DPR 2 and 1.5 at DPR 1 at 1440 in both schemes, a whole-pixel canvas on .plan-wide's box, and a hand-off that changes nothing outside the profile", async ({
  browser,
}, testInfo) => {
  test.setTimeout(600_000);

  // Registration, asserted at 1440 x 900; 1024 x 768 and 1920 x 1080 reported.
  const asserted: Shot[] = [];
  for (const scheme of ["light", "dark"] as const)
    for (const dpr of [1, 2])
      asserted.push({ width: 1440, height: 900, dpr, scheme });
  const reported: Shot[] = [];
  for (const [width, height] of [
    [1024, 768],
    [1920, 1080],
  ] as const)
    for (const dpr of [1, 2])
      reported.push({ width, height, dpr, scheme: "light" });

  for (const shot of [...asserted, ...reported]) {
    const r = await register(browser, shot);
    const bound = shot.dpr === 2 ? 1.0 : 1.5;
    const gated = asserted.includes(shot);
    note(
      testInfo,
      "registration",
      `${r.name}: Hausdorff ${r.max.toFixed(2)} CSS px (p99 ${r.p99.toFixed(2)}), ${gated ? `bound ${bound}` : "reported"}; S4 measured 1.0 at DPR 1 and 0.71 at DPR 2. Mean edge offset, model minus drawing: sheer ${r.sheer.median} (max ${r.sheer.max}, ${r.sheer.n} columns), keel ${r.keel.median} (max ${r.keel.max}), transom ${r.transom.median} (max ${r.transom.max}); S4 at most 0.64. ${SWIFTSHADER}.`,
    );
    expect
      .soft(r.covered[0], `the drawing's silhouette edge has pixels, ${r.name}`)
      .toBeGreaterThan(0);
    expect
      .soft(r.covered[1], `the model's silhouette edge has pixels, ${r.name}`)
      .toBeGreaterThan(0);
    if (gated) {
      expect
        .soft(
          r.max,
          `the model's outline on .ln-outline (Hausdorff, CSS px), ${r.name}`,
        )
        .toBeLessThanOrEqual(bound);
    }
    if (shot.width === 1440 && shot.scheme === "light") {
      await attach(testInfo, `registration ${r.name}.png`, r.diff);
    }
    expect.soft(r.errors, `console errors, ${r.name}`).toEqual([]);

    // The hand-off at 1440, DPR 1: from the Off page to frame 1.
    if (shot.width === 1440 && shot.dpr === 1 && shot.scheme === "light") {
      const changed = channelDelta(r.onView, r.offView);
      const at = (x: number, y: number) => changed[y * r.onView.width + x] ?? 0;
      const differing = (b: Box | null, skip?: Box) => {
        if (!b) return Number.NaN;
        const c = whole(b);
        let n = 0;
        for (let y = c.y; y < c.y + c.height; y++)
          for (let x = c.x; x < c.x + c.width; x++) {
            if (
              skip &&
              x >= skip.x &&
              x < skip.x + skip.width &&
              y >= skip.y &&
              y < skip.y + skip.height
            )
              continue;
            if (at(x, y) > 0) n++;
          }
        return n;
      };
      for (const [label, region] of Object.entries(r.regions)) {
        expect(region, `${label}'s box`).not.toBeNull();
        expect
          .soft(
            differing(region),
            `pixels of ${label} that change at the hand-off`,
          )
          .toBe(0);
      }
      const profileBox = whole({
        x: r.hull.x - 2,
        y: r.hull.y - 2,
        width: r.hull.width + 4,
        height: r.hull.height + 4,
      });
      expect
        .soft(
          differing(r.clip, profileBox),
          "pixels of the drawing outside the profile's box that change at the hand-off",
        )
        .toBe(0);
      expect(
        r.numbers.length,
        "plank numbers in the wide drawing",
      ).toBeGreaterThan(0);
      expect
        .soft(
          r.numbers.filter((n) => differing(n) > 0).map((n) => n.text),
          "plank numbers whose box changes at the hand-off (build note 6)",
        )
        .toEqual([]);
      expect
        .soft(r.onText, "every text node's box, frame 1 against the Off page")
        .toEqual(r.offText);
      let strong = 0;
      const c = r.clip;
      const handoff: Image = {
        width: c.width,
        height: c.height,
        data: new Uint8Array(c.width * c.height * 4),
      };
      for (let y = 0; y < c.height; y++)
        for (let x = 0; x < c.width; x++) {
          const d = at(c.x + x, c.y + y);
          if (d > 48) strong++;
          const v = Math.min(255, d * 4);
          handoff.data.set([v, v, v, 255], (y * c.width + x) * 4);
        }
      note(
        testInfo,
        "hand-off",
        `1440 x 900 at DPR 1: ${strong} of ${c.width * c.height} px in the drawing's box change by more than 48 levels at frame 1, against S4's 4,891 of 667,850 (before the numbers and seams were fixed); judged with Iris on the diff image. ${SWIFTSHADER}.`,
      );
      await attach(
        testInfo,
        "hand-off 1440 dpr1 (black is unchanged).png",
        handoff,
      );
      await attach(
        testInfo,
        "hand-off 1440 dpr1 frame 1.png",
        crop(r.onView, c.x, c.y, c.width, c.height),
      );
      expect
        .soft(r.motion, "animationstart or transitionrun as the canvas appears")
        .toEqual([]);
    }
  }

  // The whole-pixel canvas, at four widths and two DPRs.
  for (const [width, height] of [
    [1024, 768],
    [1366, 768],
    [1440, 900],
    [1920, 1080],
  ] as const) {
    for (const dpr of [1, 2]) {
      const where = `${width} x ${height} at DPR ${dpr}`;
      const run = await openModel(browser, { width, height, dpr });
      await run.goto();
      await run.waitFor(SHOWN, FIRST);
      expect(
        await run.page.locator(CANVAS).count(),
        `one canvas, ${where}`,
      ).toBe(1);
      const fit = await canvasFit(run.page);
      await run.close();
      const [bw = 0, bh = 0] = fit.buffer ?? [];
      const [cw = 0, ch = 0] = fit.css ?? [];
      const [pw = 0, ph = 0] = fit.plan ?? [];
      note(
        testInfo,
        "canvas",
        `${where}: buffer ${bw} x ${bh}, CSS ${cw} x ${ch}, .plan-wide ${pw} x ${ph}`,
      );
      expect
        .soft(
          Number.isInteger(bw) && Number.isInteger(bh),
          `whole buffer, ${where}`,
        )
        .toBe(true);
      expect
        .soft(
          [Math.abs(cw * dpr - bw), Math.abs(ch * dpr - bh)].every(
            (d) => d < 1e-3,
          ),
          `the canvas's CSS size x DPR equals its buffer (${cw} x ${ch} x ${dpr} against ${bw} x ${bh}), ${where}`,
        )
        .toBe(true);
      expect
        .soft(
          Math.max(Math.abs(cw - pw), Math.abs(ch - ph)),
          `the canvas's CSS size against .plan-wide's box (px), ${where}`,
        )
        .toBeLessThanOrEqual(1 / dpr + 1e-3);
      expect
        .soft(
          Math.max(
            Math.abs((fit.at?.[0] ?? 0) - (fit.planAt?.[0] ?? -99)),
            Math.abs((fit.at?.[1] ?? 0) - (fit.planAt?.[1] ?? -99)),
          ),
          `the canvas's corner on .plan-wide's (px), ${where}`,
        )
        .toBeLessThanOrEqual(1 / dpr + 1e-3);
    }
  }
});
