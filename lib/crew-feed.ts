import { cacheLife } from "next/cache";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import {
  type Crew,
  isRecord,
  isRunFrame,
  isTime,
  pullHref,
  type Run,
  restingOf,
  runOf,
} from "@/lib/crew-run";
import { readSprintLog, type SprintEntry } from "@/lib/sprint-log";

// The crew feed (.crew/sprint/28/feed-contract.md): what the Studio says the crew is doing, read on
// this site's server alone, never by the browser. The answer is checked by the data rules in
// .crew/sprint/31/contract.md, which Probe's oracle implements word for word: a wrong version or
// frame reads as the feed being down, while a bad part inside a sound answer (a role or a moment
// this site doesn't know, a field of the wrong type) is dropped, so the Studio can grow without
// taking /crew down. Only the fields /crew shows are kept. A run's own rules are lib/crew-run.ts's,
// which the browser applies again to /api/crew's answer. Then the run's number is checked against
// the build's record (`checked`), so the pages and /api/crew, and through it the browser's poll,
// tell the same number.

const DOWN: Crew = { state: "down" };
const UNREAD: Crew = { state: "down", unread: true };

/** Past this at render, an answer is stale and reads as down: copper's own window on the Studio. */
const STALE_MS = 10 * 60 * 1000;
// Generous, since no visitor waits on it: pages regenerate behind what they've already served, and
// /api/crew answers a poll that shows the last state meanwhile. A cold Studio can take seconds, and
// reading that as down told the visitor after a quiet spell that the feed wasn't answering.
const TIMEOUT_MS = 6000;

/** A read that brought no answer back: unreachable, timed out, a status other than 200, not JSON. */
const FAILED = Symbol("failed read");

/**
 * The last answer that read as live, open or resting, kept in this server process's memory. A
 * failed read judges it again at that read's clock, so it is told until its asOf is past STALE_MS
 * and reads as down after. The owner measured why (on #78, 2026-10-25): after about 10 idle
 * minutes the Studio's first uncached answer can take longer than TIMEOUT_MS, and caching down for
 * 30 s then told visitors the feed was down when it was only slow. An answer that reads as down
 * drops it, so a failed read never brings back an older live after a down. A new process (a cold
 * serverless instance) has none, and its failed read is down.
 */
let kept: unknown;

/** A run's frame in the feed, which also says whether it is live. */
function isFeedRun(value: unknown): value is Record<string, unknown> {
  return isRunFrame(value) && typeof value.live === "boolean";
}

/** The four states from one answer, judged against the clock it is read at. */
function crewOf(answer: unknown, feed: URL, now: number): Crew {
  if (!isRecord(answer) || answer.version !== 1 || !isTime(answer.asOf)) {
    return DOWN;
  }
  if (now - Date.parse(answer.asOf) > STALE_MS) return DOWN;
  const { current, last } = answer;
  if (current !== null && !isFeedRun(current)) return DOWN;
  if (last !== null && !isFeedRun(last)) return DOWN;
  if (current) {
    const state = current.live ? "live" : "open";
    return { state, run: runOf(current, feed.origin) };
  }
  // Only a resting run offers a replay, of the sprint it last merged (.crew/sprint/37/contract.md).
  return last ? { state: "resting", run: restingOf(last, feed.origin) } : DOWN;
}

/** What the record says of a sprint: its number and, when the retro names one, its pull request. */
type Recorded = Pick<SprintEntry, "sprint" | "pr">;

/**
 * The run's sprint as the build's record lets the site tell it (.crew/sprint/83/decisions.md). The
 * number is the Studio's, and after sprint 82 merged as #159 the feed said sprint 32, which / and
 * /crew repeated. The record knows which sprint each of this repository's pull requests was: a run
 * whose pull request it holds is that sprint. One whose pull request it doesn't hold keeps its
 * number, unless the record has that sprint under another pull request: then the site tells none.
 * Only a pull request the site would link is checked (pullHref), since a number whose page is
 * another repository's, or names another number, isn't this record's to judge; without one, the
 * number stands as told.
 */
function sprintOf(run: Run, record: readonly Recorded[]): number | null {
  const pr = run.pr && pullHref(run.pr) ? run.pr.number : null;
  if (pr === null) return run.sprint;
  const merged = record.find((entry) => entry.pr === pr);
  if (merged) return merged.sprint;
  const seated = record.find((entry) => entry.sprint === run.sprint);
  return seated?.pr === undefined ? run.sprint : null;
}

/**
 * The told crew with its run's number checked against the build's retros (sprintOf). A run left
 * without a number takes the paths every unnumbered run takes: "Crew resting." with no replay, and
 * no pencil on / (lib/live-layer.ts).
 */
function checked(crew: Crew): Crew {
  if (crew.state === "down") return crew;
  const sprint = sprintOf(crew.run, readSprintLog());
  if (sprint === crew.run.sprint) return crew;
  const { replay, ...run } = crew.run;
  return {
    state: crew.state,
    // Only a run with a number offers a replay (restingOf).
    run:
      replay && sprint !== null
        ? { ...run, sprint, replay }
        : { ...run, sprint },
  };
}

/** The feed's parsed answer, or FAILED. */
async function fetchAnswer(url: URL): Promise<unknown> {
  try {
    // The timeout covers the body too: a Studio that answers slowly has failed the read.
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status !== 200) return FAILED;
    return await response.json();
  } catch {
    // Unreachable, timed out, or not JSON: no answer.
    return FAILED;
  }
}

/**
 * The crew's state, read from `CREW_FEED_URL` (unset or empty: down). Cached for the shortest life
 * Next.js still prerenders (cacheLife's "Prerendering behavior"), so / and /crew stay static and
 * regenerate in the background: a visitor sees a read about five minutes old at most, or the
 * build's page, which claims nothing, after a quiet spell, and /crew's poll of /api/crew, which
 * calls this at request time, catches up from there. A failed read tells the last good answer
 * (`kept`) while it is fresh, and down after, and either is retried on the first request 30 s
 * after it. An answer the data rules refuse reads as down at once. The clock is read inside the
 * cache, since a prerender can't read it outside one, so an answer's age is judged when it is read.
 * Whichever answer is told, its run's number is checked against the retros here, the one place
 * every reader of the crew goes through.
 */
export async function readCrew(): Promise<Crew> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  const address = process.env.CREW_FEED_URL;
  if (!address || !URL.canParse(address)) return DOWN;
  // Vercel serves the build's page to the first visitor after `expire`, however old the build is
  // (production read 2026-10-31: a merged sprint still "Waiting on the owner"). So the build says
  // nothing of the crew. Every merge deploys, so its record is always the latest.
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) return UNREAD;
  const feed = new URL(address);
  const answer = await fetchAnswer(feed);
  if (answer === FAILED) return checked(crewOf(kept, feed, Date.now()));
  const crew = crewOf(answer, feed, Date.now());
  kept = crew.state === "down" ? undefined : answer;
  return checked(crew);
}
