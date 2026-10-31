import { cacheLife } from "next/cache";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

// The crew feed (.crew/sprint/28/feed-contract.md): what the Studio says the crew is doing, read on
// this site's server alone, never by the browser. The answer is checked by the data rules in
// .crew/sprint/31/contract.md, which Probe's oracle implements word for word: a wrong version or
// frame reads as the feed being down, while a bad part inside a sound answer (a role or a moment
// this site doesn't know, a field of the wrong type) is dropped, so the Studio can grow without
// taking /crew down. Only the fields /crew shows are kept.

/** The crew's roles, in the roster's order (the Studio's ROSTER; this site's .claude/agents/). */
export const ROSTER = [
  "lead",
  "product-owner",
  "engineer",
  "creative-engineer",
  "code-reviewer",
  "qa-engineer",
  "design-director",
] as const;
export type RosterRole = (typeof ROSTER)[number];

const AGENT_STATES = ["working", "waiting", "done", "not-called"] as const;
export type AgentState = (typeof AGENT_STATES)[number];

const MOMENT_KINDS = [
  "kickoff",
  "ticket",
  "contract",
  "decision",
  "report",
  "verdict",
  "gate",
  "pr",
  "merge",
  "end",
] as const;
type MomentKind = (typeof MOMENT_KINDS)[number];

export interface RoleLine {
  role: RosterRole;
  state: AgentState;
  line: string | null;
}

export interface Moment {
  kind: MomentKind;
  /** The instant, as the feed wrote it (it parses). */
  at: string;
  text: string;
}

/** One run as /crew tells it: `current`, or `last` while nothing is in progress. */
export interface Run {
  sprint: number | null;
  goal: string | null;
  /** Live by the Studio's own test: not over, and heard from within its signal window. */
  live: boolean;
  pr: { number: number; url: string | null } | null;
  health: {
    /** The Studio's word for the run ("waiting", "quiet", "shipped"…); any string. */
    state: string;
    line: string | null;
    /** The line is Atlas's own words. */
    quote: boolean;
  };
  /** What is happening now, in the Studio's status line's words. */
  now: string | null;
  /** The entries that check, first per role, in the feed's order. */
  roles: RoleLine[];
  /** At most 10, newest first. */
  moments: Moment[];
  /** The run's public page on the Studio, only when it is one (the data rules' test). */
  studio: string | null;
  /** When GitHub merged its pull request (`last` only). */
  mergedAt: string | null;
}

/**
 * What /crew tells (.crew/sprint/31/contract.md, "The state"): the run in progress, live or not;
 * the last merged run while nothing is in progress; or nothing, when the feed is down, or when
 * this is the build and it wasn't read (`unread`).
 */
export type Crew =
  | { state: "live" | "open" | "resting"; run: Run }
  | { state: "down"; unread?: true };

const DOWN: Crew = { state: "down" };
const UNREAD: Crew = { state: "down", unread: true };

/** Past this at render, an answer is stale and reads as down: copper's own window on the Studio. */
const STALE_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 2000;
const MAX_MOMENTS = 10;

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

type Fields = Record<string, unknown>;

function isRecord(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(
  values: readonly T[],
  value: unknown,
): value is T {
  return (
    typeof value === "string" && (values as readonly string[]).includes(value)
  );
}

function isTime(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

/** A string field that isn't a string reads as null. */
function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;
}

/** The frame a run must have, or the whole answer is down. */
function isRunFrame(value: unknown): value is Fields {
  return (
    isRecord(value) &&
    typeof value.live === "boolean" &&
    Array.isArray(value.roles) &&
    Array.isArray(value.moments) &&
    isRecord(value.health) &&
    typeof value.health.state === "string"
  );
}

function rolesOf(entries: unknown[]): RoleLine[] {
  const roles = new Map<RosterRole, RoleLine>();
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const { role, state } = entry;
    if (!isOneOf(ROSTER, role) || !isOneOf(AGENT_STATES, state)) continue;
    if (!roles.has(role))
      roles.set(role, { role, state, line: text(entry.line) });
  }
  return [...roles.values()];
}

function momentsOf(entries: unknown[]): Moment[] {
  const moments: Moment[] = [];
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const { kind, at } = entry;
    const words = text(entry.text);
    // `who` isn't shown in B4a, so an unknown one needs nothing: the moment stays either way.
    if (!isOneOf(MOMENT_KINDS, kind) || !isTime(at) || !words) continue;
    moments.push({ kind, at, text: words });
  }
  // Newest first; the sort is stable, so ties keep the feed's order.
  return moments
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, MAX_MOMENTS);
}

function pullOf(value: unknown): Run["pr"] {
  if (!isRecord(value)) return null;
  const number = count(value.number);
  return number === null ? null : { number, url: text(value.url) };
}

/** The run's page, only when it is the Studio's own: https, the feed's origin, a run's path. */
function studioOf(value: unknown, feed: URL): string | null {
  if (typeof value !== "string" || !URL.canParse(value)) return null;
  const url = new URL(value);
  return url.protocol === "https:" &&
    url.origin === feed.origin &&
    url.pathname.startsWith("/studio/runs/")
    ? value
    : null;
}

function runOf(run: Fields, feed: URL): Run {
  const health = run.health as Fields;
  return {
    sprint: count(run.sprint),
    goal: text(run.goal),
    live: run.live === true,
    pr: pullOf(run.pr),
    health: {
      state: String(health.state),
      line: text(health.line),
      quote: health.quote === true,
    },
    now: text(run.now),
    roles: rolesOf(run.roles as unknown[]),
    moments: momentsOf(run.moments as unknown[]),
    studio: studioOf(run.url, feed),
    mergedAt: text(run.mergedAt),
  };
}

/** The four states from one answer, judged against the clock it is read at. */
function crewOf(answer: unknown, feed: URL, now: number): Crew {
  if (!isRecord(answer) || answer.version !== 1 || !isTime(answer.asOf)) {
    return DOWN;
  }
  if (now - Date.parse(answer.asOf) > STALE_MS) return DOWN;
  const { current, last } = answer;
  if (current !== null && !isRunFrame(current)) return DOWN;
  if (last !== null && !isRunFrame(last)) return DOWN;
  if (current) {
    return { state: current.live ? "live" : "open", run: runOf(current, feed) };
  }
  return last ? { state: "resting", run: runOf(last, feed) } : DOWN;
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
 * Next.js still prerenders (cacheLife's "Prerendering behavior"), so /crew stays static and
 * regenerates in the background: a visitor sees a read about five minutes old at most, or the
 * build's page, which claims nothing, after a quiet spell. A failed read tells the last good answer (`kept`) while it is fresh, and down after, and either is retried
 * on the first request 30 s after it. An answer the data rules refuse reads as down at once. The
 * clock is read inside the cache, since a prerender can't read it outside one, so an answer's age
 * is judged when it is read.
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

const PULL =
  /^https:\/\/github\.com\/nycruslan\/theseus-portfolio\/pull\/(\d+)$/;

/** The pull request's page, only when it is this repository's own: never another site's link. */
export function pullHref(pr: NonNullable<Run["pr"]>): string | null {
  const match = pr.url ? PULL.exec(pr.url) : null;
  return match && Number(match[1]) === pr.number ? pr.url : null;
}
