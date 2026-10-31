import { cacheLife } from "next/cache";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { type Crew, isRecord, isRunFrame, isTime, runOf } from "@/lib/crew-run";

// The crew feed (.crew/sprint/28/feed-contract.md): what the Studio says the crew is doing, read on
// this site's server alone, never by the browser. The answer is checked by the data rules in
// .crew/sprint/31/contract.md, which Probe's oracle implements word for word: a wrong version or
// frame reads as the feed being down, while a bad part inside a sound answer (a role or a moment
// this site doesn't know, a field of the wrong type) is dropped, so the Studio can grow without
// taking /crew down. Only the fields /crew shows are kept. A run's own rules are lib/crew-run.ts's,
// which the browser applies again to /api/crew's answer.

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
  return last ? { state: "resting", run: runOf(last, feed.origin) } : DOWN;
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
  if (answer === FAILED) return crewOf(kept, feed, Date.now());
  const crew = crewOf(answer, feed, Date.now());
  kept = crew.state === "down" ? undefined : answer;
  return crew;
}
