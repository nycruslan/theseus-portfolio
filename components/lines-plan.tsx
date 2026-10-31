import { Fragment } from "react";
import { MARKS, PENCIL } from "@/lib/hull-layouts";
import {
  crewPlans,
  ghostPlan,
  type Lettering,
  linesPlans,
  type LinesPlan as Plan,
  pagePlan,
} from "@/lib/lines-plan";

/** The sprint in progress on the sheet's drawing (lib/live-layer.ts). */
type Pencil = { seat: string; sprint: number; live: boolean };

// The hull's lines plan, the drawing at the top of the sheet (.crew/sprint/22/contract.md, B1.4):
// server-rendered SVG with every plank the crew has replaced filled and numbered. It is decoration
// with no script: hidden from assistive tech (the revision block holds the same record as text),
// never hit or focused (app/globals.css, "The lines plan"), and static. On the sheet, two drawings,
// one shown per width: the three views from 768 px, the profile and half-breadth plan below it,
// with the sprint in progress, when the crew has one, in pencil on its seat (B4b): hatched, a
// dashed edge, its number, and a copper tip while the crew is live. The 3D chunk reads that plank's
// data-pencil, data-sprint and data-live (.crew/sprint/34/decisions.md, 4).
// On /read's narrow column, the profile and half-breadth plan alone, numbered from 768 px. On the
// Log, the ghost hull (.crew/sprint/29/b5-first-contract.md; .crew/sprint/30/notes-iris.md): the
// profile alone, with only the originals the crew has taken out, in vellum, each numbered by its
// first holder; `current` marks the seat a record's sprint took.
export function LinesPlan({
  seats,
  view = "sheet",
  current,
  pencil,
  className = "",
}: {
  seats: ReadonlyMap<string, number>;
  view?: "sheet" | "page" | "ghost";
  /** The ghost's seat to mark, on a record. */
  current?: string;
  /** The sheet's sprint in progress. */
  pencil?: Pencil | null;
  className?: string;
}) {
  if (view === "ghost") {
    return (
      <div data-ghost="" aria-hidden="true" className={`plan ${className}`}>
        <Drawing plan={ghostPlan(seats)} id="plan-ghost" current={current} />
      </div>
    );
  }
  return (
    <div data-plan="" aria-hidden="true" className={`plan ${className}`}>
      {view === "page" ? (
        <Drawing plan={pagePlan(seats)} id="plan-page" />
      ) : (
        <SheetDrawings seats={seats} pencil={pencil ?? undefined} />
      )}
    </div>
  );
}

function SheetDrawings({
  seats,
  pencil,
}: {
  seats: ReadonlyMap<string, number>;
  pencil?: Pencil;
}) {
  // The pencil's number is lettered like a seated plank's, on the seat it takes.
  const { wide, narrow } = pencil
    ? linesPlans(new Map(seats).set(pencil.seat, pencil.sprint), pencil.seat)
    : linesPlans(seats);
  return (
    <>
      <Drawing plan={wide} id="plan-wide" pencil={pencil} />
      <Drawing plan={narrow} id="plan-narrow" pencil={pencil} />
    </>
  );
}

/** The drawing's run on /crew (.crew/sprint/36/contract.md, call 3): the server draws all but none. */
type Run = "live" | "open" | "inked" | "record";

// /crew's detail (.crew/sprint/36/contract.md, "The detail drawing"; Iris's final numbers): the
// sheet's two drawings, one shown per width, each a profile close on `focus`, the plank in pencil
// or the newest retro's seat, with every plank seated as on / and clipped by the box. In pencil,
// the plank carries the tally: its number, then a graphite tick for each of the `marks` moments the
// panel lists, then the copper pen while live. At rest with a replay to offer, the tally is drawn
// inked on the replayed sprint's seat, `inked`, with no tick and no pen, for the replay to take
// back to pencil (.crew/sprint/37/contract.md, call 7). data-focus and the crop are fixed at first
// paint; components/crew-live.tsx follows the poll and the replay on data-run, the focus plank and
// the ticks, and the 3D chunk reads all of it (call 4). data-tally says the server drew the tally,
// so the crop is its.
export function CrewPlan({
  seats,
  focus,
  pencil,
  inked,
  marks,
}: {
  seats: ReadonlyMap<string, number>;
  focus: string;
  pencil: Pencil | null;
  /** At rest, the sprint a replay plays, seated on `focus`; null without one. */
  inked: number | null;
  /** The moments the panel lists, in pencil. */
  marks: number;
}) {
  const tally =
    pencil ??
    (inked === null ? null : { seat: focus, sprint: inked, live: false });
  const { wide, narrow } = tally
    ? crewPlans(new Map(seats).set(tally.seat, tally.sprint), focus, tally.seat)
    : crewPlans(seats, focus);
  const run: Run = pencil
    ? pencil.live
      ? "live"
      : "open"
    : tally
      ? "inked"
      : "record";
  const shared = { pencil: tally ?? undefined, inked: !pencil, focus, marks };
  return (
    <div
      data-plan=""
      data-focus={focus}
      data-run={run}
      data-tally={tally ? "" : undefined}
      aria-hidden="true"
      className="plan"
    >
      <Drawing
        plan={wide}
        id="crew-wide"
        view="plan-wide plan-crew"
        {...shared}
      />
      <Drawing
        plan={narrow}
        id="crew-narrow"
        view="plan-narrow plan-crew"
        {...shared}
      />
    </div>
  );
}

function Drawing({
  plan,
  id,
  view = id,
  current,
  pencil,
  inked = false,
  focus,
  marks = 0,
}: {
  plan: Plan;
  id: string;
  /** The view's classes, where they aren't its id. */
  view?: string;
  current?: string;
  pencil?: Pencil;
  /**
   * /crew at rest with a replay: `pencil`'s plank carries the tally inked, seated with its hatch
   * and dash as attributes the stylesheet overrides until the replay sets it in pencil.
   */
  inked?: boolean;
  /** /crew's focus seat. */
  focus?: string;
  /** /crew's shown ticks. */
  marks?: number;
}) {
  const { lines } = plan;
  const ghost = id === "plan-ghost";
  // The current plank, or the one in pencil, goes last, so its edge paints over its neighbours'
  // where they share one.
  const last = current ?? pencil?.seat;
  const planks = last
    ? [
        ...plan.planks.filter((plank) => plank.id !== last),
        ...plan.planks.filter((plank) => plank.id === last),
      ]
    : plan.planks;
  return (
    <div className={`plan-view ${view}`}>
      <svg viewBox={plan.viewBox} aria-hidden="true" focusable="false">
        <defs>
          <clipPath id={`${id}-hull`}>
            <path d={plan.hull} />
          </clipPath>
          {pencil ? (
            // The pencil's hatch (PENCIL.hatch, shared with the 3D hull): a line through the
            // origin of user space and one every `period` across, rising to the bow, on the film.
            // The tile's two edges each carry half of a line.
            <pattern
              id={`${id}-hatch`}
              patternUnits="userSpaceOnUse"
              width={PENCIL.hatch.period}
              height={PENCIL.hatch.period}
              patternTransform="rotate(45)"
            >
              <rect
                className="hatch-ground"
                width={PENCIL.hatch.period}
                height={PENCIL.hatch.period}
              />
              <path
                className="hatch-line"
                strokeWidth={PENCIL.hatch.width}
                d={`M0 0V${PENCIL.hatch.period}M${PENCIL.hatch.period} 0V${PENCIL.hatch.period}`}
              />
            </pattern>
          ) : null}
        </defs>
        {/* Construction first: the planks cover it where it crosses the hull. The ghost is the
          profile alone, with none. */}
        {ghost ? null : (
          <>
            <path className="ln-construction" d={lines.construction} />
            <path className="ln-waterline" d={lines.waterlines} />
            <path className="ln-base" d={lines.base} />
            <path className="ln-centreline" d={lines.centrelines} />
          </>
        )}
        <g clipPath={`url(#${id}-hull)`}>
          {planks.map((plank) => {
            const tallied = plank.id === pencil?.seat;
            const inPencil = tallied && !inked;
            const plankPath = (
              <path
                key={plank.id}
                data-plank={plank.id}
                data-sprint={plank.sprint}
                data-current={plank.id === current ? "" : undefined}
                data-pencil={inPencil ? "" : undefined}
                data-live={inPencil && pencil?.live ? "" : undefined}
                className={
                  ghost
                    ? "plank-ghost"
                    : inPencil
                      ? "plank-pencil"
                      : plank.sprint === undefined
                        ? "plank-original"
                        : "plank-seated"
                }
                fill={tallied ? `url(#${id}-hatch)` : undefined}
                strokeDasharray={tallied ? PENCIL.dash.join(" ") : undefined}
                d={plank.d}
              />
            );
            // The neighbours' ink seams would show through the dash's gaps, so a card-coloured
            // stroke erases them first (notes-iris.md, 3.2).
            return tallied ? (
              <Fragment key={plank.id}>
                <path className="plank-erase" d={plank.d} />
                {plankPath}
              </Fragment>
            ) : (
              plankPath
            );
          })}
        </g>
        {ghost ? null : (
          <>
            <path className="ln-section" d={lines.sections} />
            <path className="ln-deck" d={lines.deck} />
          </>
        )}
        <path className="ln-leader" d={lines.leaders} />
        <path className="ln-outline" d={lines.outline} />
        {/* /crew's ticks hang from the plank's lower edge, outside the hull's clip, under the pen.
          Each slot's path is in data-slots, so the poll can show the next without geometry of
          its own (components/crew-live.tsx); a slot not yet shown is absent. */}
        {plan.marks ? (
          <g
            className="plank-marks"
            strokeWidth={MARKS.width}
            data-slots={plan.marks.join("|")}
          >
            {plan.marks.slice(0, marks).map((d) => (
              <path key={d} data-mark="" d={d} />
            ))}
          </g>
        ) : null}
        {/* The pen on the plank's lower edge while the crew is live: after the outline and outside
          the hull's clip, so it lies on every line and the keel lift's dot is whole. On /crew it
          is drawn in open too, hidden, for the poll to show when the crew is live again; never for
          a replay, which claims no now. */}
        {pencil &&
        plan.tip &&
        !inked &&
        (pencil.live || focus !== undefined) ? (
          <g data-tip={pencil.live ? "" : undefined} className="plank-tip">
            <path strokeWidth={PENCIL.tip.width} d={plan.tip.run} />
            <path strokeWidth={PENCIL.tip.dot} d={plan.tip.dot} />
          </g>
        ) : null}
      </svg>
      {plan.lettering.map((letter) => (
        <span
          key={`${letter.kind}-${letter.text}-${letter.left}-${letter.top}`}
          className={letterClass(
            letter,
            current,
            inked ? undefined : pencil?.seat,
            focus,
          )}
          style={{ left: `${letter.left}%`, top: `${letter.top}%` }}
        >
          {letter.text}
        </span>
      ))}
    </div>
  );
}

/**
 * /crew's Replay stamp (.crew/sprint/37/contract.md, "The stamp"; Iris): the drawing's own label
 * while a replay has its plank in pencil, so a pencil with no copper is never read as open. It lies
 * on the drawing's box from outside `[data-plan]`, so showing it wakes nothing that reads the
 * drawing. In the server's HTML, hidden, whenever the tally is drawn for a replay; decoration like
 * the drawing, since the panel's heading says Replay in words.
 */
export function ReplayStamp() {
  return (
    <span data-replay-stamp="" aria-hidden="true" hidden className="crew-stamp">
      Replay
    </span>
  );
}

/**
 * The current seat's number, the pencil's and /crew's focus number take a class, not the data
 * attributes, which mark the one plank.
 */
const letterClass = (
  { kind, align, wideOnly, plank }: Lettering,
  current?: string,
  pencil?: string,
  focus?: string,
) =>
  `plan-${kind} plan-${align}${wideOnly ? " plan-wide-only" : ""}${plank !== undefined && plank === current ? " plan-current" : ""}${plank !== undefined && plank === pencil ? " plan-pencil" : ""}${plank !== undefined && plank === focus ? " plan-focus" : ""}`;
