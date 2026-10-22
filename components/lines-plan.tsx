import {
  type Lettering,
  linesPlans,
  type LinesPlan as Plan,
} from "@/lib/lines-plan";

// The hull's lines plan, the drawing at the top of the sheet (.crew/sprint/22/contract.md, B1.4):
// server-rendered SVG with every plank the crew has replaced filled and numbered. It is decoration
// with no script: hidden from assistive tech (the revision block holds the same record as text),
// never hit or focused (app/globals.css, "The lines plan"), and static. Two drawings, one shown per
// width: the three views from 768 px, the profile and half-breadth plan below it.
export function LinesPlan({
  seats,
  className = "",
}: {
  seats: ReadonlyMap<string, number>;
  className?: string;
}) {
  const { wide, narrow } = linesPlans(seats);
  return (
    <div data-plan="" aria-hidden="true" className={`plan ${className}`}>
      <Drawing plan={wide} id="plan-wide" />
      <Drawing plan={narrow} id="plan-narrow" />
    </div>
  );
}

function Drawing({ plan, id }: { plan: Plan; id: string }) {
  const { lines } = plan;
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
          {plan.planks.map((plank) => (
            <path
              key={plank.id}
              data-plank={plank.id}
              data-sprint={plank.sprint}
              className={
                plank.sprint === undefined ? "plank-original" : "plank-seated"
              }
              d={plank.d}
            />
          ))}
        </g>
        <path className="ln-section" d={lines.sections} />
        <path className="ln-deck" d={lines.deck} />
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
