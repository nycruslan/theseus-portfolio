// The lines plan, drawn from the hull's own numbers: profile, half-breadth plan and body plan.
import {
  LENGTH, HEIGHT, LIFTS, sheer, profile, ends, halfBreadth, deckBreadth, seamDepth, planks, bandAt,
} from "./hull.mjs";

export const THEMES = {
  light: { film: "#eaf1ee", deep: "#dde5e2", rule: "#bfcac7", ink: "#111c22", graphite: "#555c61", pencil: "#878d91", copper: "#9e441d", card: "#fbfaf7" },
  dark: { film: "#10191c", deep: "#182226", rule: "#323d40", ink: "#e2eae9", graphite: "#a3adb1", pencil: "#6a7377", copper: "#ee8f63", card: "#e0ded8" },
};

const f = (v) => (Math.round(v * 100) / 100).toString();
const poly = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${f(x)} ${f(y)}`).join("");
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

/** Plank states for the record: sprint numbers by plank id, the pencil plank and the originals. */
export function plankStates(ORDER, merged, pencil) {
  const bySprint = {};
  merged.forEach((sprint, i) => { bySprint[ORDER[i % ORDER.length]] = sprint; });
  const pencilId = pencil ? ORDER[merged.length % ORDER.length] : null;
  return { bySprint, pencilId };
}

/**
 * opts: { ox, oy, s } profile origin and scale; { hbY } half-breadth centreline; { bx } body-plan
 * centre; which views; theme; planksOn (2D plank fills for the Off state), labels.
 */
export function linesPlan(o) {
  const T = THEMES[o.theme ?? "light"];
  const s = o.s;
  const P = (x, y) => [o.ox + x * s, o.oy + y * s];
  const out = [];
  const line = (d, w, c, extra = "") => out.push(`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" ${extra}/>`);
  const text = (x, y, t, size = 11, c = T.graphite, anchor = "middle", weight = 500) =>
    out.push(`<text x="${f(x)}" y="${f(y)}" font-family="Sofia Sans" font-size="${size}" font-weight="${weight}" fill="${c}" text-anchor="${anchor}" font-feature-settings="'tnum'">${t}</text>`);
  const xs = range(0, LENGTH, 240);
  const base = HEIGHT + 10;
  const hairline = o.hair ?? 0.75;

  if (o.profile !== false) {
    // Stations: 0 to 10, construction lines through all three views.
    for (let i = 0; i <= 10; i++) {
      const x = (LENGTH * i) / 10;
      const [px] = P(x, 0);
      const yTop = o.oy - 14;
      const yBot = o.hbY != null && o.halfBreadth !== false ? o.hbY + 6 : o.oy + base * s;
      line(`M${f(px)} ${f(yTop)}V${f(yBot)}`, 0.6, T.pencil, i === 5 ? "" : `stroke-dasharray="1 0"`);
      if (o.labels !== false) text(px, o.oy + base * s + 16, String(i), 11, T.graphite);
    }
    // Waterlines at each seam, across the hull's extent.
    for (let k = 1; k < LIFTS; k++) {
      const y = seamDepth(k);
      const [a, b] = ends(y);
      line(poly([P(a - 18, y), P(b + 18, y)]), 0.5, T.pencil);
    }
    // Baseline and the designed waterline.
    const dwl = seamDepth(3) + 7;
    line(poly([P(-30, base), P(LENGTH + 30, base)]), 0.75, T.graphite);
    line(poly([P(-30, dwl), P(LENGTH + 30, dwl)]), 0.75, T.graphite, `stroke-dasharray="14 3 2 3"`);
    if (o.labels !== false) {
      text(P(LENGTH + 34, dwl)[0], P(0, dwl)[1] + 4, "DWL", 10, T.graphite, "start", 600);
      text(P(LENGTH + 34, base)[0], P(0, base)[1] + 4, "Base", 10, T.graphite, "start", 600);
    }

    // 2D planks (the Off state and the no-WebGL floor): seated in card, original in film, the
    // working plank in pencil.
    if (o.planksOn) {
      const { bySprint, pencilId, ghost } = o.planksOn;
      for (const p of planks()) {
        let top = [], bot = [];
        for (const x of range(p.x0, p.x1, 40)) {
          const band = bandAt(p, x);
          if (!band) continue;
          top.push(P(x, band[0]));
          bot.push(P(x, band[1]));
        }
        if (top.length < 2) continue;
        const d = `${poly([...top, ...[...bot].reverse()])}Z`;
        const sprint = bySprint[p.id];
        if (p.id === pencilId) {
          out.push(`<path d="${d}" fill="url(#hatch)" stroke="${T.graphite}" stroke-width="1" stroke-dasharray="4 2"/>`);
          if (o.live) {
            const n = bot.length;
            const seg = bot.slice(Math.floor(n * 0.42), Math.floor(n * 0.66));
            out.push(`<path d="${poly(seg)}" fill="none" stroke="${T.copper}" stroke-width="2.6" stroke-linecap="round"/>`);
            const tip = seg[seg.length - 1];
            out.push(`<circle cx="${f(tip[0])}" cy="${f(tip[1])}" r="3" fill="${T.copper}"/>`);
          }
          if (o.pencilLabel) { const [tx, ty] = P((p.x0 + p.x1) / 2, (p.yTop + p.yBot) / 2); text(tx, ty + 4, o.pencilLabel, 11, T.copper, "middle", 700); }
        } else if (ghost) {
          out.push(`<path d="${d}" fill="${sprint ? T.film : T.deep}" stroke="${T.pencil}" stroke-width="0.6"/>`);
        } else {
          out.push(`<path d="${d}" fill="${sprint ? T.card : T.deep}" stroke="${T.ink}" stroke-width="0.9"/>`);
        }
        if (sprint && o.numbers !== false) {
          const cx = (p.x0 + p.x1) / 2;
          const band = bandAt(p, cx);
          if (band) {
            const [tx, ty] = P(cx, (band[0] + band[1]) / 2);
            text(tx, ty + 3.6 * (o.numScale ?? 1), String(sprint), 10 * (o.numScale ?? 1), T.ink, "middle", 600);
          }
        }
      }
    }

    // The outline: sheer, transom, profile.
    const sheerPts = xs.map((x) => P(x, sheer(x)));
    const keelPts = xs.slice().reverse().map((x) => P(x, profile(x)));
    line(`${poly([...sheerPts, ...keelPts])}Z`, o.outline ?? 1.6, T.ink, `stroke-linejoin="round"`);
    if (!o.planksOn) {
      // Plank seams and butts, in ink, finer than the outline.
      for (let k = 1; k < LIFTS; k++) {
        const y = seamDepth(k);
        const [a, b] = ends(y);
        line(poly([P(a, y), P(b, y)]), hairline, T.ink);
      }
      for (const p of planks()) {
        if (p.j === 0) continue;
        const band = bandAt(p, p.x0);
        if (band) line(poly([P(p.x0, band[0]), P(p.x0, band[1])]), hairline, T.ink);
      }
    }
    if (o.captions !== false) {
      text(P(0, 0)[0], o.oy - 26, "Profile", 12, T.ink, "start", 600);
    }
  }

  if (o.hbY != null && o.halfBreadth !== false) {
    const cy = o.hbY;
    const H = (x, z) => [o.ox + x * s, cy - z * s];
    line(poly([H(-30, 0), H(LENGTH + 30, 0)]), 0.75, T.graphite, `stroke-dasharray="14 3 2 3"`);
    // Waterlines: each seam's half-breadth along the length.
    for (let k = 1; k < LIFTS; k++) {
      const y = seamDepth(k);
      const [a, b] = ends(y);
      line(poly(range(a, b, 160).map((x) => H(x, halfBreadth(x, y)))), 0.6, T.pencil);
    }
    // The deck line in ink.
    line(poly(xs.map((x) => H(x, deckBreadth(x)))), 1.4, T.ink);
    line(poly([H(0, 0), H(0, deckBreadth(0))]), 1.4, T.ink);
    if (o.captions !== false) text(H(0, 0)[0], cy + 20, "Half-breadth plan", 12, T.ink, "start", 600);
  }

  if (o.bx != null && o.body !== false) {
    const bs = o.bs ?? s;
    const by = o.by ?? o.oy;
    const B = (z, y) => [o.bx + z * bs, by + y * bs];
    line(poly([B(0, -12), B(0, base + 8)]), 0.75, T.graphite, `stroke-dasharray="14 3 2 3"`);
    line(poly([B(-80, base), B(80, base)]), 0.75, T.graphite);
    const dwl = seamDepth(3) + 7;
    line(poly([B(-84, dwl), B(84, dwl)]), 0.75, T.graphite, `stroke-dasharray="14 3 2 3"`);
    for (let k = 1; k < LIFTS; k++) line(poly([B(-76, seamDepth(k)), B(76, seamDepth(k))]), 0.5, T.pencil);
    // Sections: aft half to the left, forward half to the right, as the convention draws them.
    for (let i = 0; i <= 10; i++) {
      const x = Math.min(LENGTH - 0.5, (LENGTH * i) / 10);
      const top = sheer(x), bot = profile(x);
      if (bot - top < 0.5) continue;
      const side = i <= 5 ? -1 : 1;
      const pts = range(top, bot, 60).map((y) => B(side * halfBreadth(x, y), y));
      const w = i === 5 ? (o.bodyOutline ?? 1.6) : (o.bodyLine ?? 0.9);
      line(poly(pts), w, T.ink);
      if (i === 5) line(poly(range(top, bot, 60).map((y) => B(halfBreadth(x, y), y))), o.bodyOutline ?? 1.6, T.ink);
      if (o.labels !== false && i !== 5) {
        const p = B(side * halfBreadth(x, top), top);
        text(p[0] + side * 6, p[1] - 4, String(i), 9, T.graphite, side < 0 ? "end" : "start");
      }
    }
    if (o.captions !== false) text(B(0, 0)[0], by - 26, "Body plan", 12, T.ink, "middle", 600);
  }

  const defs = `<defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-50)"><rect width="5" height="5" fill="${T.film}"/><line x1="0" y1="0" x2="0" y2="5" stroke="${T.pencil}" stroke-width="1.1"/></pattern></defs>`;
  return `${defs}${out.join("")}`;
}
