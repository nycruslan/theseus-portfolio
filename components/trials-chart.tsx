import type { CSSProperties } from "react";
import { signatures } from "@/components/revisions";
import {
  addressOf,
  GRID,
  keyOf,
  PIN_WINDOWS,
  RUN_WINDOWS,
  sizeOf,
  type Win,
} from "@/lib/trials";
import { FITS, type Fit, fitsAt } from "@/lib/trials-fits";
import { signedOf, sweptTrial } from "@/lib/trials-words";

// The chart of every window the crew swept (.crew/sprint/65/contract.md; Iris's placement.md and
// words.md), and the seven fits' stamps. Server HTML, no script of its own: with script the
// trials controller (lib/trials-live.ts) moves the ring, tries a tapped window and stamps the fits
// the frame enters, all from this markup (decisions.md, 4).
//
// Two coordinate systems. The plot (`g[data-plot]`) is in window px, x the width and y the height,
// flipped so height runs up: the band, the fits' regions, the pins and the ring are drawn there, in
// a nested svg whose viewBox is the grid with half a step on every side, so the chart scales evenly
// with its column and every grid window sits half a step from any edge. The soundings are links,
// which must be 44 px targets below 1024 and 24 px from it (T8) at any scale, so they sit in the
// outer svg's own px, placed at their window by percentages of the chart's box.

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

const widths: number[] = [];
for (let w = WIDTH.from; w <= WIDTH.to; w += WIDTH.step) widths.push(w);
const heights: number[] = [];
for (let h = HEIGHT.from; h <= HEIGHT.to; h += HEIGHT.step) heights.push(h);

const round = (value: number, places: number) =>
  Math.round(value * 10 ** places) / 10 ** places;

/** Coordinates to a tenth, which is finer than any screen draws the plot. */
const n = (value: number) => String(round(value, 1));

/**
 * A window's place in the chart's box, as percentages, for what is drawn in px: to a thousandth
 * of a percent, a hundredth of a window px across the grid's 1,616.
 */
const percentOf = ([w, h]: Win) => ({
  x: `${round(((w - X0) / (X1 - X0)) * 100, 3)}%`,
  y: `${round(((Y1 - h) / (Y1 - Y0)) * 100, 3)}%`,
});

/** `hidden`, which React's SVG props don't name, on an svg element the window doesn't enter. */
const hiddenUnless = (shown: boolean) => (shown ? {} : { hidden: true });

/**
 * A region of the grid drawn as one path: for each width it holds one run of heights, `[from, to]`
 * or none, and the widths that hold one are side by side. Its edges run half a step outside the
 * run at each width, straight from width to width, so the path holds exactly the run's windows at
 * the grid's points (T16's rule, and T21's for the fits).
 */
function regionPath(
  runAt: (w: number) => readonly [number, number] | undefined,
) {
  const held = widths.flatMap((w) => {
    const run = runAt(w);
    return run ? [{ w, from: run[0], to: run[1] }] : [];
  });
  const first = held[0];
  const last = held.at(-1);
  if (!first || !last) return "";
  if ((last.w - first.w) / WIDTH.step + 1 !== held.length)
    throw new Error("A chart region's widths aren't side by side");
  const top = held.map(({ w, to }) => [w, to + HALF_H] as const);
  const foot = held.map(({ w, from }) => [w, from - HALF_H] as const).reverse();
  const points: (readonly [number, number])[] = [
    [first.w - HALF_W, first.to + HALF_H],
    ...top,
    [last.w + HALF_W, last.to + HALF_H],
    [last.w + HALF_W, last.from - HALF_H],
    ...foot,
    [first.w - HALF_W, first.from - HALF_H],
  ];
  // A point on the line through its neighbours changes nothing the path holds: dropped, a level
  // run of widths is one segment, and the page carries the path twice (its HTML and React's data).
  const corners = points.filter((point, at) => {
    const before = points[at - 1];
    const after = points[at + 1];
    if (!before || !after) return true;
    const turn =
      (point[0] - before[0]) * (after[1] - point[1]) -
      (point[1] - before[1]) * (after[0] - point[0]);
    return turn !== 0;
  });
  return `M${corners.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}Z`;
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
// shortest window (contract, call 1), so the band has one edge per width, down to the foot itself
// where nothing sinks (an empty run, its top half a step under the shortest window). A sweep where
// a window sank above one that floats would need another drawing, so it fails the build.
const BAND = regionPath((w) => {
  const run = runOf(w, (h) => SUNK.has(keyOf([w, h])), "The sinking windows");
  if (run && run[0] !== HEIGHT.from)
    throw new Error(`At ${w} wide the sinking windows don't start at the foot`);
  return run ?? [HEIGHT.from, HEIGHT.from - HEIGHT.step];
});

const TOTAL = widths.length * heights.length;

const REGIONS = new Map(
  FITS.map((fit) => [
    fit.n,
    regionPath((w) => runOf(w, (h) => fit.enters([w, h]), `Fit ${fit.n}`)),
  ]),
);

/** The chart's name (words.md). */
const CHART_TITLE = "Every window the crew swept, by width and height";

/** The page's thousands, as the Log writes its counts: 13,029. */
const counted = (value: number) => value.toLocaleString("en-US");

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

function Pin({ wins }: { wins: readonly Win[] }) {
  const first = wins[0];
  const last = wins.at(-1);
  if (!first || !last) return null;
  const data = {
    "data-pin": "",
    "data-windows": wins.map(keyOf).join(" "),
    "data-freeboard": wins.map(freeboardOf).join(" "),
  };
  // A run is a bar from its first window to its last, centred on their midpoint.
  return wins.length === 1 ? (
    <circle {...data} cx={first[0]} cy={first[1]} className="trials-pin" />
  ) : (
    <path
      {...data}
      d={`M${first[0]} ${first[1]}H${last[0]}`}
      className="trials-pin trials-pin-run"
    />
  );
}

/** Iris's soundings (placement.md): the four named near misses first. */
const SOUNDINGS: readonly Win[] = [
  [456, 465],
  [792, 575],
  [1160, 635],
  [1366, 595],
];

/**
 * Px a sounding's target moves across, its dot staying on its point, on a chart too narrow for two
 * 44 px targets to sit centred: 1160 and 1366 wide are 206 window px apart, 36.7 px of a 288 px
 * chart at 320, so below 24rem each target gives way 4 px and still holds its point.
 */
const NUDGE: Readonly<Record<string, number>> = {
  "1160x635": -4,
  "1366x595": 4,
};

function Sounding({ win }: { win: Win }) {
  const trial = sweptTrial(win);
  const at = percentOf(win);
  const nudge = NUDGE[keyOf(win)];
  const style: CSSProperties & Record<`--${string}`, string> = {
    "--x": at.x,
    "--y": at.y,
    ...(nudge ? { "--nudge": `${nudge}px` } : {}),
  };
  return (
    <a
      href={addressOf(win)}
      data-sounding={keyOf(win)}
      aria-label={`${sizeOf(win)}, ${signedOf(trial)} px`}
      className="trials-sounding"
      style={style}
    >
      <rect className="trials-sounding-hit" />
      <circle cx={at.x} cy={at.y} className="trials-sounding-dot" />
      <text x={at.x} y={at.y} className="trials-sounding-number">
        {signedOf(trial)}
      </text>
    </a>
  );
}

export function TrialsChart({ win }: { win: Win }) {
  const entered = new Set(fitsAt(win).map((fit) => fit.n));
  return (
    <figure className="trials-chart" aria-labelledby="trials-chart-words">
      {/* Not role="img": it holds links (contract, call 4). Its title names it, and the
        figure's caption tells it. */}
      <svg data-chart="" className="trials-chart-svg">
        <title>{CHART_TITLE}</title>
        <defs>
          <pattern
            id="trials-hatch"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <path d="M0 0V24" className="trials-hatch-line" />
          </pattern>
        </defs>
        <svg
          viewBox={`${X0} ${Y0} ${X1 - X0} ${Y1 - Y0}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          className="trials-chart-plot"
        >
          <g data-plot="" transform={`matrix(1 0 0 -1 0 ${FLIP})`}>
            {FITS.map((fit) => (
              <path
                key={fit.n}
                data-fit-region={fit.n}
                d={REGIONS.get(fit.n)}
                {...hiddenUnless(entered.has(fit.n))}
                className="trials-region"
              />
            ))}
            <path data-band="" d={BAND} className="trials-band" />
            {MARKS.map((wins) => (
              <Pin key={keyOf(wins[0] ?? [0, 0])} wins={wins} />
            ))}
            <circle
              data-ring=""
              cx={win[0]}
              cy={win[1]}
              className="trials-ring"
            />
          </g>
        </svg>
        {SOUNDINGS.map((sounding) => (
          <Sounding key={keyOf(sounding)} win={sounding} />
        ))}
      </svg>
      <figcaption id="trials-chart-words">
        {`Every window the crew swept, ${counted(TOTAL)} of them: the links sink in the ${counted(SUNK.size)} hatched along the foot.`}
      </figcaption>
    </figure>
  );
}

/** A fit's stamp, shown when the shown window enters its query (contract, T19 and T20). */
function Stamp({ fit, shown }: { fit: Fit; shown: boolean }) {
  const names = signatures(fit.entry).slice(0, 3);
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
      <p className="trials-stamp-sprint">
        <a href={`/log/${fit.sprint}`} className="trials-stamp-record">
          {`Sprint ${fit.sprint}`}
        </a>
        {`, pull request #${fit.pr}`}
      </p>
      <dl className="trials-stamp-names">
        {names.map(([head, cell]) => (
          <div key={head}>
            <dt>{head}</dt>
            <dd translate="no">{cell}</dd>
          </div>
        ))}
      </dl>
      <blockquote className="trials-stamp-quote">
        <p>{fit.wentWrong}</p>
      </blockquote>
    </li>
  );
}

export function TrialsFits({ win }: { win: Win }) {
  const entered = fitsAt(win);
  return (
    <section className="trials-section" aria-labelledby="trials-fits">
      <h2 id="trials-fits">The crew's fits</h2>
      {/* With script, the visit's count, whose digit alone the controller writes; without it, the
        fits this window is in, since nothing counts a visit (contract, T21). */}
      <p data-found="" className="trials-note">
        <span className="trials-found-visit">
          <span data-found-count="">{entered.length}</span>
          {` of ${FITS.length} found`}
        </span>
        <span className="trials-found-window">
          {`This window is in `}
          <span data-entered-count="">{entered.length}</span>
          {` of the crew's ${FITS.length} fits.`}
        </span>
      </p>
      <ol className="trials-stamps">
        {FITS.map((fit) => (
          <Stamp key={fit.n} fit={fit} shown={entered.includes(fit)} />
        ))}
      </ol>
    </section>
  );
}
