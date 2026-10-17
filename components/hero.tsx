import type { CSSProperties } from "react";
import { HeroUpgrade } from "@/components/hero-upgrade";
import { HEIGHT, LENGTH } from "@/lib/half-model";
import { halfModel } from "@/lib/half-model-svg";

// How lit a place is (0 to 1). The tone itself is mixed in CSS from the page's tokens, once per
// scheme (app/globals.css, "The hero half-model"), so the hull follows the theme with no script.
// Two decimals, no leading zero: there are fifty of these, and the box has a byte budget (C6).
const light = (value: number) =>
  ({
    "--l": (Math.round(value * 100) / 100).toString().replace(/^0\./, "."),
  }) as CSSProperties;

/**
 * The hero: a shipwright's lift half-model, seven planks and one copper one, hung on the page
 * like a model on its backboard (.studio/sprint/7/direction-iris.md). A static, server-rendered
 * SVG, decoration only: hidden from assistive tech, never hit or focused, and no text inside. On a
 * device that can take it, HeroUpgrade later draws the same hull in WebGL over it (sprint 10).
 */
export function Hero() {
  const { deck, lifts, copper, butts } = halfModel;
  return (
    <HeroUpgrade>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${LENGTH} ${HEIGHT}`}
        className="hero-model"
        focusable="false"
      >
        <defs>
          {lifts.map((lift) => (
            <linearGradient key={lift.id} id={lift.id}>
              {lift.stops.map((stop) => (
                <stop
                  key={stop.offset}
                  offset={stop.offset}
                  style={light(stop.light)}
                />
              ))}
            </linearGradient>
          ))}
        </defs>
        <g data-hero-hull>
          <path d={deck.d} className="hero-deck" style={light(deck.light)} />
          {lifts.map((lift) => (
            <path
              key={lift.id}
              data-hero-lift
              d={lift.d}
              fill={`url(#${lift.id})`}
            />
          ))}
          <path data-hero-copper d={copper} className="hero-copper" />
          <path d={butts} className="hero-butts" />
        </g>
      </svg>
    </HeroUpgrade>
  );
}
