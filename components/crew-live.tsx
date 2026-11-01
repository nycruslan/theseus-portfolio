"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  CrewPanel,
  type Facts,
  type Replay,
  type Said,
} from "@/components/crew";
import { announcement } from "@/components/crew-table";
import { type Crew, crewOfAnswer } from "@/lib/crew-run";

// /crew live in the browser (.crew/sprint/35/contract.md, "The poll", "Applying an answer"): the
// server's panel, then /api/crew's answers as they come, and the detail drawing's tally with them
// (.crew/sprint/36/contract.md, call 3). At rest it also plays the last merged sprint again when the
// visitor asks (.crew/sprint/37/contract.md): the Activity block and the drawing replay, while the
// panel's head keeps telling the present. Only setTimeout, clearTimeout and Date.now() keep time,
// so a test's clock drives it, the abort of a poll that never settles included; there is no test
// hook.

/** While live and visible, two polls a minute; otherwise one, the Studio's own REST_MS. */
const LIVE_MS = 30_000;
const REST_MS = 60_000;
/** How long the panel keeps its last told answer through failed or down polls: copper's window. */
const KEEP_MS = 600_000;
/** A poll still unanswered after this is given up, and counts as failed (Lens's nit on #90). */
const ABORT_MS = 30_000;
/** A replay's pace: one moment every 1.5 s, whatever the sprint's own clock (call 1). */
const STEP_MS = 1500;

type Poller = { pause: (on: boolean) => void; stop: () => void };

const unchanging = () => () => {};

/** One poll's answer: the state it tells, or null when the request, the status or the shape failed. */
async function poll(): Promise<Crew | null> {
  // A timer, not AbortSignal.timeout, so a test's clock drives it as it drives the schedule.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), ABORT_MS);
  try {
    const response = await fetch("/api/crew", {
      cache: "no-store",
      signal: abort.signal,
    });
    return response.status === 200 ? crewOfAnswer(await response.json()) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The plank the server drew the tally on, in /crew's detail: its sprint, and the seat's holder on
 * the down page (null for an original), which the record shows. `replay` says it was drawn inked at
 * rest for a replay of that sprint, which then plays on it too (call 7).
 */
export type Drawn = { sprint: number; holder: number | null; replay: boolean };

/** Sets an attribute, or removes it for null, only where it differs: no answer rewrites a node. */
function set(node: Element, name: string, value: string | null) {
  if (node.getAttribute(name) === value) return;
  if (value === null) node.removeAttribute(name);
  else node.setAttribute(name, value);
}

/** What the detail shows: its data-run, the focus plank's number, its ticks, and if it replays. */
type Shown = {
  run: "live" | "open" | "inked" | "record";
  sprint: number | null;
  marks: number;
  replay: boolean;
};

/**
 * The detail as a told state leaves it (.crew/sprint/36/contract.md, call 3's table): live or open
 * for the drawing's own sprint, in pencil with one tick per moment shown; inked once that sprint
 * has merged; otherwise the record, the focus plank seated by its holder as the down page seats it.
 * A replay drawn for plays on it instead: in pencil with a tick per moment played, then inked again
 * from the merge, or from the last moment when there is none (.crew/sprint/37/contract.md).
 */
function shownOf(crew: Crew, drawn: Drawn, replay: Replay | null): Shown {
  const { sprint, holder } = drawn;
  if (replay && drawn.replay && replay.sprint === sprint) {
    const merge = replay.moments.findIndex(({ kind }) => kind === "merge") + 1;
    return replay.k < (merge || replay.moments.length)
      ? { run: "open", sprint, marks: replay.k, replay: true }
      : { run: "inked", sprint, marks: 0, replay: true };
  }
  if (crew.state === "down" || crew.run.sprint !== sprint) {
    return { run: "record", sprint: holder, marks: 0, replay: false };
  }
  if (crew.state === "resting") {
    return { run: "inked", sprint, marks: 0, replay: false };
  }
  return {
    run: crew.state,
    sprint,
    marks: crew.run.moments.length,
    replay: false,
  };
}

/**
 * Sets the detail to `shown` (call 3, "A tick"). Nothing moves: a tick fills the next slot the
 * server drew, and the crop and every other plank stay. The drawing is server HTML that React
 * hydrates but never renders again (CrewPlan is a server component that takes no client state), so
 * the poll and the replay set it here, and a client render of it would undo them. Every write is
 * guarded, so a state that changes nothing sets nothing.
 */
function redraw(shown: Shown) {
  const plan = document.querySelector<HTMLElement>("[data-plan][data-tally]");
  if (!plan) return;
  set(plan, "data-run", shown.run);
  set(plan, "data-replay", shown.replay ? "" : null);
  for (const view of plan.querySelectorAll(".plan-crew")) {
    const path = view.querySelector(`path[data-plank="${plan.dataset.focus}"]`);
    const tip = view.querySelector(".plank-tip");
    const number = view.querySelector(".plan-focus");
    const marks = view.querySelector<SVGGElement>(".plank-marks");
    if (path) seat(path, shown);
    if (tip) set(tip, "data-tip", shown.run === "live" ? "" : null);
    if (number) letter(number, shown);
    if (marks) showMarks(marks, shown.marks);
  }
  // The stamp lies on the drawing from outside it: while a replay has the plank in pencil (Iris).
  const stamp = document.querySelector<HTMLElement>("[data-replay-stamp]");
  const hidden = !(shown.replay && shown.run === "open");
  if (stamp && stamp.hidden !== hidden) stamp.hidden = hidden;
}

/** The focus plank: in pencil while live or open, else seated, or original with no holder. */
function seat(path: Element, { run, sprint }: Shown) {
  const pencil = run === "live" || run === "open";
  const seated = sprint === null ? "plank-original" : "plank-seated";
  set(path, "class", pencil ? "plank-pencil" : seated);
  set(path, "data-sprint", sprint === null ? null : String(sprint));
  set(path, "data-pencil", pencil ? "" : null);
  set(path, "data-live", run === "live" ? "" : null);
}

/** The focus plank's number: on the pencil's chip while live or open, else in ink. */
function letter(number: Element, { run, sprint }: Shown) {
  number.classList.toggle("plan-pencil", run === "live" || run === "open");
  const text = sprint === null ? "" : String(sprint);
  if (number.textContent !== text) number.textContent = text;
}

/** Shows the first `count` of the tally's slots: a shown tick is a path, a slot not shown none. */
function showMarks(marks: SVGGElement, count: number) {
  const slots = marks.dataset.slots?.split("|") ?? [];
  const shown = Math.min(count, slots.length);
  while (marks.childElementCount > shown) marks.lastElementChild?.remove();
  for (let k = marks.childElementCount; k < shown; k++) {
    const tick = document.createElementNS("http://www.w3.org/2000/svg", "path");
    tick.setAttribute("data-mark", "");
    tick.setAttribute("d", slots[k] ?? "");
    marks.append(tick);
  }
}

/** The replay `crew` offers, from moment 1 and playing; null when it offers none. */
function replayOf(crew: Crew): Replay | null {
  return crew.state === "resting" && crew.run.replay && crew.run.sprint !== null
    ? { sprint: crew.run.sprint, moments: crew.run.replay, k: 1, paused: false }
    : null;
}

type Transport = {
  /** Plays what `crew` offers from moment 1, whatever was playing; false when it offers none. */
  start: (crew: Crew) => boolean;
  /** Pauses or resumes, from the first moment to the end. */
  toggle: () => void;
  /** From the first moment to the end, playing or paused: when Space and the pause act. */
  playing: () => boolean;
  /** Closes the replay unless `crew` is still resting on its sprint (call 5). */
  follow: (crew: Crew) => void;
  /** Stops the clock and keeps the replay where it is, for `resume` to go on from. */
  stop: () => void;
  /** Times the next step again after a stop, if a replay is playing. */
  resume: () => void;
};

/**
 * The replay's clock (call 1, "Playing"), outside React as the poller is: each step shows the next
 * moment and times the one after in the same callback, so a test's clock can run several steps at
 * once. A start or a resume waits the full STEP_MS, and the step after the last moment ends it.
 * `show` gets each state to render.
 */
function transport(show: (replay: Replay | null) => void): Transport {
  let replay: Replay | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const playing = () => replay !== null && replay.k <= replay.moments.length;
  const time = () => {
    clearTimeout(timer);
    if (playing() && !replay?.paused) timer = setTimeout(step, STEP_MS);
  };
  const set = (next: Replay | null) => {
    replay = next;
    show(next);
    time();
  };
  const step = () => {
    if (!replay) return;
    // The pause hides at the end, and focus can't stay on a hidden button: it goes to the block
    // the replay played in, without scrolling, so the end never moves the page and the next Tab
    // goes on from there (.crew/sprint/37/decisions.md, 7).
    if (
      replay.k === replay.moments.length &&
      document.activeElement?.matches("[data-replay-pause]")
    ) {
      document
        .querySelector<HTMLElement>("#replay")
        ?.focus({ preventScroll: true });
    }
    set({ ...replay, k: replay.k + 1 });
  };
  return {
    start(crew) {
      const next = replayOf(crew);
      if (next) set(next);
      return next !== null;
    },
    toggle() {
      if (replay && playing()) set({ ...replay, paused: !replay.paused });
    },
    playing,
    follow(crew) {
      if (
        replay &&
        !(crew.state === "resting" && crew.run.sprint === replay.sprint)
      ) {
        set(null);
      }
    },
    stop: () => clearTimeout(timer),
    resume: time,
  };
}

/**
 * Polls from `first`, the server's panel, calling `show` with each panel that replaces it and who
 * started or stopped working ("" for nobody, or no told panel before it).
 */
function watch(first: Crew, show: (crew: Crew, said: string) => void): Poller {
  let shown = first;
  // When the last told answer arrived: the server's panel counts as one at hydration.
  let told = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let paused = false;
  let polls = 0;
  // The poll in flight whose answer still counts, or 0: at most one, and Pause discards it.
  let flight = 0;

  const visible = () => document.visibilityState === "visible";

  const apply = (next: Crew | null) => {
    if (next && next.state !== "down") {
      const said = shown.state === "down" ? "" : announcement(shown, next);
      told = Date.now();
      shown = next;
      show(next, said);
    } else if (shown.state !== "down" && Date.now() - told > KEEP_MS) {
      // Serverless instances don't share the server's kept answer, so a cold one can say down
      // between two lives: the panel keeps its answer for the same 10 minutes, then says so.
      shown = { state: "down" };
      show(shown, "");
    }
  };

  const run = async () => {
    clearTimeout(timer);
    if (flight) return;
    const id = ++polls;
    flight = id;
    const next = await poll();
    if (flight !== id) return;
    flight = 0;
    apply(next);
    if (!paused && visible()) {
      timer = setTimeout(run, shown.state === "live" ? LIVE_MS : REST_MS);
    }
  };

  const onVisibility = () => {
    if (!visible()) clearTimeout(timer);
    else if (!paused) void run();
  };

  document.addEventListener("visibilitychange", onVisibility);
  if (visible()) void run();
  return {
    pause(on) {
      paused = on;
      clearTimeout(timer);
      flight = 0;
      if (!on && visible()) void run();
    },
    stop() {
      paused = true;
      clearTimeout(timer);
      flight = 0;
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}

/** The address without its hash, so a reload, Back or a copied address never replays (Iris). */
const dropHash = () =>
  history.replaceState(null, "", location.pathname + location.search);

export function CrewLive({
  crew: first,
  facts,
  drawn,
}: {
  crew: Crew;
  facts: Facts;
  /** The plank the server drew the tally on, or null: it drew the record, and nothing changes it. */
  drawn: Drawn | null;
}) {
  const [crew, setCrew] = useState(first);
  const [said, setSaid] = useState<Said>({ text: "", count: 0 });
  const [paused, setPaused] = useState(false);
  const [replay, setReplay] = useState<Replay | null>(null);
  // False in the server's HTML and while hydrating, true once the browser runs the page: the
  // re-render that follows hydration comes after the effect below has started the poller.
  const ready = useSyncExternalStore(
    unchanging,
    () => true,
    () => false,
  );
  const poller = useRef<Poller | null>(null);
  // The replay's clock and an arrival at #replay not yet played belong to the page, not to one run
  // of the effect below: React's Strict Mode runs it, cleans it up and runs it again in development,
  // and each run must go on from what the last left (Lens's nit on #95). A ref outlives the re-run.
  const replays = useRef<Transport | null>(null);
  // Null until the effect has read the address once; then whether an arrival waits to play.
  const arrival = useRef<boolean | null>(null);
  // A start's jump to #replay waits for the render that lists the replay, whose block it lands on.
  const jump = useRef(false);

  useEffect(() => {
    let current = first;
    replays.current ??= transport(setReplay);
    const transported = replays.current;
    // A replay the run before this one left playing goes on; on the first run, nothing plays.
    transported.resume();
    const begin = (told: Crew) => {
      if (transported.start(told)) jump.current = true;
    };
    const seen = () => document.visibilityState === "visible";
    // The entry is a link to the anchor (components/crew.tsx): its press plays from moment 1 and
    // jumps there once the replay is listed, adding no history entry. A press that opens a new tab
    // keeps its meaning, and the tab arrives at #replay.
    const onClick = (event: MouseEvent) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (
        event.target instanceof Element &&
        event.target.closest("a[data-replay]")
      ) {
        event.preventDefault();
        begin(current);
      }
    };
    // Space alone pauses and resumes a replay from the first moment to the end, unless the focus
    // is on a link, a button or a field, which keep their own meaning (the pause's is the same).
    // With any modifier it keeps the browser's (Shift+Space scrolls back up), and before and after
    // the replay it scrolls as always.
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key !== " " ||
        event.repeat ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        event.metaKey
      )
        return;
      if (
        !transported.playing() ||
        (event.target instanceof Element &&
          event.target.closest("a[href],button,input,select,textarea"))
      )
        return;
      event.preventDefault();
      transported.toggle();
    };
    // Arriving at /crew#replay is the visitor's press made on / (call 3): it plays what the page
    // offers, or, when the build's page offered nothing, what the first told answer does. A tab
    // opened in the background plays it only once it is seen, so its first moment isn't spent
    // unseen (Lens's nit on #95); the poll waits for the tab too.
    if (arrival.current === null) {
      arrival.current = location.hash === "#replay";
      if (arrival.current) dropHash();
    }
    const land = () => {
      if (arrival.current && seen() && replayOf(current)) {
        arrival.current = false;
        begin(current);
      }
    };
    land();
    document.addEventListener("visibilitychange", land);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    const watching = watch(first, (next, words) => {
      current = next;
      setCrew(next);
      // Live beats replay: any told answer but resting on the replay's sprint closes it.
      transported.follow(next);
      if (arrival.current && seen()) {
        arrival.current = false;
        begin(next);
      }
      // No one started or stopped: the region keeps its words.
      if (words) setSaid((old) => ({ text: words, count: old.count + 1 }));
    });
    poller.current = watching;
    return () => {
      watching.stop();
      transported.stop();
      document.removeEventListener("visibilitychange", land);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [first]);

  // An instant jump, as a fragment's: it lands the head under the bar and moves the focus
  // starting point there, so the next Tab is Pause replay, and script moves no focus. Then the
  // page never scrolls itself.
  useEffect(() => {
    if (!replay || !jump.current) return;
    jump.current = false;
    location.replace("#replay");
    dropHash();
  }, [replay]);

  const shown = drawn ? shownOf(crew, drawn, replay) : null;
  useEffect(() => {
    if (shown) redraw(shown);
  }, [shown]);

  const onPause = () => {
    setPaused(!paused);
    poller.current?.pause(!paused);
  };

  return (
    <CrewPanel
      crew={crew}
      facts={facts}
      paused={paused}
      ready={ready}
      onPause={onPause}
      said={said}
      replay={replay}
      onReplayPause={() => replays.current?.toggle()}
      ticks={shown?.run === "live" || shown?.run === "open"}
    />
  );
}
