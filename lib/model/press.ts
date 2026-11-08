// The press's beats (.crew/sprint/55/press-iris.md, sections 1, 4 and 5), no three.js: where the
// leaving plank and the new one are a number of ms into a press played forward. A step back plays
// the same press backwards, so its frame at t is the forward frame at the press's length less t
// (Iris: every frame of a step back is a frame of the step forward). lib/model/ships.ts turns a
// beat into the frame.

import {
  CALM_FADE,
  ease,
  FAR_FADE,
  KNOCK_FADE,
  MORPH,
  PRESS_CARRY,
  PRESS_CARRY_NARROW,
  PRESS_FADE,
  PRESS_KNOCK,
  PRESS_LIFT,
} from "./calls";

/**
 * How a press changes its seat: `carry`, an original lifted off the Theseus and carried to the
 * ghost's seat (steps 1 to 23); `crew`, a card plank lifted and faded out where it stands, the
 * ghost already whole (24 to 51); `fade`, Calm's and reduced motion's fade in place, either way.
 */
export type Kind = "carry" | "crew" | "fade";

export type Beat = {
  /**
   * The leaving plank while the flight draws it: how far it has lifted (a share of L, on the
   * site's ease), how far carried (cubic in-out), its roll (a sin envelope), its look's morph to
   * vellum (smoothstep), and its alpha.
   */
  flier: {
    lift: number;
    carry: number;
    roll: number;
    morph: number;
    alpha: number;
  } | null;
  /** Touchdown has come: the ghost draws the seat's near side itself. */
  down: boolean;
  /** The ghost's far twin's share of its alpha: over the carry's last FAR_FADE ms. */
  far: number;
  /** The new card plank while it knocks in: its alpha, and how far proud of its seat (of L). */
  card: { alpha: number; proud: number } | null;
  /** Calm's progress, linear, 0 to 1. */
  fade: number;
};

const clamp = (u: number) => Math.min(1, Math.max(0, u));

const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Cubic in-out. */
const inOut = (u: number) =>
  u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;

/** The beat between the lift and the knock: the carry, or steps 24 to 51's fade in place. */
const middle = (kind: Kind, narrow: boolean) =>
  kind === "carry" ? (narrow ? PRESS_CARRY_NARROW : PRESS_CARRY) : PRESS_FADE;

/** A press's length in ms: 760 from 768 px and 680 below on 1 to 23, 480 on 24 to 51, 240 Calm. */
export function pressLength(kind: Kind, narrow: boolean) {
  return kind === "fade"
    ? CALM_FADE
    : PRESS_LIFT + middle(kind, narrow) + PRESS_KNOCK;
}

/**
 * The beat `ms` into a press played forward, strictly inside it: at 0 and at its length the hulls
 * are the two steps at rest, which the scene draws as such.
 */
export function beat(kind: Kind, narrow: boolean, ms: number): Beat {
  if (kind === "fade") {
    return {
      flier: null,
      down: false,
      far: 0,
      card: null,
      fade: clamp(ms / CALM_FADE),
    };
  }
  const span = middle(kind, narrow);
  const knock = PRESS_LIFT + span;
  const u = clamp((ms - PRESS_LIFT) / span);
  const lift = ease(clamp(ms / PRESS_LIFT));
  const flier =
    ms >= knock
      ? null
      : kind === "carry"
        ? {
            lift,
            carry: inOut(u),
            roll: Math.sin(Math.PI * u),
            morph: smoothstep(MORPH[0], MORPH[1], u),
            alpha: 1,
          }
        : { lift, carry: 0, roll: 0, morph: 0, alpha: 1 - u };
  // The knock: the new card fades in L proud of its gap, then drives in and stops dead.
  const into = ms - knock;
  const drive = clamp((into - KNOCK_FADE) / (PRESS_KNOCK - KNOCK_FADE));
  const card =
    into < 0
      ? null
      : { alpha: clamp(into / KNOCK_FADE), proud: 1 - drive * drive * drive };
  return {
    flier,
    down: ms >= knock,
    far: clamp((ms - (knock - FAR_FADE)) / FAR_FADE),
    card,
    fade: 0,
  };
}
