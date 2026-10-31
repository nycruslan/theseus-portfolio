// The hull on /crew (.crew/sprint/36/contract.md, "The hull on /crew", calls 2 to 4): what the chunk
// reads off the detail drawing the server drew and the poller keeps, and the tally laid on the hull.
// The drawing is the interface (call 4): which seat it is close on (`data-focus`), what the run is
// now (`data-run`), each plank's `data-sprint`, the pencil plank, and the shown ticks
// (`[data-mark]`). The crop, the tally and the ticks' places are lib/hull-layouts.ts's, which the 2D
// draws from too, so the hull can't disagree with the drawing. No three.js.

import { LENGTH } from "@/lib/half-model";
import {
  bandAt,
  crewLayout,
  type Detail,
  type Layout,
  MARKS,
  markX,
  numberX,
  numberY,
  PLANKS,
  tallyOf,
} from "@/lib/hull-layouts";
import { CREW_FOCUS, SETTLE_CREW } from "./calls";
import { nearSide } from "./hull";
import type { Crew } from "./loft";

/** What the run is now, by call 3's table: the server's value, then each told answer's. */
export type Run = "live" | "open" | "inked" | "record";

const runOf = (value: string | undefined): Run =>
  value === "live" || value === "open" || value === "inked" ? value : "record";

/** The drawing's state, as the poller leaves it: what the hull must agree with. */
export type CrewState = {
  run: Run;
  /** The planks the drawing seats (each with a `data-sprint`), the pencil plank's n included. */
  seated: Set<string>;
  /** The ticks the drawing shows, at most MARKS.max: only on the pencil plank, live or open. */
  marks: number;
  /** The focus plank's number, which rides the hull, or null where the drawing letters none. */
  label: HTMLElement | null;
  /** That number's text and place as lettered now. */
  lettered: string;
};

/** The detail drawing on /crew: `[data-plan]` with `data-focus`. */
export const isCrew = (plan: Element | null | undefined): plan is HTMLElement =>
  Boolean(plan?.matches("[data-plan][data-focus]"));

/**
 * A tick is shown unless it is absent or `display: none` (the contract, "Its hook"). Computed
 * display isn't inherited, so a tick in the drawing hidden at this width still counts as its own.
 */
const shown = (element: Element) =>
  getComputedStyle(element).display !== "none";

/** The state `drawing` (one of the two detail drawings, which carry the same one) shows now. */
export function readState(plan: HTMLElement, drawing: Element): CrewState {
  const run = runOf(plan.dataset.run);
  const seated = new Set<string>();
  for (const path of drawing.querySelectorAll(
    "path[data-plank][data-sprint]",
  )) {
    seated.add(path.getAttribute("data-plank") ?? "");
  }
  const marks =
    run === "live" || run === "open"
      ? Math.min(
          MARKS.max,
          [...drawing.querySelectorAll("[data-mark]")].filter(shown).length,
        )
      : 0;
  const label = focusLabel(drawing);
  return {
    run,
    seated,
    marks,
    label,
    // Its text and place: inked keeps n, record letters the holder's (call 3).
    lettered: label
      ? `${label.textContent}@${label.style.left},${label.style.top}`
      : "",
  };
}

/** Whether two readings of the drawing draw the same frame. */
export const sameState = (a: CrewState | null, b: CrewState) =>
  a !== null &&
  a.run === b.run &&
  a.marks === b.marks &&
  a.label === b.label &&
  a.lettered === b.lettered &&
  a.seated.size === b.seated.size &&
  [...a.seated].every((seat) => b.seated.has(seat));

/** The focus plank's number in `drawing`: `.plan-focus`, the one number on it, in every state. */
export const focusLabel = (drawing: Element) =>
  drawing.querySelector<HTMLElement>(":scope > .plan-plank.plan-focus");

/**
 * Whether the server drew a tally, so the crop is centred on its middle: `data-tally`, set at first
 * paint, since the first poll runs at hydration and may already have turned `data-run` to inked or
 * record before the chunk comes. No poll moves the crop (call 2).
 */
export const tallied = (plan: HTMLElement) => plan.hasAttribute("data-tally");

/** The layout one of the detail drawings is drawn on: Forge's crop around `data-focus`. */
export const detailLayout = (plan: HTMLElement, detail: Detail): Layout =>
  crewLayout(detail, plan.dataset.focus ?? "", tallied(plan));

/**
 * /crew's move (the contract, "Full"; notes-iris.md, section 3): the point it turns about, in the
 * model's frame, and its settled yaw. The point is on the plank's lower edge CREW_FOCUS × f aft of
 * the pen when the server drew a tally, or the focus number's anchor otherwise (numberX and numberY:
 * the body's middle at mid-depth). The turn brings the plank's end of the hull toward the visitor:
 * the bow for a plank whose middle is at or forward of midships, the stern for one aft of it.
 */
export function crewMove(seat: string, pencil: boolean): Crew {
  const plank = PLANKS.find((candidate) => candidate.id === seat);
  const tally = pencil ? tallyOf(seat) : null;
  const x = tally ? tally.tip - CREW_FOCUS * tally.f : numberX(seat, false);
  const band = plank && bandAt(plank, x);
  // A led-out number (5.0's) stands aft of the hull at its lift's mid-depth.
  const mid = plank ? (plank.yTop + plank.yBot) / 2 : 0;
  const y = tally ? (band?.[1] ?? mid) : (numberY(seat, false) ?? mid);
  const forward = plank ? (plank.x0 + plank.x1) / 2 >= LENGTH / 2 : true;
  return {
    focus: nearSide(x, y),
    yaw: forward ? -SETTLE_CREW.yaw : SETTLE_CREW.yaw,
  };
}

/**
 * The first `count` ticks on the pencil plank `seat`, as segment pairs in the model's frame: tick k
 * hangs MARKS.length from the plank's lower edge at markX, down the plank below or, under the keel,
 * on the centre plane, where halfBreadth is 0 (notes-iris.md, section 1); where the 2D draws it, so
 * frame 1 lies on the drawing's ticks.
 */
export function tickSegments(seat: string, count: number) {
  const plank = PLANKS.find((candidate) => candidate.id === seat);
  const tally = tallyOf(seat);
  if (!plank || !tally || count <= 0) return new Float32Array(0);
  const out: number[] = [];
  for (let i = 0; i < Math.min(count, MARKS.max); i++) {
    const x = markX(tally, i);
    const bottom = bandAt(plank, x)?.[1] ?? plank.yBot;
    out.push(...nearSide(x, bottom), ...nearSide(x, bottom + MARKS.length));
  }
  return new Float32Array(out);
}
