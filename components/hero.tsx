import { type CSSProperties, Fragment } from "react";
import { HeroUpgrade } from "@/components/hero-upgrade";
import { HEIGHT, LENGTH } from "@/lib/half-model";
import { halfModel } from "@/lib/half-model-svg";
import { plankTones } from "@/lib/hull-planks";

// The viewBox holds the hull with air round it: 4 units each side, 10 above and 22 below the keel.
// The WebGL turn lifts the gunwale to 5.7 units above the hull's rest top (shear -0.24), and 4 more
// leave 2 px of air at 320 px wide, where a unit is half a pixel (hero-3d C11). Everything below the
// top edge, which is what a plank or a shade has to cover, is FLOOR units tall.
const PAD = 4;
const TOP = 10;
const FLOOR = HEIGHT + 22;

const { deck, lifts } = halfModel;
/** Where each lift's first plank sits in DOM order (deck first, stern to bow in a lift). */
const FIRST_PLANK = lifts.map((_, k) =>
  lifts.slice(0, k).reduce((count, lift) => count + lift.cuts.length - 1, 0),
);

/** A number as a short attribute: two decimals at most, and no zero before the point. */
const short = (value: number) =>
  (Math.round(value * 100) / 100).toString().replace(/^(-?)0\./, "$1.");

/**
 * The hero: a shipwright's lift half-model on the log of its own repairs (sprint 16, B1). Twenty-two
 * planks in seven lifts, one per sprint in the build log, the newest in copper and older ones in
 * bronze that fades with age (lib/hull-planks.ts says which plank and how much; app/globals.css
 * paints it). A static, server-rendered SVG, decoration only: hidden from assistive tech, never hit
 * or focused, no text inside. On a device that can take it, HeroUpgrade later draws the same hull
 * in WebGL over it.
 */
export function Hero({ sprints }: { sprints: readonly number[] }) {
  const tones = plankTones(sprints);
  return (
    <HeroUpgrade>
      <svg
        aria-hidden="true"
        viewBox={`${-PAD} ${-TOP} ${LENGTH + 2 * PAD} ${FLOOR + TOP}`}
      >
        {lifts.map((lift) => (
          <clipPath key={lift.id} id={`l${lift.id}`}>
            {/* The seam is this outline stroked by the <use> below, which copies attributes but
                not style rules, so the one property it needs is set here. */}
            <path
              id={`p${lift.id}`}
              d={lift.d}
              vectorEffect="non-scaling-stroke"
            />
          </clipPath>
        ))}
        {lifts.map((lift) => (
          <linearGradient key={lift.id} id={`s${lift.id}`}>
            {lift.shade.map((stop) => (
              <stop
                key={stop.offset}
                offset={short(stop.offset)}
                stopOpacity={short(stop.opacity)}
              />
            ))}
          </linearGradient>
        ))}
        <g data-hero-hull="">
          <path d={deck} className="hero-deck" />
          {lifts.map((lift, k) => (
            <Fragment key={lift.id}>
              <g clipPath={`url(#l${lift.id})`}>
                {lift.cuts.slice(0, -1).map((from, at) => {
                  const tone = tones[(FIRST_PLANK[k] ?? 0) + at];
                  return (
                    <rect
                      key={from}
                      data-hero-plank=""
                      data-sprint={tone?.sprint ?? undefined}
                      data-hero-copper={tone?.copper ? "" : undefined}
                      style={
                        tone?.mix == null
                          ? undefined
                          : ({ "--m": `${tone.mix}%` } as CSSProperties)
                      }
                      x={short(from)}
                      width={short((lift.cuts[at + 1] ?? from) - from)}
                      height={FLOOR}
                    />
                  );
                })}
              </g>
              {/* The light on the lift (the black over its planks) and its seam, in one shape. */}
              <use href={`#p${lift.id}`} fill={`url(#s${lift.id})`} />
            </Fragment>
          ))}
        </g>
      </svg>
    </HeroUpgrade>
  );
}
