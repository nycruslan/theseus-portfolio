import { type Browser, expect, type Page, test } from "@playwright/test";
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
  pause,
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
  deltaE,
  edgeOffsets,
  edges,
  hausdorff,
  type Image,
  pixel,
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
  // The ink and the paper, for B3.1's ink count in the number boxes.
  const tokens = await off.page.evaluate(() => {
    const probe = document.createElement("div");
    document.body.append(probe);
    const read = (name: string) => {
      probe.style.color = `var(${name})`;
      const [r, g, b] = getComputedStyle(probe).color.match(/[\d.]+/g) ?? [];
      return [Number(r), Number(g), Number(b)] as const;
    };
    const out = { ink: read("--foreground"), paper: read("--background") };
    probe.remove();
    return out;
  });
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
    tokens,
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
      // Build note 6: the numbers paint above the canvas. Each number box's ink pixels, nearer
      // --foreground's luminance than --background's, on frame 1 against the Off page. The spans
      // are the only elements above the canvas, so Chromium composites them in their own
      // transparent layer, and composited text loses LCD anti-aliasing on a runner that has it:
      // every glyph edge shifts, so a pixel-identical box fails with nothing wrong. The count
      // survives it; a covered or hidden number drops to near 0 (decision 14). The bound is half:
      // CI's LCD-to-grayscale shift took the smallest glyph, "7", from 22 ink pixels to 17 (77%),
      // and a covered number falls to 0, so half still bites.
      const luma = ([r0 = 0, g0 = 0, b0 = 0]: readonly number[]) =>
        0.2126 * r0 + 0.7152 * g0 + 0.0722 * b0;
      const [inkL, paperL] = [luma(r.tokens.ink), luma(r.tokens.paper)];
      const inked = (image: Image, b: Box) => {
        const c = whole(b);
        let n = 0;
        for (let y = c.y; y < c.y + c.height; y++)
          for (let x = c.x; x < c.x + c.width; x++) {
            const l = luma(pixel(image, x, y));
            if (Math.abs(l - inkL) < Math.abs(l - paperL)) n++;
          }
        return n;
      };
      const ink = r.numbers.map((n) => ({
        text: n.text,
        off: inked(r.offView, n),
        on: inked(r.onView, n),
      }));
      note(
        testInfo,
        "number ink",
        `ink pixels per number box, frame 1 / Off: ${ink.map((n) => `${n.text} ${n.on}/${n.off}`).join(", ")}.`,
      );
      expect
        .soft(
          ink.filter((n) => n.off === 0).map((n) => n.text),
          "plank numbers with no ink on the Off page",
        )
        .toEqual([]);
      expect
        .soft(
          ink
            .filter((n) => n.on === 0 || n.on < 0.5 * n.off)
            .map((n) => `${n.text} ${n.on}/${n.off}`),
          "plank numbers that keep under half the Off page's ink at frame 1 (build note 6; composited text loses LCD anti-aliasing, which took CI's smallest glyph from 22 ink pixels to 17)",
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

/**
 * A point inside each plank as the visitor sees it, in CSS px: the plank box's centre, or the
 * nearest point to it inside the hull, 4 units clear of the plank's seams, the outline and the
 * leaders, and clear of the plank numbers, so it reads the fill alone.
 */
function plankPoints(page: Page) {
  return page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>(".plan-wide svg");
    const hull = svg?.querySelector<SVGPathElement>("clipPath path");
    const leader = svg?.querySelector<SVGPathElement>(".ln-leader");
    const m = svg?.getScreenCTM();
    if (!svg || !hull || !m) return [];
    const numbers = [
      ...document.querySelectorAll(".plan-wide .plan-plank"),
    ].map((n) => n.getBoundingClientRect());
    const css = (x: number, y: number) => ({
      x: m.a * x + m.e,
      y: m.d * y + m.f,
    });
    const clear = (x: number, y: number) => {
      for (const [dx, dy] of [
        [0, 0],
        [-4, 0],
        [4, 0],
        [0, -4],
        [0, 4],
      ] as const) {
        const p = new DOMPoint(x + dx, y + dy);
        if (!hull.isPointInFill(p) || leader?.isPointInStroke(p)) return false;
      }
      const c = css(x, y);
      return !numbers.some(
        (r) =>
          c.x > r.left - 3 &&
          c.x < r.right + 3 &&
          c.y > r.top - 3 &&
          c.y < r.bottom + 3,
      );
    };
    return [...svg.querySelectorAll<SVGPathElement>("[data-plank]")].map(
      (plank) => {
        const b = plank.getBBox();
        const [cx, cy] = [b.x + b.width / 2, b.y + b.height / 2];
        let best: { x: number; y: number; d: number } | null = null;
        for (let x = b.x + 4; x <= b.x + b.width - 4; x += 1)
          for (let y = b.y + 4; y <= b.y + b.height - 4; y += 1) {
            const d = Math.hypot(x - cx, y - cy);
            if ((!best || d < best.d) && clear(x, y)) best = { x, y, d };
          }
        const at = best ? css(best.x, best.y) : null;
        return {
          id: plank.getAttribute("data-plank") ?? "",
          at,
          centre: best?.d === 0,
        };
      },
    );
  });
}

/** A token as the page paints it, [r, g, b], through a 2D canvas. */
function token(page: Page, name: string) {
  return page.evaluate((prop) => {
    const probe = document.createElement("div");
    probe.style.color = `var(${prop})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return [0, 0, 0];
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
  }, name);
}

/** Canvas pixels within ΔE 10 of `accent`, each composited over the page's background. */
function copper(image: Image, accent: number[], ground: number[]) {
  let n = 0;
  for (let i = 0; i < image.width * image.height; i++) {
    const a = (image.data[i * 4 + 3] ?? 0) / 255;
    if (a < 0.02) continue;
    const rgb = [0, 1, 2].map(
      (c) => (image.data[i * 4 + c] ?? 0) * a + (ground[c] ?? 0) * (1 - a),
    );
    if (deltaE(rgb, accent) < 10) n++;
  }
  return n;
}

test("B3.7 the model shows the record in the drawing's colours, and nothing copper: at frame 1 each plank's fill is within 8 levels of the drawing's in both schemes, no canvas pixel is within ΔE 10 of --accent at frame 1 or settled, and a scheme change while settled redraws once in the other scheme's colours, then stops", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  for (const scheme of ["light", "dark"] as const) {
    const other = scheme === "light" ? "dark" : "light";
    const off = await openModel(browser, { scheme, refuse: true });
    await off.goto();
    const points = await plankPoints(off.page);
    const offView = await view(off.page);
    const accent = await token(off.page, "--accent");
    const ground = await token(off.page, "--background");
    const planBox = await box(off.page, ".plan-wide");
    await off.close();
    expect(points.length, `planks in the wide drawing, ${scheme}`).toBe(22);
    expect
      .soft(
        points.filter((p) => !p.at).map((p) => p.id),
        `planks with no point clear of their seams and numbers, ${scheme}`,
      )
      .toEqual([]);

    const run = await openModel(browser, { scheme, clock: true });
    await run.goto();
    expect(
      await run.until(SHOWN, 4, FIRST),
      `frame 1 is landed, ${scheme}`,
    ).toBe("landed");
    const onView = await view(run.page);
    const off8 = points.flatMap((p) => {
      if (!p.at) return [];
      const [a, b] = [
        pixel(onView, p.at.x, p.at.y),
        pixel(offView, p.at.x, p.at.y),
      ];
      const d = Math.max(
        ...[0, 1, 2].map((c) => Math.abs((a[c] ?? 0) - (b[c] ?? 0))),
      );
      return d > 8
        ? [`${p.id}: model ${a.slice(0, 3)} against drawing ${b.slice(0, 3)}`]
        : [];
    });
    expect
      .soft(
        off8,
        `plank fills more than 8 levels from the drawing's at frame 1, ${scheme}`,
      )
      .toEqual([]);
    const clip = whole(planBox as Box);
    const landed = await modelCoverage(run.page, clip);
    expect
      .soft(
        copper(landed.image, accent, ground),
        `canvas pixels within ΔE 10 of --accent at frame 1, ${scheme}`,
      )
      .toBe(0);
    expect(
      await run.until(["settled"], 16, 30_000),
      `settled on the clock, ${scheme}`,
    ).toBe("settled");
    const settled = await modelCoverage(run.page, clip);
    expect
      .soft(
        copper(settled.image, accent, ground),
        `canvas pixels within ΔE 10 of --accent settled, ${scheme}`,
      )
      .toBe(0);

    // The scheme switched while settled: one redraw in the other scheme's colours, then nothing.
    const before = (await run.frames()).length;
    await run.page.emulateMedia({ colorScheme: other });
    await pause(300);
    await run.step(200);
    const redrawn = (await run.frames()).length - before;
    const switched = await modelCoverage(run.page, clip);
    await run.step(3000);
    await pause(300);
    const after = (await run.frames()).length - before;
    expect
      .soft(redrawn, `frames drawn on the switch to ${other}`)
      .toBeGreaterThanOrEqual(1);
    expect
      .soft(
        after - redrawn,
        `frames drawn in the 3 s after the switch to ${other}`,
      )
      .toBe(0);
    // The same tab reloaded in the other scheme opens settled: the reference frame.
    await run.page.reload();
    await run.page.evaluate(() => document.fonts.ready);
    expect(
      await run.until(["settled"], 16, FIRST),
      `a reload opens settled, ${other}`,
    ).toBe("settled");
    const reference = await modelCoverage(run.page, clip);
    const d = channelDelta(switched.image, reference.image);
    let covered = 0;
    let differ = 0;
    for (let i = 0; i < d.length; i++) {
      const a = Math.max(switched.alpha[i] ?? 0, reference.alpha[i] ?? 0);
      if (a < 0.02) continue;
      covered++;
      if ((d[i] ?? 0) > 8) differ++;
    }
    note(
      testInfo,
      "scheme switch",
      `${scheme} to ${other}: ${redrawn} frames on the switch, ${after - redrawn} after; ${differ} of ${covered} covered px more than 8 levels from a settled load in ${other}. ${SWIFTSHADER}.`,
    );
    expect(
      covered,
      `covered canvas pixels after the switch to ${other}`,
    ).toBeGreaterThan(0);
    expect
      .soft(
        differ / covered,
        `share of the canvas off a settled ${other} load after the switch`,
      )
      .toBeLessThanOrEqual(0.01);
    if (scheme === "light")
      await attach(testInfo, "settled, switched to dark.png", switched.image);
    expect.soft(run.errors, `console errors, ${scheme}`).toEqual([]);
    await run.close();
  }
});
