import {
  ghostPlan,
  type Lettering,
  type LinesPlan,
  seatOf,
  shipsAt,
  theseusPlan,
} from "./lines-plan";
import { LIGHT, LIGHT_LINES } from "./site";

// The Log's two ships as a step's card draws them (app/log/[n]/opengraph-image.tsx;
// .crew/sprint/54/contract.md, "The drawings"): the page's Off drawing, the same path strings in the
// light tokens, since the card's renderer (satori) draws no WebGL and no CSS. Each ship is one SVG,
// handed over as a data URI for its box's background, with its plank numbers placed beside it in
// the card's pixels, to be set as text in the site's face: an SVG's own text would need fonts the
// image renderer doesn't have.

type Ship = "ghost" | "theseus";

/** A plank number, at its anchor in the drawing's pixels. */
type CardLetter = Pick<Lettering, "text" | "align"> & {
  x: number;
  y: number;
  /** The step's own seat: bolder, as on the page. */
  current: boolean;
};

export type CardShip = {
  src: string;
  width: number;
  height: number;
  letters: CardLetter[];
};

/**
 * Each line's weight in the card's pixels. A network shows the card at 0.3 to 0.46 of its size, so
 * its lines run about 1.5 times the page's (app/globals.css, "The ghost hull" and the Theseus after
 * it), which hold at every width there; the leaders keep the page's (Iris).
 */
const WEIGHT = {
  ghost: { outline: 2, plank: 1, current: 2 },
  theseus: { outline: 2.4, plank: 1.2, current: 3 },
  leader: 0.75,
} as const;

/** One decimal: a tenth of a unit is under a pixel at the card's size. */
const num = (v: number) => String(Math.round(v * 10) / 10);

/**
 * The ship's SVG at `width` x `height` pixels. `unit` is the viewBox's units per card pixel, so a
 * weight holds as the page's non-scaling strokes do.
 */
function svg(
  plan: LinesPlan,
  ship: Ship,
  current: string | undefined,
  { width, height, unit }: { width: number; height: number; unit: number },
) {
  const weight = WEIGHT[ship];
  // The current plank goes last, so its edge paints over its neighbours' where they share one.
  const planks = [
    ...plan.planks.filter((plank) => plank.id !== current),
    ...plan.planks.filter((plank) => plank.id === current),
  ].map((plank) => {
    const fill =
      ship === "ghost"
        ? LIGHT_LINES.vellum
        : plank.sprint === undefined
          ? LIGHT_LINES.cardOld
          : LIGHT_LINES.card;
    const mark = plank.id === current;
    const stroke = mark
      ? LIGHT.foreground
      : ship === "ghost"
        ? LIGHT_LINES.pencil
        : LIGHT.foreground;
    const w = mark ? weight.current : weight.plank;
    return `<path d="${plank.d}" fill="${fill}" stroke="${stroke}" stroke-width="${num(w * unit)}"/>`;
  });
  const outline = ship === "ghost" ? LIGHT.muted : LIGHT.foreground;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${plan.viewBox}" width="${width}" height="${height}">`,
    `<defs><clipPath id="hull"><path d="${plan.hull}"/></clipPath></defs>`,
    `<g clip-path="url(#hull)">${planks.join("")}</g>`,
    plan.lines.leaders
      ? `<path d="${plan.lines.leaders}" fill="none" stroke="${LIGHT.muted}" stroke-width="${num(WEIGHT.leader * unit)}"/>`
      : "",
    `<path d="${plan.lines.outline}" fill="none" stroke="${outline}" stroke-width="${num(weight.outline * unit)}" stroke-linejoin="round"/>`,
    "</svg>",
  ].join("");
}

function draw(
  plan: LinesPlan,
  ship: Ship,
  current: string | undefined,
  width: number,
): CardShip {
  const [, , boxWidth = width, boxHeight = 0] = plan.viewBox
    .split(" ")
    .map(Number);
  const unit = boxWidth / width;
  const height = Math.round(boxHeight / unit);
  const source = svg(plan, ship, current, { width, height, unit });
  return {
    src: `data:image/svg+xml;base64,${Buffer.from(source).toString("base64")}`,
    width,
    height,
    letters: plan.lettering.map(({ text, align, left, top, plank }) => ({
      text,
      align,
      x: (left / 100) * width,
      y: (top / 100) * height,
      current: plank !== undefined && plank === current,
    })),
  };
}

/**
 * Both ships as they stood after step `sprint` (lib/lines-plan.ts's `shipsAt`), `width` pixels
 * wide, the step's own seat marked on each: the Theseus, every plank, and the ghost, the originals
 * the crew has taken out. `merged` is the merged sprints, oldest first.
 */
export function cardShips(
  merged: readonly number[],
  sprint: number,
  width: number,
) {
  const ships = shipsAt(merged, sprint);
  const current = seatOf(merged, sprint);
  return {
    theseus: draw(theseusPlan(ships.theseus), "theseus", current, width),
    ghost: draw(ghostPlan(ships.ghost), "ghost", current, width),
  };
}
