import { Fragment } from "react";
import { PENCIL } from "@/lib/hull-layouts";
import {
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

function Drawing({
  plan,
  id,
  current,
  pencil,
}: {
  plan: Plan;
  id: string;
  current?: string;
  pencil?: Pencil;
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
    <div className={`plan-view ${id}`}>
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
            const inPencil = plank.id === pencil?.seat;
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
                fill={inPencil ? `url(#${id}-hatch)` : undefined}
                strokeDasharray={inPencil ? PENCIL.dash.join(" ") : undefined}
                d={plank.d}
              />
            );
            // The neighbours' ink seams would show through the dash's gaps, so a card-coloured
            // stroke erases them first (notes-iris.md, 3.2).
            return inPencil ? (
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
        {/* The pen on the plank's lower edge while the crew is live: after the outline and outside
          the hull's clip, so it lies on every line and the keel lift's dot is whole. */}
        {pencil?.live && plan.tip ? (
          <g data-tip="" className="plank-tip">
            <path strokeWidth={PENCIL.tip.width} d={plan.tip.run} />
            <path strokeWidth={PENCIL.tip.dot} d={plan.tip.dot} />
          </g>
        ) : null}
      </svg>
      {plan.lettering.map((letter) => (
        <span
          key={`${letter.kind}-${letter.text}-${letter.left}-${letter.top}`}
          className={letterClass(letter, current, pencil?.seat)}
          style={{ left: `${letter.left}%`, top: `${letter.top}%` }}
        >
          {letter.text}
        </span>
      ))}
    </div>
  );
}

/**
 * The current seat's number, and the pencil's, take a class, not the data attributes, which mark
 * the one plank.
 */
const letterClass = (
  { kind, align, wideOnly, plank }: Lettering,
  current?: string,
  pencil?: string,
) =>
  `plan-${kind} plan-${align}${wideOnly ? " plan-wide-only" : ""}${plank !== undefined && plank === current ? " plan-current" : ""}${plank !== undefined && plank === pencil ? " plan-pencil" : ""}`;
