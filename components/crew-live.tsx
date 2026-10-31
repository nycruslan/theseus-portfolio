"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CrewPanel, type Facts, type Said } from "@/components/crew";
import { announcement } from "@/components/crew-table";
import { type Crew, crewOfAnswer } from "@/lib/crew-run";

// /crew live in the browser (.crew/sprint/35/contract.md, "The poll", "Applying an answer"): the
// server's panel, then /api/crew's answers as they come, and the detail drawing's tally with them
// (.crew/sprint/36/contract.md, call 3). Only setTimeout, clearTimeout and Date.now() keep time, so
// a test's clock drives it, the abort of a poll that never settles included; there is no test hook.

/** While live and visible, two polls a minute; otherwise one, the Studio's own REST_MS. */
const LIVE_MS = 30_000;
const REST_MS = 60_000;
/** How long the panel keeps its last told answer through failed or down polls: copper's window. */
const KEEP_MS = 600_000;
/** A poll still unanswered after this is given up, and counts as failed (Lens's nit on #90). */
const ABORT_MS = 30_000;

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
 * The plank the server drew in pencil on /crew's detail: its sprint, and the seat's holder on the
 * down page (null for an original), which the record shows.
 */
export type Drawn = { sprint: number; holder: number | null };

/** Sets an attribute, or removes it for null, only where it differs: no answer rewrites a node. */
function set(node: Element, name: string, value: string | null) {
  if (node.getAttribute(name) === value) return;
  if (value === null) node.removeAttribute(name);
  else node.setAttribute(name, value);
}

/** What the detail shows for a told state: its data-run, the focus plank's number, its ticks. */
type Shown = {
  run: "live" | "open" | "inked" | "record";
  sprint: number | null;
  marks: number;
};

/**
 * The detail as a told state leaves it (.crew/sprint/36/contract.md, call 3's table): live or open
 * for the drawing's own sprint, in pencil with one tick per moment shown; inked once that sprint
 * has merged; otherwise the record, the focus plank seated by its holder as the down page seats it.
 */
function shownOf(crew: Crew, { sprint, holder }: Drawn): Shown {
  if (crew.state === "down" || crew.run.sprint !== sprint) {
    return { run: "record", sprint: holder, marks: 0 };
  }
  if (crew.state === "resting") return { run: "inked", sprint, marks: 0 };
  return { run: crew.state, sprint, marks: crew.run.moments.length };
}

/**
 * Sets the detail to `crew` (call 3, "A tick"). Nothing moves: a tick fills the next slot the
 * server drew, and the crop and every other plank stay. The drawing is the server's HTML, outside
 * React's tree, so it is set here, on each answer, and an answer that changes nothing sets nothing.
 */
function redraw(crew: Crew, drawn: Drawn) {
  const plan = document.querySelector<HTMLElement>("[data-plan][data-tally]");
  if (!plan) return;
  const shown = shownOf(crew, drawn);
  set(plan, "data-run", shown.run);
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

export function CrewLive({
  crew: first,
  facts,
  drawn,
}: {
  crew: Crew;
  facts: Facts;
  /** The detail's plank in pencil, or null: the server drew the record, and no answer changes it. */
  drawn: Drawn | null;
}) {
  const [crew, setCrew] = useState(first);
  const [said, setSaid] = useState<Said>({ text: "", count: 0 });
  const [paused, setPaused] = useState(false);
  // False in the server's HTML and while hydrating, true once the browser runs the page: the
  // re-render that follows hydration comes after the effect below has started the poller.
  const ready = useSyncExternalStore(
    unchanging,
    () => true,
    () => false,
  );
  const poller = useRef<Poller | null>(null);

  useEffect(() => {
    const watching = watch(first, (next, words) => {
      setCrew(next);
      if (drawn) redraw(next, drawn);
      // No one started or stopped: the region keeps its words.
      if (words) setSaid((old) => ({ text: words, count: old.count + 1 }));
    });
    poller.current = watching;
    return watching.stop;
  }, [first, drawn]);

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
    />
  );
}
