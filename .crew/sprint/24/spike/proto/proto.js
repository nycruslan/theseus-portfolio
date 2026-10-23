// B3 spike (sprint 24): the prototype's driver. It runs inside a copy of the built home page (the
// sheet exactly as the site draws it; build-proto.mjs makes the copy), lays a canvas over the
// drawing that is showing, and draws the model on it.
//
// Query: option=a|b, u=<time share 0..1> for one still frame, play=<ms> to run the loft,
// parts=outline|hull|all, show=svg|canvas|both, outline=1 (the SVG's outline alone), dpr=<cap>,
// live=1 (a plank in pencil and one in copper, as the live crew would show them).

import { ease, playLoft } from "/spike/scene/loft.js";
import { posesFor } from "/spike/scene/poses.js";

const q = new URLSearchParams(location.search);
const root = document.documentElement;

try {
  await main();
} catch (error) {
  root.dataset.ready = JSON.stringify({ error: String(error?.stack ?? error) });
}

async function main() {
  const option = q.get("option") ?? "a";
  const { mount } = await import(
    option === "b" ? "/spike/scene/scene-webgpu.js" : "/spike/scene/scene-webgl.js"
  );

  const wide = window.innerWidth >= 768;
  const view = document.querySelector(wide ? ".plan-view.plan-wide" : ".plan-view.plan-narrow");
  const svg = view.querySelector("svg");
  const box = svg.getBoundingClientRect();
  const viewBox = view.getBoundingClientRect();

  // For the registration check: the SVG's outline alone, or its hull as a solid silhouette, and
  // `solo` hides the rest of the page so a screenshot's alpha is the drawing's coverage.
  const css = [];
  if (q.get("outline") === "1") css.push(".plan svg path:not(.ln-outline), .plan-view > span { display: none; }");
  if (q.get("sil") === "1") {
    css.push(".plan svg > path, .plan-view > span { display: none; }");
    css.push(".plan svg path[data-plank] { fill: #000 !important; stroke: none !important; }");
  }
  if (q.get("solo") === "1") css.push("html, body, main, .plan { background: transparent !important; border-color: transparent !important; } body { visibility: hidden; }");
  const style = document.createElement("style");
  style.textContent = css.join("\n");
  document.head.append(style);

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.spike = "";
  Object.assign(canvas.style, {
    position: "absolute",
    left: `${box.left - viewBox.left}px`,
    top: `${box.top - viewBox.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    pointerEvents: "none",
    visibility: "hidden",
  });
  view.append(canvas);

  // The drawing's own plank states: a seated plank is card, the rest original card.
  const states = new Map(
    [...svg.querySelectorAll("path[data-plank]")].map((path) => [
      path.dataset.plank,
      path.classList.contains("plank-seated") ? "card" : "original",
    ]),
  );
  if (q.get("live") === "1") {
    states.set("4.0", "graphite");
    states.set("6.1", "copper");
  }

  const poses = posesFor(wide ? "wide" : "narrow", box.width, window.innerHeight);
  const cap = Number(q.get("dpr") ?? (wide ? 2 : 1.5));
  const t0 = performance.now();
  const stage = await mount(canvas, {
    ...poses,
    dpr: Math.min(window.devicePixelRatio, cap),
    level: wide ? "desktop" : "phone",
    states,
  });
  const ready = performance.now() - t0;

  const parts = q.get("parts") ?? "all";
  const { planks, deck, seams, outline, shadow } = stage.parts;
  if (parts === "outline") {
    for (const part of [planks, deck, seams]) part.visible = false;
    shadow.userData.on = false;
  }
  if (parts === "hull") {
    for (const part of [seams, outline]) part.visible = false;
    shadow.userData.on = false;
  }

  // The registered frame, drawn hidden first, then shown: the hand-off has nothing to wait for.
  const t1 = performance.now();
  const first = stage.frame(0);
  const firstFrame = performance.now() - t1;
  canvas.style.visibility = "visible";
  if (q.get("show") === "canvas") {
    svg.style.visibility = "hidden";
    for (const span of view.querySelectorAll(":scope > span")) span.style.visibility = "hidden";
  }
  if (q.get("show") === "svg") canvas.style.visibility = "hidden";
  if (q.get("solo") === "1" && q.get("show") !== "canvas") svg.style.visibility = "visible";

  const report = {
    option,
    backend: first.backend ?? "webgl2",
    dpr: stage.dpr,
    canvas: { left: box.left, top: box.top + window.scrollY, width: box.width, height: box.height },
    poses,
    triangles: stage.hull.triangles,
    geometry: {
      planks: stage.hull.planks.reduce((n, p) => n + p.index.length / 3, 0),
      deckAndTransom: stage.hull.deck.index.length / 3,
      shadowPlane: 2,
      seamSegments: stage.hull.seams.length / 6,
      outlineSegments: stage.hull.outline.length / 6,
      vertices: stage.hull.planks.reduce((n, p) => n + p.position.length / 3, 0) + stage.hull.deck.position.length / 3,
    },
    lineSegments: (stage.hull.seams.length + stage.hull.outline.length) / 6,
    ready,
    firstFrame,
    first,
  };

  if (q.has("u")) {
    const u = Number(q.get("u"));
    const e = ease(u);
    report.u = u;
    report.e = e;
    report.frame = stage.frame(e);
    report.framed = stage.loft.framedAt(e);
    report.target = stage.loft.target;
  }

  if (q.has("play")) {
    // Count every frame the scene draws, so a frame at rest can't hide.
    let drawn = 0;
    const frame = stage.frame;
    const counted = (e) => {
      drawn++;
      return frame(e);
    };
    const result = await playLoft({
      duration: Number(q.get("play")),
      render: counted,
      step: (direction) => stage.step(direction),
      govern: q.get("govern") !== "0",
    });
    const atEnd = drawn;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    report.loft = { ...result, drawnDuringLoft: atEnd, drawnAtRest: drawn - atEnd, dprAfter: stage.dpr };
  }

  if (q.has("bench")) {
    // The settled frame alone, as a crew event would redraw it: one frame per animation frame.
    const runs = [];
    for (let i = 0; i < Number(q.get("bench")); i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const t = performance.now();
      stage.frame(1);
      runs.push(performance.now() - t);
    }
    report.bench = runs;
  }

  window.__spike = { stage, report };
  root.dataset.ready = JSON.stringify(report);
}
