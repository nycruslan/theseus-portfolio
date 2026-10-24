import {
  ghostPlan,
  type Lettering,
  linesPlans,
  type LinesPlan as Plan,
  pagePlan,
} from "@/lib/lines-plan";

// The hull's lines plan, the drawing at the top of the sheet (.crew/sprint/22/contract.md, B1.4):
// server-rendered SVG with every plank the crew has replaced filled and numbered. It is decoration
// with no script: hidden from assistive tech (the revision block holds the same record as text),
// never hit or focused (app/globals.css, "The lines plan"), and static. On the sheet, two drawings,
// one shown per width: the three views from 768 px, the profile and half-breadth plan below it.
// On /read's narrow column, the profile and half-breadth plan alone, numbered from 768 px. On the
// Log, the ghost hull (.crew/sprint/29/b5-first-contract.md): the same views with only the
// originals the crew has taken out, in vellum, each numbered by its first holder; `current` marks
// the seat a record's sprint took.
export function LinesPlan({
  seats,
  view = "sheet",
  current,
  className = "",
}: {
  seats: ReadonlyMap<string, number>;
  view?: "sheet" | "page" | "ghost";
  /** The ghost's seat to mark, on a record. */
  current?: string;
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
        <SheetDrawings seats={seats} />
      )}
    </div>
  );
}

function SheetDrawings({ seats }: { seats: ReadonlyMap<string, number> }) {
  const { wide, narrow } = linesPlans(seats);
  return (
    <>
      <Drawing plan={wide} id="plan-wide" />
      <Drawing plan={narrow} id="plan-narrow" />
    </>
  );
}

function Drawing({
  plan,
  id,
  current,
}: {
  plan: Plan;
  id: string;
  current?: string;
}) {
  const { lines } = plan;
  const ghost = id === "plan-ghost";
  // The current plank goes last, so its edge paints over its neighbours' where they share one.
  const planks = current
    ? [
        ...plan.planks.filter((plank) => plank.id !== current),
        ...plan.planks.filter((plank) => plank.id === current),
      ]
    : plan.planks;
  return (
    <div className={`plan-view ${id}`}>
      <svg viewBox={plan.viewBox} aria-hidden="true" focusable="false">
        <defs>
          <clipPath id={`${id}-hull`}>
            <path d={plan.hull} />
          </clipPath>
        </defs>
        {/* Construction first: the planks cover it where it crosses the hull. */}
        <path className="ln-construction" d={lines.construction} />
        <path className="ln-waterline" d={lines.waterlines} />
        <path className="ln-base" d={lines.base} />
        <path className="ln-centreline" d={lines.centrelines} />
        <g clipPath={`url(#${id}-hull)`}>
          {planks.map((plank) => (
            <path
              key={plank.id}
              data-plank={plank.id}
              data-sprint={plank.sprint}
              data-current={plank.id === current ? "" : undefined}
              className={
                ghost
                  ? "plank-ghost"
                  : plank.sprint === undefined
                    ? "plank-original"
                    : "plank-seated"
              }
              d={plank.d}
            />
          ))}
        </g>
        <path className="ln-section" d={lines.sections} />
        <path className="ln-deck" d={lines.deck} />
        <path className="ln-leader" d={lines.leaders} />
        <path className="ln-outline" d={lines.outline} />
      </svg>
      {plan.lettering.map((letter) => (
        <span
          key={`${letter.kind}-${letter.text}-${letter.left}-${letter.top}`}
          className={letterClass(letter)}
          style={{ left: `${letter.left}%`, top: `${letter.top}%` }}
        >
          {letter.text}
        </span>
      ))}
    </div>
  );
}

const letterClass = ({ kind, align, wideOnly }: Lettering) =>
  `plan-${kind} plan-${align}${wideOnly ? " plan-wide-only" : ""}`;
