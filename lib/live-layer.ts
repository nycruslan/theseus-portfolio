import type { Crew, RosterRole, Run } from "@/lib/crew-run";
import { nextSeat, seatOf } from "@/lib/lines-plan";

// The live layer on / (.crew/sprint/34/contract.md, "Data rules"; the plan's B4.2): the crew's
// state on the sheet, from the read /crew makes (lib/crew-feed.ts). The feed never seats a plank:
// the build's retros seat every plank in every state, and the feed only says which seat is in
// pencil, whether it is live, and when the last sprint merged. With the feed down, or a run that
// has no number to name its plank, the sheet is the record alone, exactly as before the feed.

/** The sprint in progress: a plank in pencil, and the row that leads the revision block. */
export type Pencil = {
  sprint: number;
  /** The feed's goal, whole; null when the feed sends none or a blank one (lib/crew-run.ts). */
  goal: string | null;
  /** Its seat (the contract's "The pencil seat"). */
  seat: string;
  /** Live by the Studio's own test: the copper tip and "drawing now". */
  live: boolean;
  /** The row's cells after Rev and Description, as the record's rows give them. */
  drawn: string;
  checked: string;
  tested: string;
  approved: string;
};

export type Layer =
  | { state: "pencil"; pencil: Pencil }
  | { state: "resting"; run: Run }
  | { state: "down" };

const NONE = "—";

/** The builders, then the designers: lib/sprint-log.ts's rule for a retro's Drawn. */
const DRAWERS: [RosterRole, string][][] = [
  [
    ["engineer", "Forge"],
    ["creative-engineer", "Pixel"],
  ],
  [
    ["design-director", "Iris"],
    ["product-owner", "Quill"],
  ],
];

const TOOK_PART = ["working", "waiting", "done"];

/** The row's signatures from the feed's roles, so every name is someone the feed says took part. */
function signaturesOf(run: Run, open: boolean) {
  const state = (role: RosterRole) =>
    run.roles.find((line) => line.role === role)?.state;
  const names = DRAWERS.map((group) =>
    group.flatMap(([role, name]) =>
      TOOK_PART.includes(state(role) ?? "") ? [name] : [],
    ),
  ).find((group) => group.length > 0);
  return {
    drawn: names ? names.join(", ") : NONE,
    checked: state("code-reviewer") === "done" ? "Lens" : NONE,
    tested: state("qa-engineer") === "done" ? "Probe" : NONE,
    approved:
      open && run.health.state === "waiting" ? "Waiting for owner" : NONE,
  };
}

/**
 * The layer from the told state. `merged` is the build's retro numbers, ascending, as the drawing
 * seats them: the run's sprint takes the seat its retro holds when the build has one (a pull
 * request's preview carries the retro before the merge; the fixtures' sprint is merged), and the
 * next seat otherwise, so no other plank moves.
 */
export function layerOf(crew: Crew, merged: readonly number[]): Layer {
  if (crew.state === "down") return crew;
  const { run } = crew;
  if (crew.state === "resting") return { state: "resting", run };
  if (run.sprint === null) return { state: "down" };
  return {
    state: "pencil",
    pencil: {
      sprint: run.sprint,
      goal: run.goal,
      seat: seatOf(merged, run.sprint) ?? nextSeat(merged.length),
      live: crew.state === "live",
      ...signaturesOf(run, crew.state === "open"),
    },
  };
}
