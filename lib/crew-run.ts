// The crew's run as /crew tells it, and the checks that make an answer safe to show. Two readers
// share them: the server, reading the Studio's feed (lib/crew-feed.ts, B4a's data rules in
// .crew/sprint/31/contract.md), and the browser, reading the portfolio's own /api/crew
// (.crew/sprint/35/contract.md, "The browser's check of an answer"). The browser imports this
// module, so it imports nothing of the server's.

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
export type MomentKind = (typeof MOMENT_KINDS)[number];

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
  /** Null when the feed sends none, or only whitespace. */
  goal: string | null;
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
  /**
   * The sprint's moments for /crew's Replay, oldest first, at most 60: only on a resting run that
   * offers one (.crew/sprint/37/contract.md, "The replay").
   */
  replay?: Moment[];
}

/**
 * What /crew tells (.crew/sprint/31/contract.md, "The state"): the run in progress, live or not;
 * the last merged run while nothing is in progress; or nothing, when the feed is down, or when
 * this is the build and it wasn't read (`unread`).
 */
export type Crew =
  | { state: "live" | "open" | "resting"; run: Run }
  | { state: "down"; unread?: true };

const TOLD = ["live", "open", "resting"] as const;
const MAX_MOMENTS = 10;
const MAX_REPLAY = 60;

export type Fields = Record<string, unknown>;

export function isRecord(value: unknown): value is Fields {
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

export function isTime(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

/** A string field that isn't a string reads as null. */
function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * The goal whole, or null when it is blank (B4.32): an empty one left /crew's chip and /'s pencil
 * row with an empty link (Lens, on #87).
 */
function goalOf(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;
}

/** The frame a run must have, or the whole answer is down (the feed's adds `live`). */
export function isRunFrame(value: unknown): value is Fields {
  return (
    isRecord(value) &&
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

/** The entries B4a's moment rules keep, in the feed's order. */
function kept(entries: unknown[]): Moment[] {
  const moments: Moment[] = [];
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const { kind, at } = entry;
    const words = text(entry.text);
    // `who` isn't shown, so an unknown one needs nothing: the moment stays either way.
    if (!isOneOf(MOMENT_KINDS, kind) || !isTime(at) || !words) continue;
    moments.push({ kind, at, text: words });
  }
  return moments;
}

function momentsOf(entries: unknown[]): Moment[] {
  // Newest first; the sort is stable, so ties keep the feed's order.
  return kept(entries)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, MAX_MOMENTS);
}

function pullOf(value: unknown): Run["pr"] {
  if (!isRecord(value)) return null;
  const number = count(value.number);
  return number === null ? null : { number, url: text(value.url) };
}

/**
 * The run's page, only when it is the Studio's own: https and a run's path, on the feed's origin
 * when the reader knows it (the server does; the browser never learns the feed's address).
 */
function studioOf(value: unknown, origin: string | null): string | null {
  if (typeof value !== "string" || !URL.canParse(value)) return null;
  const url = new URL(value);
  return url.protocol === "https:" &&
    (origin === null || url.origin === origin) &&
    url.pathname.startsWith("/studio/runs/")
    ? value
    : null;
}

/**
 * A run in the feed's names (`url` for the Studio's page), checked part by part: a part the rules
 * refuse is dropped, never shown. A route answer passes through unchanged, so the browser renders
 * exactly what the server would, and a bad field can't break the page.
 */
export function runOf(run: Fields, origin: string | null): Run {
  const health = run.health as Fields;
  return {
    sprint: count(run.sprint),
    goal: goalOf(run.goal),
    pr: pullOf(run.pr),
    health: {
      state: String(health.state),
      line: text(health.line),
      quote: health.quote === true,
    },
    now: text(run.now),
    roles: rolesOf(run.roles as unknown[]),
    moments: momentsOf(run.moments as unknown[]),
    studio: studioOf(run.url, origin),
    mergedAt: text(run.mergedAt),
  };
}

/**
 * A resting run, with the replay it offers (.crew/sprint/37/contract.md, "The replay"): the
 * entries the moment rules keep, oldest first (stable, so ties keep the feed's order), the newest
 * 60 of them. Offered only when the run has a number and at least one entry is kept; otherwise the
 * run has no `replay`, and a missing or broken one is never down. The server reads the feed's
 * `last.replay` and the browser /api/crew's `run.replay` by this one rule.
 */
export function restingOf(run: Fields, origin: string | null): Run {
  const told = runOf(run, origin);
  const replay = Array.isArray(run.replay)
    ? kept(run.replay)
        .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
        .slice(-MAX_REPLAY)
    : [];
  return told.sprint !== null && replay.length > 0 ? { ...told, replay } : told;
}

/**
 * The browser's reading of an /api/crew answer: the state it tells, or null when the poll failed
 * (another version, an unknown state, a run where there should be none or none where there should
 * be one), so a tab left open across a deploy that changes the shape never misreads it.
 */
export function crewOfAnswer(answer: unknown): Crew | null {
  if (!isRecord(answer) || answer.version !== 1) return null;
  const { state, run } = answer;
  if (state === "down") return run === null ? { state } : null;
  if (!isOneOf(TOLD, state) || !isRunFrame(run)) return null;
  return {
    state,
    run: state === "resting" ? restingOf(run, null) : runOf(run, null),
  };
}

const PULL =
  /^https:\/\/github\.com\/nycruslan\/theseus-portfolio\/pull\/(\d+)$/;

/** The pull request's page, only when it is this repository's own: never another site's link. */
export function pullHref(pr: NonNullable<Run["pr"]>): string | null {
  const match = pr.url ? PULL.exec(pr.url) : null;
  return match && Number(match[1]) === pr.number ? pr.url : null;
}
