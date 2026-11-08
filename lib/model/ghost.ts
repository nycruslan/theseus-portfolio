// The Log's ghost hull in the page (.crew/sprint/33/contract.md, "The numbers" and "The pick";
// notes-iris.md, sections 2 and 4): what the chunk reads off the 2D ghost the server drew, and its
// numbers riding their planks. The drawing is the record: the seats, their numbers, the record's
// own seat and the leaders all come from it, so the 3D can't disagree with the 2D. No three.js.

import {
  depths,
  GHOST,
  type Layout,
  LEAD_OUT as LEAD_OUT_2D,
  ledOut,
  numberX,
  numberY,
  ORDER,
  PENCIL,
  PLANKS,
} from "@/lib/hull-layouts";
import { LEAD_GAP, LEAD_OUT, LED_OUT } from "./calls";
import { bandAt, type Ghost, nearSide, plankBody, type Vec3 } from "./hull";
import type { Loft } from "./loft";
import { dotOf, type Pencil } from "./pencil";

/** One of the drawing's numbers: its span, its seat, and where the drawing sets it. */
type Label = {
  span: HTMLElement;
  seat: string | undefined;
  /** Its anchor, as shares of the drawing's box (the span's own left and top). */
  share: [number, number];
  /** The same point in hull units. */
  anchor: [number, number];
  /** The span is right-aligned on its anchor: the 2D leads it out (only 5.0's today). */
  end: boolean;
  /**
   * Led out aft of the hull from 768 px, with a leader into its plank: by the 2D drawing ("2d",
   * 5.0's, already there at frame 1), or by the 3D alone ("3d", LED_OUT's, riding out with e). Or
   * the sheet's pencil number on a seat the 2D leads out ("in"), which the hull brings in from the
   * 2D's place onto its plank, as every other pencil number rides (.crew/sprint/43/placement.md,
   * "Rider").
   */
  lead: "2d" | "3d" | "in" | undefined;
  /** Where a led-out number's right edge stands at rest, in hull units. */
  out: [number, number];
  /** Its leader's inner end, on the plank, in hull units; an "in" number's place on its plank. */
  into: [number, number];
  /**
   * The pencil plank's copper dot in the model's frame, while the crew is live: an "in" number
   * keeps clear of it, and every pencil number's chip lets it through, so the pen paints over the
   * chip as the 2D's does (.crew/sprint/44/contract.md, W12; P13).
   */
  dot?: Vec3 | null;
};

/** A number's place on its plank, drawn or not: what `riders` places, without the span. */
type Spot = Pick<Label, "seat" | "anchor" | "end" | "lead" | "out" | "into">;

/**
 * A seat's number where the 2D would set it once the seat is filled (lib/lines-plan.ts,
 * `numberPlank`): in its body's middle, or led out aft with a leader for a body too short, or led
 * out by the 3D (LED_OUT).
 */
function standIn(plank: (typeof PLANKS)[number]): Spot {
  const mid = (plank.yTop + plank.yBot) / 2;
  if (ledOut(depths(plank))) {
    const at: [number, number] = [plank.x0 - LEAD_OUT_2D, mid];
    return {
      seat: plank.id,
      anchor: at,
      end: true,
      lead: "2d",
      out: at,
      into: [plank.x1 - 2, mid],
    };
  }
  const anchor: [number, number] = [
    numberX(plank.id, false),
    numberY(plank.id, false) ?? mid,
  ];
  const lead = LED_OUT.includes(plank.id) ? "3d" : undefined;
  return {
    seat: plank.id,
    anchor,
    end: false,
    lead,
    out: lead ? [plank.x0 - LEAD_OUT, mid] : anchor,
    into: anchor,
  };
}

/** Hull units from a drawing's own (its viewBox's). */
const toHull = (
  { ox, oy, s }: Layout,
  x: number,
  y: number,
): [number, number] => [(x - ox) / s, (y - oy) / s];

/** A number's span where `layout`'s drawing sets it: its share of the box, and in hull units. */
function placeOf(span: HTMLElement, layout: Layout) {
  const [bx, by, bw, bh] = layout.box;
  const share: [number, number] = [
    Number.parseFloat(span.style.left) / 100,
    Number.parseFloat(span.style.top) / 100,
  ];
  return {
    share,
    anchor: toHull(layout, share[0] * bw + bx, share[1] * bh + by),
  };
}

/**
 * The sheet's pencil number (.crew/sprint/34/): the wide drawing's span on the pencil plank, which
 * rides it on the hull as the Log's numbers ride theirs. A number the 2D leads out (5.0's) has no
 * place on its plank in the drawing, but the hull's only label is centred on its plank whatever
 * its depth (notes-iris.md, 4.4): it rides in from the 2D's place onto its body's middle, clear of
 * the copper dot while live (.crew/sprint/43/placement.md, "Rider"). Stood aft of the turned hull,
 * it sat on the Base line.
 */
export function pencilLabel(
  drawing: Element,
  pencil: Pencil,
  layout: Layout,
): Label | null {
  const spans = [
    ...drawing.querySelectorAll<HTMLElement>(":scope > .plan-plank"),
  ];
  const span =
    spans.find((candidate) => candidate.classList.contains("plan-pencil")) ??
    spans.find((candidate) => candidate.textContent === pencil.sprint);
  if (!span) return null;
  const plank = PLANKS[pencil.slot];
  const label = {
    ...riderLabel(span, pencil.seat, layout),
    dot: pencil.live && plank ? dotOf(plank, layout) : null,
  };
  const body = plank && plankBody(plank);
  if (!span.classList.contains("plan-end") || !plank || !body) return label;
  const x = (body[0] + body[1]) / 2;
  const [top, bottom] = bandAt(plank, x) ?? [label.anchor[1], label.anchor[1]];
  return { ...label, end: true, lead: "in", into: [x, (top + bottom) / 2] };
}

/**
 * A number that rides its plank alone, `fixed` at its 2D anchor: the sheet's pencil number, centred
 * between its plank's projected edges at `seat`; or with no seat, /crew's focus number, at its
 * anchor's own point on the hull (.crew/sprint/36/contract.md, "The hull on /crew").
 */
export function riderLabel(
  span: HTMLElement,
  seat: string | undefined,
  layout: Layout,
): Label {
  const { share, anchor } = placeOf(span, layout);
  return {
    span,
    seat,
    share,
    anchor,
    end: false,
    lead: undefined,
    out: anchor,
    into: anchor,
  };
}

export type GhostPage = ReturnType<typeof readGhost>;

/** The ghost as the server drew it, read off `drawing` (`.plan-ghost`). */
export function readGhost(drawing: Element) {
  /** Each seat's number, the sprint that took its original out. */
  const numbers = new Map<string, number>();
  const seatOf = new Map<string, string>();
  for (const path of drawing.querySelectorAll(
    "path[data-plank][data-sprint]",
  )) {
    const seat = path.getAttribute("data-plank") ?? "";
    const sprint = path.getAttribute("data-sprint") ?? "";
    numbers.set(seat, Number(sprint));
    seatOf.set(sprint, seat);
  }
  const current =
    drawing.querySelector("path[data-current]")?.getAttribute("data-plank") ??
    undefined;
  const labels: Label[] = [
    ...drawing.querySelectorAll<HTMLElement>(":scope > .plan-plank"),
  ].map((span) => {
    const { share, anchor } = placeOf(span, GHOST);
    const seat = seatOf.get(span.textContent ?? "");
    const end = span.classList.contains("plan-end");
    const plank = PLANKS.find((candidate) => candidate.id === seat);
    // The 3D's own: at its lift's mid-depth, LEAD_OUT units aft of the plank, its leader into the
    // plank where the 2D sets its number, so the leader has no length at frame 1.
    const lead: Label["lead"] = end
      ? "2d"
      : seat && plank && LED_OUT.includes(seat)
        ? "3d"
        : undefined;
    const out: [number, number] =
      lead === "3d" && plank
        ? [plank.x0 - LEAD_OUT, (plank.yTop + plank.yBot) / 2]
        : anchor;
    return { span, seat, share, anchor, end, lead, out, into: anchor };
  });
  // The drawing's leaders, "M x y H x" each: each one's y is its number's, so the number names its
  // seat, and its inner end is the leader's into its plank.
  const d = drawing.querySelector(".ln-leader")?.getAttribute("d") ?? "";
  for (const [, , y0, x1] of d.matchAll(
    /M(-?[\d.]+)[ ,](-?[\d.]+)H(-?[\d.]+)/g,
  )) {
    const [bx, by] = toHull(GHOST, Number(x1), Number(y0));
    const label = labels.find(
      (candidate) => candidate.end && Math.abs(candidate.anchor[1] - by) < 0.5,
    );
    if (label) label.into = [bx, by];
  }
  const hull: Ghost = { seats: new Set(numbers.keys()) };
  return { numbers, current, labels, hull };
}

/**
 * A led-out number's leader at eased progress e, as a polyline on the near side in the model's
 * frame: from LEAD_GAP units short of the number into its plank. The 3D's own rides out with its
 * number from the plank, so at frame 1 it has no length.
 */
function leaderAt(label: Spot, e: number): Vec3[] {
  const [ox, oy] = [label.out[0] + LEAD_GAP, label.out[1]];
  const [ax, ay] =
    label.lead === "3d"
      ? [
          label.into[0] + (ox - label.into[0]) * e,
          label.into[1] + (oy - label.into[1]) * e,
        ]
      : [ox, oy];
  const [bx, by] = label.into;
  return Array.from({ length: 9 }, (_, i) =>
    nearSide(ax + ((bx - ax) * i) / 8, ay + ((by - ay) * i) / 8),
  );
}

type Box = { l: number; r: number; t: number; b: number };
type Plank = (typeof PLANKS)[number];
type Point = readonly [number, number];

/** A number with a leader to its plank: led out by the 2D or the 3D, not one the hull brings in. */
const leads = (label: Spot) => label.lead === "2d" || label.lead === "3d";

/**
 * The film chip's padding on each side of a pencil number on the hull, in CSS px (app/globals.css,
 * "The pencil's number"): an "in" number takes it once the loft begins, its digits where they were.
 */
const CHIP = 2;

/** What an "in" number's chip keeps clear of the copper dot's centre: its radius and 2 px of air. */
const DOT_CLEAR = PENCIL.tip.dot / 2 + 2;

/**
 * How far an "in" number's centre stays above its plank's lower edge, in CSS px: inside the hull's
 * outline by more than the outline's half width and a device pixel's rounding of the offset.
 */
const KEEL = 3;

/** The distance from a point to a box, 0 inside it. */
const apartFrom = (box: Box, [x, y]: Point) =>
  Math.hypot(
    Math.max(box.l - x, 0, x - box.r),
    Math.max(box.t - y, 0, y - box.b),
  );

/** A plank's edges on the near side as polylines in the model's frame: top, bottom and butts. */
function edgesOf(plank: Plank) {
  const xs = Array.from(
    { length: 97 },
    (_, i) => plank.x0 + ((plank.x1 - plank.x0) * i) / 96,
  ).filter((x) => bandAt(plank, x));
  const bands: [number, number][] = xs.map((x) => bandAt(plank, x) ?? [0, 0]);
  const butt = (i: number) => {
    const [top, bottom] = bands[i] ?? [0, 0];
    const x = xs[i] ?? 0;
    return Array.from({ length: 7 }, (_, j) =>
      nearSide(x, top + ((bottom - top) * j) / 6),
    );
  };
  return [
    xs.map((x, i) => nearSide(x, bands[i]?.[0] ?? 0)),
    xs.map((x, i) => nearSide(x, bands[i]?.[1] ?? 0)),
    butt(0),
    butt(xs.length - 1),
  ];
}

/**
 * The middle half of a plank's body, where its number may ride: the 2D's rule for the body
 * (`plankBody` in lib/lines-plan.ts: nearly a whole lift deep, or nearly as deep as the plank ever
 * gets), whose middle is the drawing's place. Searching the whole plank let numbers settle at its
 * ends, clumped at the stern and the bow (.crew/sprint/33/review-iris.md, Must 1).
 */
function middleOf(plank: Plank): Point | null {
  const body = plankBody(plank);
  if (!body) return null;
  const [first, last] = body;
  const [mid, quarter] = [(first + last) / 2, (last - first) / 4];
  return [mid - quarter, mid + quarter];
}

/** One canvas for measuring the digits' ink, made once. */
let measure: CanvasRenderingContext2D | null | undefined;

/**
 * How far a number's ink sits inside its span's box, in CSS px on each side: the glyphs' actual
 * bounds from the canvas's text metrics, against the baseline that a line box as tall as the font
 * (line-height 1) sets. Iris's bar is that no line crosses a digit's ink (early-look-iris.md).
 */
function inkInsets(span: HTMLElement) {
  measure ??= document.createElement("canvas").getContext("2d");
  const style = getComputedStyle(span);
  const [w, h] = [span.offsetWidth, span.offsetHeight];
  if (!measure || !w || !h) return { l: 0, r: 0, t: 0, b: 0 };
  measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const m = measure.measureText(span.textContent ?? "");
  const content = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
  const baseline = (h - content) / 2 + m.fontBoundingBoxAscent;
  return {
    l: Math.max(0, -m.actualBoundingBoxLeft),
    r: Math.max(0, w - m.actualBoundingBoxRight),
    t: Math.max(0, baseline - m.actualBoundingBoxAscent),
    b: Math.max(0, h - baseline - m.actualBoundingBoxDescent),
  };
}

/** The distance from a segment to a box, 0 where they meet. */
function reach(box: Box, [ax, ay]: Point, [bx, by]: Point) {
  const inside = (x: number, y: number) =>
    x >= box.l && x <= box.r && y >= box.t && y <= box.b;
  if (inside(ax, ay) || inside(bx, by)) return 0;
  // Sampled along the segment: the segments are a pixel or two long.
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i <= 4; i++) {
    const [x, y] = [ax + ((bx - ax) * i) / 4, ay + ((by - ay) * i) / 4];
    const dx = Math.max(box.l - x, 0, x - box.r);
    const dy = Math.max(box.t - y, 0, y - box.b);
    best = Math.min(best, Math.hypot(dx, dy));
  }
  return best;
}

/**
 * Settled numbers, by their pose and what they settled (`riders`' settle): a riffle swaps both
 * drawings a step, up to twelve times a second, and each swap's numbers would solve again, 16 ms
 * a step at 1x CPU at 1440. A number's place depends only on its own plank and the pose, so the
 * same numbers on the same pose are where they were. The newest SETTLED are kept.
 */
const settledOn = new Map<string, Map<string, { x: number; home: boolean }>>();
/** How far a drawn number's spot may be from its stand-in's and still be it, in hull units. */
const ROUNDED = 0.05;
/** A number's box and ink insets by its digits and the page's type for numbers (`bySize`). */
const boxes = new Map<
  string,
  {
    w: number;
    h: number;
    inset: { l: number; r: number; t: number; b: number };
  }
>();
const SETTLED = 64;

/**
 * Points in the model's frame, in general position, whose settled projection fingerprints a pose:
 * a quality step remakes the lofts, and the step back to the cap makes the same pose again.
 */
const POSE_PROBE: Vec3[] = [
  [0, 0, 0],
  [100, 0, 0],
  [0, 40, 0],
  [0, 0, 40],
  [100, 40, 40],
  [50, -20, -30],
  [30, 10, 20],
];

/**
 * The numbers riding their planks: each span's offset from its place in the drawing to its point as
 * the frame draws it, in custom properties that app/globals.css applies only while the model has a
 * state. A number's point is the screen midpoint between its plank's projected top and bottom edges,
 * since on the turned hull a band's projected middle isn't its middle's projection
 * (.crew/sprint/33/early-look-iris.md, must 2). At rest each takes the place in the middle half of
 * its plank's body 2 px clear of the other numbers and 1 px clear of every line drawn (both sides'
 * seams through the vellum, the outline, the record's mark, the leaders), nearest the 2D's place;
 * where none is, the 2D's place, the hardest planks placed first. A led-out number (5.0's in the
 * 2D, LED_OUT's in the 3D alone) stands aft at its leader's end. In the move each rides from the
 * 2D's place with e, so frame 1 is the drawing. `layout` is the drawing the spans are set on: the
 * Log's ghost, or on `/` the sheet's wide drawing, whose one number, the pencil plank's, is `fixed`
 * at its 2D anchor, centred on its plank wherever the turn leaves it (.crew/sprint/34/notes-iris.md,
 * 4.4): the hull's only label, it clears nothing.
 */
export function riders(
  { labels }: { labels: readonly Label[] },
  layout: Layout = GHOST,
  fixed = false,
) {
  const [, , BW, BH] = layout.box;
  const planks = labels.map((label) =>
    PLANKS.find((plank) => plank.id === label.seat),
  );
  /** Each label's settled x in hull units; a led-out one rides out instead. */
  let targets: number[] | null = null;

  /** Each span's width, read with the places: a 3D-led number's right edge goes on its point. */
  let widths: number[] = [];

  /**
   * A number's box and its digits' ink insets by its count of digits, at the record's bold weight.
   * The figures are tabular, so every number with as many digits is as wide, and a seat keeps its
   * first holder's number on every step: each seat's box is the same on every step, holds the
   * record's bold number, and moves no other number with the record.
   */
  const bySize = () => {
    const span = labels[0]?.span;
    const parent = span?.parentElement;
    const none = { w: 0, h: 0, inset: { l: 0, r: 0, t: 0, b: 0 } };
    if (!span || !parent) return () => none;
    // The numbers' type as the page sets it: a box probed once serves each drawing swapped in
    // after it, a riffle's a step, where each probe was a layout of the page.
    const style = getComputedStyle(span);
    const type = `${style.font}|${style.padding}|${style.letterSpacing}|${span.className}|${document.fonts.status}`;
    return (digits: number) => {
      const key = `${digits}|${type}`;
      const known = boxes.get(key);
      if (known) return known;
      const probe = span.cloneNode(false) as HTMLElement;
      probe.classList.remove("plan-end");
      probe.classList.add("plan-current");
      probe.textContent = "8".repeat(digits);
      probe.style.visibility = "hidden";
      parent.append(probe);
      const size = {
        w: probe.offsetWidth,
        h: probe.offsetHeight,
        inset: inkInsets(probe),
      };
      probe.remove();
      boxes.set(key, size);
      return size;
    };
  };

  /** A number's point (its box's anchor) and its plank's projected depth there, at x and e. */
  const pointAt = (i: number, loft: Loft, x: number, e: number) =>
    pointOf(labels[i], planks[i], widths[i] ?? 0, loft, x, e);

  /** The same for any seat's number, a drawn one's or one the step doesn't draw (`settle`). */
  const pointOf = (
    label: Spot | undefined,
    plank: Plank | undefined,
    width: number,
    loft: Loft,
    x: number,
    e: number,
  ) => {
    if (label?.lead === "3d") {
      const [ax, ay] = label.anchor;
      const [ox, oy] = label.out;
      const [px, py] = loft.screen(
        [nearSide(ax + (ox - ax) * e, ay + (oy - ay) * e)],
        e,
      )[0] ?? [0, 0];
      // Centred in the 2D, right-aligned on its leader's end once out.
      return { at: [px - (width / 2) * e, py] as const, depth: 0 };
    }
    if (!label || !plank || leads(label)) {
      return {
        at: loft.screen([nearSide(...(label?.anchor ?? [0, 0]))], e)[0] ?? [
          0, 0,
        ],
        depth: 0,
      };
    }
    const band = bandAt(plank, x) ?? [label.anchor[1], label.anchor[1]];
    const [top, bottom] = loft.screen(
      [nearSide(x, band[0]), nearSide(x, band[1])],
      e,
    );
    const [tx, ty] = top ?? [0, 0];
    const [bx, by] = bottom ?? [0, 0];
    // An "in" number's seat is a stern wedge whose lower edge is the keel's outline, and where its
    // chip clears the dot the wedge is a pixel or two deep: its centre keeps KEEL px above that
    // edge, so it stays on the hull and not on its shadow.
    const keel = label.lead === "in" ? by - KEEL : Number.POSITIVE_INFINITY;
    return {
      at: [(tx + bx) / 2, Math.min((ty + by) / 2, keel)] as const,
      depth: Math.hypot(bx - tx, by - ty),
    };
  };

  /**
   * An "in" number's point at eased progress e, its digits' right edge: from the 2D's place riding
   * the hull, right-aligned there, to its place x on its plank, centred there, so frame 1 is the
   * drawing and the rest frame has it half its width on.
   */
  const inAt = (i: number, loft: Loft, x: number, e: number): Point => {
    const [ax, ay] = loft.screen(
      [nearSide(...(labels[i]?.out ?? [0, 0]))],
      e,
    )[0] ?? [0, 0];
    const [bx, by] = pointAt(i, loft, x, e).at;
    return [
      ax + (bx - ax) * e + ((widths[i] ?? 0) / 2) * e,
      ay + (by - ay) * e,
    ];
  };

  /**
   * Where an "in" number settles on its plank, in hull units: its body's middle, or while live,
   * where its chip there would come within DOT_CLEAR of the copper dot's centre (the chip is HTML
   * over the canvas and would hide it), the first place toward the plank's stern end that clears
   * it, a quarter unit apart (.crew/sprint/43/placement.md, "Rider"). Its digits' width is read
   * with it, since the number ends centred on that place: 11 px below 712 px tall, 13 above.
   */
  const seatIn = (i: number, loft: Loft) => {
    const label = labels[i];
    const plank = planks[i];
    if (!label || !plank) return label?.anchor[0] ?? 0;
    const { span } = label;
    const style = getComputedStyle(span);
    // The layout box, not offsetWidth, which rounds to a whole px; a translate doesn't size it.
    const size = span.getBoundingClientRect();
    const digits =
      size.width -
      Number.parseFloat(style.paddingLeft) -
      Number.parseFloat(style.paddingRight);
    widths[i] = digits;
    const [x, dot] = [label.into[0], label.dot];
    if (!dot) return x;
    const [w, h] = [digits + 2 * CHIP, size.height];
    const centre = loft.screen([dot], 1)[0] ?? [0, 0];
    // Each offset is snapped to a device pixel (place), which moves the box by up to half of one.
    const clear = DOT_CLEAR + 1 / devicePixelRatio;
    let last = x;
    for (let at = x; at >= plank.x0 && bandAt(plank, at); at -= 0.25) {
      const [px, py] = pointAt(i, loft, at, 1).at;
      const box = {
        l: px - w / 2,
        r: px + w / 2,
        t: py - h / 2,
        b: py + h / 2,
      };
      if (apartFrom(box, centre) >= clear) return at;
      last = at;
    }
    return last;
  };

  const settle = (loft: Loft, drawn: Float32Array) => {
    // Every seat's number, as the 2D numbers it: the drawing's own, and the step's others where the
    // 2D would set them once their seats are filled (Iris, press-iris.md 7, "Second look"). Each is
    // placed as if all were drawn, at its seat's box (`bySize`), so a number's place depends only
    // on its own plank and the pose: a step changes no number but its own seat's, and cold loads of
    // two steps agree. The seats a step doesn't number stand in, placed but never shown.
    const drawnSeats = new Set(labels.map((label) => label.seat));
    const spots: Spot[] = [
      ...labels,
      ...PLANKS.filter((plank) => !drawnSeats.has(plank.id)).map(standIn),
    ];
    // A stand-in's number is its seat's first holder to come, with as many digits as the seat's
    // place in ORDER counts: sprints 1 to 9 each took a seat, in ORDER's first nine.
    const size = bySize();
    const sizes = spots.map((spot, i) =>
      size(
        labels[i]?.span.textContent?.trim().length ||
          String(ORDER.indexOf(spot.seat ?? "") + 1).length,
      ),
    );
    widths = labels.map(({ span }) => span.offsetWidth);
    // The same spots at the same sizes on this pose settle where they did: a riffle's step, whose
    // drawings are new nodes, reuses its neighbour's places. A drawn number's spot is its seat's
    // stand-in as the 2D rounds it (to 0.01% of the drawing: 0.03 hull units at most, about 0.1
    // px), so it is keyed as the stand-in, and the steps 1 to 22, each numbering one seat more,
    // share one solve. A number the solve set at its 2D place keeps its own (`home`).
    const canon = (spot: Spot, i: number): Spot => {
      const plank = i < labels.length ? planks[i] : undefined;
      if (!plank) return spot;
      const stand = standIn(plank);
      const near = (a: readonly number[], b: readonly number[]) =>
        Math.abs((a[0] ?? 0) - (b[0] ?? 0)) <= ROUNDED &&
        Math.abs((a[1] ?? 0) - (b[1] ?? 0)) <= ROUNDED;
      return stand.end === spot.end &&
        stand.lead === spot.lead &&
        near(spot.anchor, stand.anchor) &&
        near(spot.out, stand.out) &&
        near(spot.into, stand.into)
        ? stand
        : spot;
    };
    const key = [
      loft.screen(POSE_PROBE, 1).flat(),
      devicePixelRatio,
      drawn.length,
      // By seat: the drawn come first, so a step that numbers one more reorders them.
      ...spots
        .map((spot, i) => {
          const c = canon(spot, i);
          return `${c.seat}:${c.anchor}:${c.end}:${c.lead}:${c.out}:${c.into}:${sizes[i]?.w}:${sizes[i]?.h}:${Object.values(sizes[i]?.inset ?? {})}`;
        })
        .sort(),
    ].join("|");
    const found = settledOn.get(key);
    if (found) {
      return labels.map((label) => {
        const place = found.get(label.seat ?? "");
        return !place || place.home ? label.anchor[0] : place.x;
      });
    }
    const xs = solve(loft, drawn, spots, sizes);
    settledOn.set(
      key,
      new Map(
        spots.map((spot, i) => {
          const x = xs[i] ?? spot.anchor[0];
          return [spot.seat ?? "", { x, home: x === spot.anchor[0] }];
        }),
      ),
    );
    for (const old of settledOn.keys()) {
      if (settledOn.size <= SETTLED) break;
      settledOn.delete(old);
    }
    return labels.map((label, i) => xs[i] ?? label.anchor[0]);
  };

  /** Every spot's settled x in hull units, clear of the lines `drawn` and of each other. */
  const solve = (
    loft: Loft,
    drawn: Float32Array,
    spots: readonly Spot[],
    sizes: readonly { w: number; h: number; inset: Box }[],
  ) => {
    // The clearances hold after each box is rounded to the device's pixels; a line's ink is
    // measured from its centre, so 1 px past the widest line's half (the outline's, 1.4 px).
    const round = 1 / devicePixelRatio;
    const gap = 2 + round;
    const ink = 1 + 0.7;
    // Every line the settled frame draws, on screen, in 24 px cells: the far side's seams show
    // through the near side's vellum, so a number clears them too; and the leaders.
    const CELL = 24;
    const cells = new Map<string, [Point, Point][]>();
    const add = (a: Point, b: Point) => {
      for (
        let cx = Math.floor(Math.min(a[0], b[0]) / CELL);
        cx <= Math.floor(Math.max(a[0], b[0]) / CELL);
        cx++
      ) {
        for (
          let cy = Math.floor(Math.min(a[1], b[1]) / CELL);
          cy <= Math.floor(Math.max(a[1], b[1]) / CELL);
          cy++
        ) {
          const key = `${cx}:${cy}`;
          const list = cells.get(key) ?? [];
          list.push([a, b]);
          cells.set(key, list);
        }
      }
    };
    const pairs: Vec3[] = [];
    for (let i = 0; i + 5 < drawn.length; i += 3) {
      if ((i / 3) % 2 === 0) {
        pairs.push(
          [drawn[i] ?? 0, drawn[i + 1] ?? 0, drawn[i + 2] ?? 0],
          [drawn[i + 3] ?? 0, drawn[i + 4] ?? 0, drawn[i + 5] ?? 0],
        );
      }
    }
    const flat = loft.screen(pairs, 1);
    for (let i = 0; i + 1 < flat.length; i += 2) {
      const [a, b] = [flat[i], flat[i + 1]];
      if (a && b) add(a, b);
    }
    const spotPlanks = spots.map((spot) =>
      PLANKS.find((plank) => plank.id === spot.seat),
    );
    for (const label of spots) {
      if (!leads(label)) continue;
      const line = loft.screen(leaderAt(label, 1), 1);
      for (let j = 1; j < line.length; j++) {
        const [a, b] = [line[j - 1], line[j]];
        if (a && b) add(a, b);
      }
    }
    /** The lines whose cells a box, grown by `ink`, touches. */
    const nearBox = (box: Box) => {
      const found = new Set<[Point, Point]>();
      for (
        let cx = Math.floor((box.l - ink) / CELL);
        cx <= Math.floor((box.r + ink) / CELL);
        cx++
      ) {
        for (
          let cy = Math.floor((box.t - ink) / CELL);
          cy <= Math.floor((box.b + ink) / CELL);
          cy++
        ) {
          for (const segment of cells.get(`${cx}:${cy}`) ?? [])
            found.add(segment);
        }
      }
      return found;
    };
    type Place = { x: number; box: Box; score: number; d: number };
    /** Each number's places along its plank, with how clear each is of the plank's lines. */
    const places = spots.map((label, i): Place[] => {
      const plank = spotPlanks[i];
      const {
        w = 0,
        h = 0,
        inset = { l: 0, r: 0, t: 0, b: 0 },
      } = sizes[i] ?? {};
      const boxAt = ([x, y]: Point): Box =>
        label.end
          ? { l: x - w, r: x, t: y - h / 2, b: y + h / 2 }
          : { l: x - w / 2, r: x + w / 2, t: y - h / 2, b: y + h / 2 };
      if (label.lead || !plank) {
        const x = label.anchor[0];
        return [
          {
            x,
            box: boxAt(pointOf(label, plank, w, loft, x, 1).at),
            score: ink,
            d: 0,
          },
        ];
      }
      const [top, bottom, ...butts] = edgesOf(plank).map((line) =>
        loft.screen(line, 1),
      );
      /**
       * How clear a number's digits are of the lines, in px: their slack to the plank's projected
       * top and bottom edges over their width (negative where a seam crosses them), and their
       * distance from its butts and every other line drawn. At least `ink` is clear.
       */
      const clearance = (outer: Box) => {
        // The digits' ink, not the span's box: a line through its margin doesn't show.
        const box: Box = {
          l: outer.l + inset.l,
          r: outer.r - inset.r,
          t: outer.t + inset.t,
          b: outer.b - inset.b,
        };
        const ys = (line: readonly Point[] | undefined) => {
          const found: number[] = [];
          (line ?? []).forEach(([x, y], j) => {
            if (x >= box.l && x <= box.r) found.push(y);
            const [px, py] = line?.[j - 1] ?? [x, y];
            for (const edge of [box.l, box.r]) {
              if ((px - edge) * (x - edge) < 0) {
                found.push(py + ((y - py) * (edge - px)) / (x - px));
              }
            }
          });
          return found;
        };
        const above = ys(top);
        const below = ys(bottom);
        let score = Math.min(
          above.length ? box.t - Math.max(...above) : Number.POSITIVE_INFINITY,
          below.length ? Math.min(...below) - box.b : Number.POSITIVE_INFINITY,
        );
        for (const line of butts) {
          for (let j = 1; j < line.length; j++) {
            score = Math.min(
              score,
              reach(box, line[j - 1] ?? [0, 0], line[j] ?? [0, 0]),
            );
          }
        }
        for (const [a, b] of nearBox(box)) {
          score = Math.min(score, reach(box, a, b));
        }
        return score;
      };
      // The 2D's place, then every place a unit apart in the middle half of the plank's body.
      const [lo, hi] = middleOf(plank) ?? [label.anchor[0], label.anchor[0]];
      const xs = [label.anchor[0]];
      for (let x = Math.ceil(lo); x <= hi; x += 1) xs.push(x);
      const found: Place[] = [];
      for (const x of xs) {
        const box = boxAt(pointOf(label, plank, w, loft, x, 1).at);
        found.push({
          x,
          box,
          score: clearance(box),
          d: Math.abs(x - label.anchor[0]),
        });
      }
      return found;
    });
    const apart = (box: Box, other: Box) =>
      Math.max(box.l, other.l) - Math.min(box.r, other.r) >= gap ||
      Math.max(box.t, other.t) - Math.min(box.b, other.b) >= gap;
    /**
     * Of a number's places 2 px clear of the others, nearest the 2D's place: the first clear of the
     * lines; where none is, the first, so the number keeps its plank's middle and touches a line
     * (Iris accepts the stern's and keel's touches; review-iris.md, the decision on the touches).
     * Where no place is clear of the others, the 2D's place, held so the others make way.
     */
    const choose = (i: number, others: readonly Box[]) => {
      const open = (places[i] ?? [])
        .filter((place) => others.every((other) => apart(place.box, other)))
        .sort((a, b) => a.d - b.d);
      return (
        open.find((place) => place.score >= ink) ?? open[0] ?? places[i]?.[0]
      );
    };
    // The hardest first, the planks whose clearest place is least clear (the keel's and the
    // stern's), so the roomier ones make way; then each again with all the others set.
    const hardest = (i: number) =>
      Math.max(...(places[i] ?? []).map((place) => place.score));
    const order = spots
      .map((_, i) => i)
      .sort((a, b) => hardest(a) - hardest(b));
    const chosen: (Place | undefined)[] = spots.map(() => undefined);
    const boxes = () =>
      chosen
        .filter((place): place is Place => Boolean(place))
        .map((place) => place.box);
    for (const i of order) chosen[i] = choose(i, boxes());
    for (let pass = 0; pass < 2; pass++) {
      for (const i of order) {
        const mine = chosen[i];
        chosen[i] = undefined;
        chosen[i] = choose(i, boxes()) ?? mine;
      }
    }
    return spots.map((spot, i) => chosen[i]?.x ?? spot.anchor[0]);
  };

  return {
    /** A new fit or loft: the places are solved again at the next frame. */
    reset() {
      targets = null;
    },
    /**
     * Sets each number at eased progress e on `loft`, whose drawing is `k` CSS px a unit, clear of
     * the lines `drawn` gives (segment pairs in the model's frame, read when the places are solved);
     * below 768 px, where the numbers are hidden, it clears them instead.
     */
    place(
      loft: Loft,
      k: number,
      e: number,
      shown: boolean,
      drawn: () => Float32Array,
      /** The drawing's top left in the canvas, where the canvas holds two (the Log's ships). */
      origin: readonly [number, number] = [0, 0],
    ) {
      if (!shown) return this.clear();
      targets ??= fixed
        ? labels.map((label, i) =>
            label.lead === "in" ? seatIn(i, loft) : label.anchor[0],
          )
        : settle(loft, drawn());
      const now = targets;
      // Each offset is a whole number of device pixels, in the move (so frame 1 moves nothing) and
      // at rest, so a span's translate never carries a fraction that a composited span would draw
      // its digits between pixels by (Iris's review of sprint 34). The places' clearances allow
      // the device pixel this can move a box (settle's `round`).
      const step = 1 / devicePixelRatio;
      const snap = (n: number) => Math.round(n / step) * step;
      labels.forEach((label, i) => {
        const [ax] = label.anchor;
        const [px, py] =
          label.lead === "in"
            ? inAt(i, loft, now[i] ?? label.into[0], e)
            : pointAt(i, loft, ax + ((now[i] ?? ax) - ax) * e, e).at;
        // The span's own place on the canvas, which lies on the drawing's box: frame 1's point.
        const [x0, y0] = [
          origin[0] + label.share[0] * BW * k,
          origin[1] + label.share[1] * BH * k,
        ];
        const [gx, gy] = [snap(px - x0), snap(py - y0)];
        const { style } = label.span;
        style.setProperty("--ghost-x", `${gx}px`);
        style.setProperty("--ghost-y", `${gy}px`);
        // The copper dot from the number's anchor where it now stands: the chip's hole for the pen
        // (app/globals.css, "The pen over the chip"), at the dot's exact place in every frame.
        const dot = label.dot && loft.screen([label.dot], e)[0];
        if (dot) {
          style.setProperty("--dot-x", `${dot[0] - x0 - gx}px`);
          style.setProperty("--dot-y", `${dot[1] - y0 - gy}px`);
        }
      });
    },
    /**
     * The led-out numbers' leaders at eased progress e, each with its seat, as polylines in the
     * model's frame: none at frame 1, since the 2D draws its own, and none below 768 px.
     */
    leaders(e: number, shown: boolean) {
      if (!shown || e <= 0) return [];
      return labels
        .filter((label) => leads(label) && label.seat)
        .map((label) => ({
          seat: label.seat ?? "",
          points: leaderAt(label, e),
        }));
    },
    /** Every number back at its place in the drawing. */
    clear() {
      for (const { span } of labels) {
        for (const name of ["--ghost-x", "--ghost-y", "--dot-x", "--dot-y"]) {
          span.style.removeProperty(name);
        }
      }
    },
  };
}

/** Whether (x, y) is within `reach` of a polyline. */
export function near(
  points: readonly (readonly [number, number])[],
  x: number,
  y: number,
  reach: number,
) {
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i] ?? [0, 0];
    const [bx, by] = points[i + 1] ?? [0, 0];
    const [dx, dy] = [bx - ax, by - ay];
    const t = Math.min(
      1,
      Math.max(0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)),
    );
    if (Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) <= reach) return true;
  }
  return false;
}
