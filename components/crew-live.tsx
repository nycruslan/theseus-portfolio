"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CrewPanel, type Facts, type Said } from "@/components/crew";
import { announcement } from "@/components/crew-table";
import { type Crew, crewOfAnswer } from "@/lib/crew-run";

// /crew live in the browser (.crew/sprint/35/contract.md, "The poll", "Applying an answer"): the
// server's panel, then /api/crew's answers as they come. Only setTimeout, clearTimeout and
// Date.now() keep time, so a test's clock drives it; there is no test hook.

/** While live and visible, two polls a minute; otherwise one, the Studio's own REST_MS. */
const LIVE_MS = 30_000;
const REST_MS = 60_000;
/** How long the panel keeps its last told answer through failed or down polls: copper's window. */
const KEEP_MS = 600_000;

type Poller = { pause: (on: boolean) => void; stop: () => void };

const unchanging = () => () => {};

/** One poll's answer: the state it tells, or null when the request, the status or the shape failed. */
async function poll(): Promise<Crew | null> {
  try {
    const response = await fetch("/api/crew", { cache: "no-store" });
    return response.status === 200 ? crewOfAnswer(await response.json()) : null;
  } catch {
    return null;
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

export function CrewLive({ crew: first, facts }: { crew: Crew; facts: Facts }) {
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
      // No one started or stopped: the region keeps its words.
      if (words) setSaid((old) => ({ text: words, count: old.count + 1 }));
    });
    poller.current = watching;
    return watching.stop;
  }, [first]);

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
