// Which plank of the hull each sprint replaced, and how that plank looks (sprint 16, B1; the rules
// are .studio/sprint/15/contract.md, "B1 checks" 4, and .studio/sprint/16/specs-probe.md, section 2).
// The hull is 22 planks in 7 lifts, and sprint n replaces plank ORDER[(n - 1) mod 22], so the log
// is drawn on the ship it describes. This file is data and arithmetic only: the page reads it on
// the server, and the WebGL renderer reads the same answers, so the two can't disagree.

/** The shipwright's order, as `lift.plank`: lift 0 is the deck's, planks run stern to bow. */
export const ORDER = [
  "5.1",
  "3.2",
  "1.1",
  "6.0",
  "4.2",
  "0.1",
  "2.0",
  "3.0",
  "5.2",
  "1.3",
  "4.0",
  "0.2",
  "6.1",
  "2.1",
  "1.2",
  "3.1",
  "4.1",
  "2.2",
  "5.0",
  "3.3",
  "0.0",
  "1.0",
] as const;

/** Planks in each lift, deck first. They sum to ORDER's length. */
export const PLANKS_PER_LIFT = [3, 4, 3, 4, 3, 3, 2] as const;

export type PlankTone = {
  /** The newest sprint that replaced this plank; null while it is original. */
  sprint: number | null;
  /** Percent of --bronze mixed into the original tone; null when original or copper. */
  mix: number | null;
  /** The plank of the newest sprint, the one freshly fitted. */
  copper: boolean;
};

// The share of --bronze in the newest replaced plank, and how much of it a plank gives up between
// the newest and the oldest. 75 keeps the copper plank at 1.5 x the contrast of any other.
const BRONZE_NEWEST = 75;
const BRONZE_FADE = 45;

/** Where in DOM order (deck first, stern to bow in a lift) each place of ORDER sits. */
const DOM_INDEX = ORDER.map((place) => {
  const [lift = 0, plank = 0] = place.split(".").map(Number);
  return (
    PLANKS_PER_LIFT.slice(0, lift).reduce((sum, count) => sum + count, 0) +
    plank
  );
});

/**
 * The 22 planks in DOM order, for the sprints in the log (distinct, positive). A plank keeps the
 * newest sprint that reached it, so past a full cycle the hull shows the last 22. The newest sprint
 * overall is copper; each older one is bronze, from 72% just behind it down to 30% for sprint 1
 * when 14 sprints are in the log, falling with age.
 */
export function plankTones(sprints: readonly number[]): readonly PlankTone[] {
  const tones: PlankTone[] = ORDER.map(() => ({
    sprint: null,
    mix: null,
    copper: false,
  }));
  const newest = Math.max(0, ...sprints);
  // Oldest first, so the newest sprint to reach a plank is the one left on it.
  for (const sprint of [...sprints].sort((a, b) => a - b)) {
    const at = DOM_INDEX[(sprint - 1) % ORDER.length];
    if (at === undefined) continue;
    const copper = sprint === newest;
    tones[at] = {
      sprint,
      // Never divides by zero: a sprint older than the newest means the newest is above 1.
      mix: copper
        ? null
        : Math.round(
            BRONZE_NEWEST - (BRONZE_FADE * (newest - sprint)) / (newest - 1),
          ),
      copper,
    };
  }
  return tones;
}
