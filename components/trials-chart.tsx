import { Fragment } from "react";
import { signatures } from "@/components/revisions";
import {
  addressOf,
  GAP,
  GRID,
  keyOf,
  PIN_WINDOWS,
  RUN_WINDOWS,
  type Win,
} from "@/lib/trials";
import { FITS, type Fit, fitsAt } from "@/lib/trials-fits";
import { signedOf, sweptTrial } from "@/lib/trials-words";

// The chart of every window the crew swept, and the crew's seven fits (.crew/sprint/65/contract.md;
// Iris's placement.md and words.md). Server HTML with no script of its own: with script the trials
// controller (lib/trials-live.ts) moves the ring, tries a tapped window and stamps the fits the
// frame enters, all from this markup (decisions.md, 4).
//
// The plot stretches to its column at a fixed height (placement.md, 4), so it scales unevenly, and
// only geometry lives in its units. `g[data-plot]` is in window px, x the width and y the height,
// flipped so height runs up, inside a nested svg whose viewBox is the grid with half a step on every
// side: the band's and the fits' shapes, which T16 and T21 read at every grid point, and the edge's
// line, with a non-scaling stroke. Everything with a size is drawn in the chart's own px: a dot is a
// near-zero circle with a round non-scaling stroke, which a stretch can't turn into an ellipse; the
// hatch is a px pattern clipped to the band's shape in bounding-box units; the soundings' targets,
// the labels and the axes are placed by percentages of the plot's box.

const [WIDTH, HEIGHT] = [GRID.width, GRID.height];
const HALF_W = WIDTH.step / 2;
const HALF_H = HEIGHT.step / 2;
/** The plot's edges in window px: the grid and half a step beyond it. */
const X0 = WIDTH.from - HALF_W;
const X1 = WIDTH.to + HALF_W;
const Y0 = HEIGHT.from - HALF_H;
const Y1 = HEIGHT.to + HALF_H;
/** The flip: a height h is drawn at FLIP - h, so the plot's foot is the grid's shortest window. */
const FLIP = Y0 + Y1;
const VIEW_BOX = `${X0} ${Y0} ${X1 - X0} ${Y1 - Y0}`;
const FLIPPED = `matrix(1 0 0 -1 0 ${FLIP})`;

const widths: number[] = [];
for (let w = WIDTH.from; w <= WIDTH.to; w += WIDTH.step) widths.push(w);
const heights: number[] = [];
for (let h = HEIGHT.from; h <= HEIGHT.to; h += HEIGHT.step) heights.push(h);

const round = (value: number, places: number) =>
  Math.round(value * 10 ** places) / 10 ** places;

/** Coordinates to a tenth, which is finer than any screen draws the plot. */
const n = (value: number) => String(round(value, 1));

/**
 * A window's place in the plot's box, as percentages, for what is drawn in px: to a thousandth of
 * a percent, a hundredth of a window px across the grid's 1,616.
 */
const percentOf = ([w, h]: Win) => ({
  x: `${round(((w - X0) / (X1 - X0)) * 100, 3)}%`,
  y: `${round(((Y1 - h) / (Y1 - Y0)) * 100, 3)}%`,
});

/** `hidden`, which React's SVG props don't name, on an svg element the window doesn't enter. */
const hiddenUnless = (shown: boolean) => (shown ? {} : { hidden: true });

type Point = readonly [number, number];

/**
 * A path through points, less any point on the line through its neighbours: a level run of widths
 * is one segment, and the page carries each path twice (its HTML and React's data).
 */
function pathOf(points: readonly Point[], close: boolean) {
  const corners = points.filter((point, at) => {
    const before = points[at - 1];
    const after = points[at + 1];
    if (!before || !after) return true;
    const turn =
      (point[0] - before[0]) * (after[1] - point[1]) -
      (point[1] - before[1]) * (after[0] - point[0]);
    return turn !== 0;
  });
  return `M${corners.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}${close ? "Z" : ""}`;
}

type Run = readonly [from: number, to: number];

/**
 * A fit's region of the grid as one closed path: each width holds one run of heights, and the
 * widths that hold one are side by side. Its top and foot pass half a step outside each width's run,
 * straight from width to width, so the path holds exactly the run's windows at the grid's points
 * (T21's rule, as T16's for the band) and a slanted bound (fit 1's 13:8, which no grid point lies
 * on) reads as a line; its sides stand half a step outside the first and last widths.
 */
function regionPath(runAt: (w: number) => Run | undefined) {
  const held = widths.flatMap((w) => {
    const run = runAt(w);
    return run ? [{ w, from: run[0], to: run[1] }] : [];
  });
  const first = held[0];
  const last = held.at(-1);
  if (!first || !last) return "";
  if ((last.w - first.w) / WIDTH.step + 1 !== held.length)
    throw new Error("A chart region's widths aren't side by side");
  const top: Point[] = [
    [first.w - HALF_W, first.to + HALF_H],
    ...held.map(({ w, to }): Point => [w, to + HALF_H]),
    [last.w + HALF_W, last.to + HALF_H],
  ];
  const foot: Point[] = [
    [last.w + HALF_W, last.from - HALF_H],
    ...held.map(({ w, from }): Point => [w, from - HALF_H]).reverse(),
    [first.w - HALF_W, first.from - HALF_H],
  ];
  return pathOf([...top, ...foot], true);
}

/** The run of heights at a width where `inside` holds, checked to be one run. */
function runOf(w: number, inside: (h: number) => boolean, what: string) {
  const ins = heights.filter((h) => inside(h));
  const from = ins[0];
  const to = ins.at(-1);
  if (from === undefined || to === undefined) return undefined;
  if ((to - from) / HEIGHT.step + 1 !== ins.length)
    throw new Error(`${what} isn't one run of heights at ${w} wide`);
  return [from, to] as const;
}

/** The grid windows whose links sink, by key, read once from the sweep. */
const SUNK = new Set(
  widths.flatMap((w) =>
    heights.flatMap((h) =>
      sweptTrial([w, h]).freeboard < 0 ? [keyOf([w, h])] : [],
    ),
  ),
);

// The band: every grid window whose links sink. In each width they are one run up from the
// shortest window (contract, call 1), so the band has one edge per width: the top of its run plus
// half a step, or the foot where nothing sinks. A sweep where a window sank above one that floats
// would need another drawing, so it fails the build.
const SINKING = widths.map((w) => {
  const run = runOf(w, (h) => SUNK.has(keyOf([w, h])), "The sinking windows");
  if (run && run[0] !== HEIGHT.from)
    throw new Error(`At ${w} wide the sinking windows don't start at the foot`);
  return { w, top: run ? run[1] + HALF_H : Y0 };
});

/**
 * The band's outline, one per run of side-by-side widths where something sinks: up from the foot,
 * stepped across each width's top, so it steps at the crew's widths, and down again. Runs are kept
 * apart: joined into one outline along the foot where nothing sinks (480 to 767), the outline ran
 * back over itself there, and Chromium filled it wrongly, the band's whole laptop end left empty.
 */
const BAND_RUNS = (() => {
  const runs: Point[][] = [];
  let points: Point[] = [];
  SINKING.forEach(({ w, top }, at) => {
    if (top === Y0) return;
    if (points.length === 0) points.push([w - HALF_W, Y0]);
    points.push([w - HALF_W, top], [w + HALF_W, top]);
    if ((SINKING[at + 1]?.top ?? Y0) !== Y0) return;
    points.push([w + HALF_W, Y0]);
    runs.push(points);
    points = [];
  });
  return runs;
})();

const BAND = BAND_RUNS.map((run) => pathOf(run, true)).join("");

/**
 * The band's edge, drawn: its outline less the foot, and less the climb where a run meets the
 * plot's side, so it runs along the top only, never along the foot or up the sides (placement.md, 4).
 */
const EDGE = BAND_RUNS.map((run) =>
  pathOf(
    run.filter(
      ([x], at) =>
        !((at === 0 || at === run.length - 1) && (x === X0 || x === X1)),
    ),
    false,
  ),
).join("");

const TOTAL = widths.length * heights.length;

const REGIONS = new Map(
  FITS.map((fit) => [
    fit.n,
    regionPath((w) => runOf(w, (h) => fit.enters([w, h]), `Fit ${fit.n}`)),
  ]),
);

/** The page's thousands, as the Log writes its counts: 13,029. */
const counted = (value: number) => value.toLocaleString("en-US");

/** Number words, capitalised, as the record's answers write a count (words.md, 4). */
const COUNT_WORDS = [
  "None",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
];
const countWord = (value: number) => COUNT_WORDS[value] ?? String(value);

// The crew's windows, each marked once (T17): the run of one-pixel steps at 900 tall, with the
// window at its end, is one mark; every other window is its own.
const RUN_MARK: readonly Win[] = [
  ...RUN_WINDOWS,
  ...PIN_WINDOWS.filter(
    (win) =>
      !RUN_WINDOWS.includes(win) &&
      win[1] === RUN_WINDOWS[0]?.[1] &&
      win[0] === (RUN_WINDOWS.at(-1)?.[0] ?? 0) + 1,
  ),
].toSorted((a, b) => a[0] - b[0]);
const MARKS: readonly (readonly Win[])[] = [
  ...PIN_WINDOWS.filter((win) => !RUN_MARK.includes(win)).map((win) => [win]),
  RUN_MARK,
];

/** The freeboard as data, to one decimal with an ASCII minus: "-6.2". */
const freeboardOf = (win: Win) => sweptTrial(win).freeboard.toFixed(1);

/**
 * A crew's window: a point drawn as a round non-scaling stroke, so it is a px dot at any stretch
 * (its stroke and width come from its group, or from the halo's `use`). A run is a bar from its
 * first window to its last, centred on their midpoint.
 */
function Pin({ wins }: { wins: readonly Win[] }) {
  const first = wins[0];
  const last = wins.at(-1);
  if (!first || !last) return null;
  const data = {
    "data-pin": "",
    "data-windows": wins.map(keyOf).join(" "),
    "data-freeboard": wins.map(freeboardOf).join(" "),
  };
  return wins.length === 1 ? (
    <circle {...data} cx={first[0]} cy={first[1]} r="0.01" />
  ) : (
    <path
      {...data}
      d={`M${first[0]} ${first[1]}H${last[0]}`}
      className="trials-pin-run"
    />
  );
}

/**
 * The four named windows, the chart's close calls (placement.md, 4): each number sits above its
 * dot, and 1366 × 595's to the right, its target starting 4 px left of the point, so the four 44 px
 * targets clear each other at 320.
 */
const SOUNDINGS: readonly { win: Win; side: "above" | "right" }[] = [
  { win: [456, 465], side: "above" },
  { win: [792, 575], side: "above" },
  { win: [1160, 635], side: "above" },
  { win: [1366, 595], side: "right" },
];

/** A window as it is heard: `1366 by 595` (Tb's rule). */
const heard = ([w, h]: Win) => `${w} by ${h}`;

function Sounding({ win, side }: (typeof SOUNDINGS)[number]) {
  const signed = signedOf(sweptTrial(win));
  const at = percentOf(win);
  // The target, pad and focus ring are sized in CSS by side and width; the dot is the point.
  return (
    <a
      href={addressOf(win)}
      data-sounding={keyOf(win)}
      data-side={side}
      aria-label={`${signed} pixels at ${heard(win)}`}
      className="trials-sounding"
    >
      {/* At the point; the link's name is its label, so its marks are hidden from the tree. */}
      <svg x={at.x} y={at.y} overflow="visible" aria-hidden="true">
        <rect className="trials-sounding-hit" />
        <rect className="trials-sounding-pad" />
        <rect className="trials-sounding-ring" />
        <circle r="1.5" className="trials-sounding-dot" />
        <text
          x={side === "right" ? 3 : 0}
          y="-9.5"
          className="trials-sounding-number"
        >
          {signed}
        </text>
      </svg>
    </a>
  );
}

/** The width labels; 1440 is left out, 29 px from 1280 at 320 (placement.md, 4). */
const WIDTH_LABELS = [320, 768, 1024, 1280, 1920];
const HEIGHT_LABELS = [460, 780, 1100];

/** The bounding-box matrix that lays window px over the plot's box, 0 to 1 each way. */
const BOX_MATRIX = [
  1 / (X1 - X0),
  0,
  0,
  -1 / (Y1 - Y0),
  -X0 / (X1 - X0),
  Y1 / (Y1 - Y0),
]
  .map((v) => String(round(v, 10)))
  .join(" ");

export function TrialsChart({ win }: { win: Win }) {
  const entered = fitsAt(win);
  const here = new Set(entered.map((fit) => fit.n));
  const k = entered.length;
  const gap = percentOf(GAP);
  return (
    <figure className="trials-chart" aria-labelledby="trials-chart-title">
      <div className="trials-chart-head">
        <h2 id="trials-chart-title">Every window</h2>
        {/* With script, the visit's count, whose digit and plank the controller writes, and the
          words a settle speaks; without it, the window's own fits (words.md, 3). The visit's digit
          is the server's only in CSS until the controller writes it, so without script the line's
          text holds no visit count (T21). */}
        <p
          data-found=""
          data-said={`{n} of ${FITS.length} fits found.`}
          data-said-all={`All ${FITS.length} fits found.`}
          className="trials-found"
        >
          <span className="trials-found-visit">
            <span aria-hidden="true" className="trials-found-plank" />
            <span className="trials-found-some">
              <span data-found-count="" data-k={k} />
              {` of ${FITS.length} fits found`}
            </span>
            <span className="trials-found-all">{`All ${FITS.length} fits found`}</span>
          </span>
          <span className="trials-found-window">
            {`This window is in ${k === 0 ? "none" : k} of the crew's ${FITS.length} fits`}
          </span>
        </p>
      </div>
      {/* Not role="img": it holds links (contract, call 4). Its title names it and the caption
        tells it. */}
      <svg data-chart="" className="trials-chart-svg">
        <title>Every window the crew swept, width across and height up</title>
        <defs>
          <pattern
            id="trials-hatch"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <path d="M0.5 0V6" className="trials-hatch-line" />
          </pattern>
          <clipPath id="trials-band-clip" clipPathUnits="objectBoundingBox">
            <use href="#trials-band" transform={`matrix(${BOX_MATRIX})`} />
          </clipPath>
        </defs>
        {/* The band's hatch in the chart's px, so it keeps its 135° and 6 px at any stretch. */}
        <rect
          width="100%"
          height="100%"
          clipPath="url(#trials-band-clip)"
          className="trials-chart-hatch"
        />
        <svg
          viewBox={VIEW_BOX}
          preserveAspectRatio="none"
          aria-hidden="true"
          className="trials-chart-plot"
        >
          {/* A tap target of the plot's own, a sibling of the soundings and not their ancestor:
            Chromium's touch adjustment would otherwise move a finger's tap near a sounding onto it
            (decisions.md, 6). It and the :hover rule on this svg (app/globals.css) make the spot a
            responder of its own; neither paints. */}
          <rect
            x={X0}
            y={Y0}
            width={X1 - X0}
            height={Y1 - Y0}
            className="trials-chart-hit"
          />
          <g data-plot="" transform={FLIPPED}>
            <path id="trials-band" data-band="" d={BAND} />
            {FITS.map((fit) => (
              <path
                key={fit.n}
                data-fit-region={fit.n}
                d={REGIONS.get(fit.n)}
                {...(here.has(fit.n) ? { "data-here": "" } : {})}
                {...hiddenUnless(here.has(fit.n))}
                className="trials-region"
              />
            ))}
            <path d={EDGE} className="trials-edge" />
            {/* The pins' film halo is a copy of them; the ink is set on the group around the
              originals, so the copy can take the film. */}
            <use href="#trials-pins" className="trials-pins-halo" />
            <g className="trials-pins-ink">
              <g id="trials-pins">
                {MARKS.map((wins) => (
                  <Pin key={keyOf(wins[0] ?? [0, 0])} wins={wins} />
                ))}
              </g>
            </g>
          </g>
        </svg>
        {/* The axes' numbers, for the eye: the caption says what the axes are. */}
        <svg aria-hidden="true" overflow="visible" className="trials-axis">
          {HEIGHT_LABELS.map((h) => (
            <text key={h} x="-5" y={percentOf([X0, h]).y}>
              {h}
            </text>
          ))}
          {WIDTH_LABELS.map((w) => (
            <svg
              key={w}
              x={percentOf([w, Y0]).x}
              y="100%"
              overflow="visible"
              aria-hidden="true"
              data-end={
                w === WIDTH.from ? "start" : w === WIDTH.to ? "end" : undefined
              }
            >
              <path d="M0 0V4" />
              <text y="15">{w}</text>
            </svg>
          ))}
        </svg>
        {/* The record's own gap, the one pin labelled. */}
        <svg
          x={gap.x}
          y={gap.y}
          overflow="visible"
          aria-hidden="true"
          className="trials-gap"
        >
          <rect />
          <text x="7">{signedOf(sweptTrial(GAP))}</text>
        </svg>
        {SOUNDINGS.map((sounding) => (
          <Sounding key={keyOf(sounding.win)} {...sounding} />
        ))}
        {/* The ring, last so nothing covers the frame's window: one circle at the shown window,
          which the controller moves by cx and cy, and two copies of it that draw the film inside
          and the dot, as non-scaling strokes on a near-zero circle, so it stays a round 16 px. */}
        <svg
          viewBox={VIEW_BOX}
          preserveAspectRatio="none"
          aria-hidden="true"
          className="trials-chart-plot trials-chart-top"
        >
          <g transform={FLIPPED}>
            <g className="trials-ring">
              <circle
                id="trials-ring"
                data-ring=""
                cx={win[0]}
                cy={win[1]}
                r="0.01"
              />
            </g>
            <use href="#trials-ring" className="trials-ring-film" />
            <use href="#trials-ring" className="trials-ring-dot" />
          </g>
        </svg>
      </svg>
      <figcaption>
        {`Width across, height up, hatched where the contact links sink: ${counted(SUNK.size)} of the ${counted(TOTAL)} windows swept. Dots are the crew's windows, the ring is the frame's, the numbers are close calls.`}
        <span className="trials-scripted">
          {" Tap anywhere to try that window."}
        </span>
        <span className="trials-unscripted">
          {" Each number opens its window."}
        </span>
      </figcaption>
    </figure>
  );
}

/** A width group, as The crew's windows name them (words.md, 4): from where a fit's windows start. */
const groupOf = (w: number) =>
  w < 768 ? "phones" : w < 1280 ? "tablets" : "laptops";

/** The sprints that wrote the fits, in order, each with its fits and the group they lay out. */
const SPRINTS = [...new Set(FITS.map((fit) => fit.sprint))].map((sprint) => {
  const fits = FITS.filter((fit) => fit.sprint === sprint);
  const first = widths.find((w) =>
    fits.some((fit) => heights.some((h) => fit.enters([w, h]))),
  );
  const entry = fits[0]?.entry;
  if (first === undefined || !entry)
    throw new Error(`Sprint ${sprint}'s fits enter no grid window`);
  return { sprint, fits, group: groupOf(first), entry };
});

/** A fit's stamp: its words, linked to its query's line, and where (words.md, 4). */
function Stamp({ fit, shown }: { fit: Fit; shown: boolean }) {
  return (
    <li
      data-fit={fit.n}
      data-query={fit.query}
      data-said={fit.said}
      hidden={!shown}
      className="trials-stamp"
    >
      <p className="trials-stamp-words">
        <a href={fit.href} className="trials-stamp-link">
          {fit.words}
        </a>
      </p>
      <p className="trials-stamp-where">{fit.where}</p>
    </li>
  );
}

/**
 * The crew's fits, last on the page (placement.md, 6), one group per sprint. Every state is CSS on
 * the stamps' `hidden` (app/globals.css, "The crew's fits"): a group with nothing shown reads how
 * many are left to find; once one shows, the sprint's line, its people and its first wrong turn.
 */
export function TrialsFits({ win }: { win: Win }) {
  const entered = fitsAt(win);
  return (
    <section
      className="trials-section trials-fits"
      aria-labelledby="trials-fits"
    >
      <h2 id="trials-fits">The crew's fits</h2>
      <p className="trials-note">
        {`${countWord(FITS.length)} layouts the crew wrote for a range of windows, so his name, facts and contact links stay on the first screen. Each shows here once the frame's window enters it, and its windows are outlined on the chart.`}
      </p>
      <ol className="trials-stamps">
        {SPRINTS.map(({ sprint, fits, group, entry }) => (
          <li key={sprint} data-sprint={sprint} className="trials-stamp-group">
            <span aria-hidden="true" className="trials-plank">
              <span>{sprint}</span>
            </span>
            <div>
              <p className="trials-stamp-none">
                {`${countWord(fits.length)} ${fits.length === 1 ? "fit" : "fits"} to find among the ${group}.`}
              </p>
              <ul className="trials-stamp-fits">
                {fits.map((fit) => (
                  <Fragment key={fit.n}>
                    <Stamp fit={fit} shown={entered.includes(fit)} />
                    <li className="trials-stamp-todo">
                      {`Another fit to find among the ${group}.`}
                    </li>
                  </Fragment>
                ))}
              </ul>
              <div data-sprint-line="" className="trials-stamp-line">
                <p className="trials-stamp-sprint">
                  <a href={`/log/${sprint}`} className="trials-stamp-record">
                    {`Sprint ${sprint}`}
                  </a>
                  {`: ${entry.goal}`}
                </p>
                <div className="trials-stamp-who">
                  <span>{`Pull request #${entry.pr}`}</span>
                  <dl>
                    {signatures(entry)
                      .slice(0, 3)
                      .map(([head, cell]) => (
                        <div key={head}>
                          <dt>{head}</dt>
                          <dd translate="no">{cell}</dd>
                        </div>
                      ))}
                  </dl>
                </div>
                <div className="trials-stamp-quote">
                  <p>What went wrong first, in the crew's words</p>
                  <blockquote>
                    <p>{fits[0]?.wentWrong}</p>
                  </blockquote>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
