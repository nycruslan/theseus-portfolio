"use no memo";

import { CrewTable } from "@/components/crew-table";
import { type Crew, type Moment, pullHref, type Run } from "@/lib/crew-run";
import { REPO_URL } from "@/lib/site";
import { utcDay, utcTime } from "@/lib/utc";

// The crew's panel on /crew (.crew/sprint/31/contract.md, "Data rules"; crew-1440.webp and
// crew-390.webp): who is working on the site now, who approves, and the rules, told from the feed
// in one of four states. Everything the feed says is rendered as text, never as markup. Copper is
// only on a Working row and the now line, and both exist only while the crew is live. The server
// renders it first and the browser again on each told poll (components/crew-live.tsx), from the
// same props, so it imports nothing the browser can't have.
// Not memoised by the React Compiler ("use no memo"), for /crew's script budget
// (.crew/sprint/37/contract.md, call 8): its caches cost bytes and save little, since the panel
// renders again only on a told poll or a replay's step (one every 1.5 s), a few dozen elements.

/** What the panel shows from the build's retros, which the browser can't read. */
export type Facts = {
  /** The owner's name, for Approval (content/profile.ts stays on the server). */
  owner: string;
  /** The newest merged retro: the record the panel falls back on with the feed down. */
  record: { sprint: number; goal: string; pr: number | null } | null;
  /** Every merged retro, newest first, for how each sprint's merge was approved. */
  retros: { sprint: number; ownersCall: boolean }[];
};

/** Who started or stopped working, and a count that makes each saying a node of its own. */
export type Said = { text: string; count: number };

/**
 * A replay the visitor started (.crew/sprint/37/contract.md, "Playing"): its sprint, its moments
 * oldest first, `k` of them played, and whether it is paused. Played past its last moment, it has
 * ended, and the list keeps them all.
 */
export type Replay = {
  sprint: number;
  moments: Moment[];
  k: number;
  paused: boolean;
};

type Props = {
  crew: Crew;
  facts: Facts;
  /** "Pause updates" is pressed: the visitor froze the panel. */
  paused: boolean;
  /** The poller runs, so the button does something and is shown. */
  ready: boolean;
  onPause: () => void;
  said: Said;
  /** The replay playing, paused or ended; null before the first press, or once a poll closes it. */
  replay: Replay | null;
  onReplayPause: () => void;
  /** Ticks are on the drawing, so the key names them. */
  ticks: boolean;
};

const RULES =
  "Only real events from the crew's sessions, as they happen. Its briefs and words are public; credentials are masked before anything is stored. Visitors watch: they can't start or steer the crew.";

function status(crew: Crew): string {
  switch (crew.state) {
    case "live":
      return "Live";
    case "open":
      // Not "Paused", which beside a pressed "Pause updates" read as the visitor's own pause (Iris,
      // .crew/sprint/35/notes-iris.md, 1.7).
      return crew.run.health.state === "waiting"
        ? "Waiting on the owner"
        : "Between sessions";
    case "resting": {
      const { sprint, mergedAt } = crew.run;
      if (sprint === null) return "Crew resting.";
      const merged = mergedAt === null ? Number.NaN : Date.parse(mergedAt);
      if (Number.isNaN(merged)) return `Crew resting. Sprint ${sprint} merged.`;
      const at = new Date(merged);
      return `Crew resting. Sprint ${sprint} merged ${utcDay(at)}, ${utcTime(at)} UTC.`;
    }
    case "down":
      return crew.unread
        ? "Here is the latest revision on record."
        : "The live feed isn't answering. Here is the latest revision on record.";
  }
}

/** The owner's word: still to come on an open run; at rest, how the merge was approved. */
function approval(crew: Crew, { owner, retros }: Facts): string {
  const merged = (retro: Facts["retros"][number] | undefined) =>
    !retro
      ? "Merged."
      : retro.ownersCall
        ? `${owner}, on the pull request.`
        : `Merged behind the checks, Lens's review and ${owner}'s rules.`;
  switch (crew.state) {
    case "open":
      if (crew.run.health.state === "waiting") {
        return `${owner}, on the pull request. Not given yet.`;
      }
      break;
    case "resting":
      return merged(retros.find((retro) => retro.sprint === crew.run.sprint));
    case "down":
      return merged(retros[0]);
  }
  return `Not given yet. The pull request merges only after the checks, Lens's review and ${owner}'s rules pass; what his rules leave to him waits for him.`;
}

function Chip({
  sprint,
  goal,
}: {
  sprint: number | null;
  goal: string | null;
}) {
  if (sprint === null && goal === null) return null;
  // The number boxed as a plank (hatched while in progress, seated at rest: app/globals.css), the
  // goal beside it, wrapping under itself.
  return (
    <p data-chip="" className="crew-chip">
      {sprint !== null && <span className="crew-chip-number">{sprint}</span>}
      {sprint !== null && goal !== null && " "}
      {goal !== null && <span className="crew-goal">{goal}</span>}
    </p>
  );
}

/** The now line: Atlas's own words in quotation marks when the Studio quotes him. */
function Now({ run }: { run: Run }) {
  const { now, health } = run;
  if (!now) return null;
  const quoted = health.quote && now === health.line;
  return (
    <p data-now="" className="crew-now">
      <span className="crew-time">now</span>{" "}
      {quoted ? (
        <span className="crew-text">
          <span className="crew-who">Atlas:</span> <q>{now}</q>
        </span>
      ) : (
        <span className="crew-text">{now}</span>
      )}
    </p>
  );
}

/**
 * Iris's key for the tally (.crew/sprint/37/contract.md, "The tick key"; decision 7), its symbol
 * what the words name: a small plank in pencil, hatched inside a dashed edge, with three ticks
 * hanging from it. Shown only while ticks are on the drawing, since a key names only what is there.
 */
const TICK_KEY = (
  <p data-tick-key="" className="crew-key">
    <svg
      viewBox="0 0 28 12"
      width="28"
      height="12"
      aria-hidden="true"
      focusable="false"
    >
      <pattern
        id="tick-key-hatch"
        patternUnits="userSpaceOnUse"
        width="3"
        height="3"
        patternTransform="rotate(45)"
      >
        <path d="M0 0v3m3-3v3" />
      </pattern>
      <rect
        x=".5"
        y=".5"
        width="27"
        height="5"
        fill="url(#tick-key-hatch)"
        strokeDasharray="2 1.5"
      />
      <path strokeWidth={1.4} d="M12 6v5m5-5v5m5-5v5" />
    </svg>
    One tick on the plank in pencil for each moment above, up to ten.
  </p>
);

function Activity({
  run,
  live,
  resting,
  replay,
  onReplayPause,
  ticks,
}: {
  run: Run;
  live: boolean;
  resting: boolean;
  replay: Replay | null;
  onReplayPause: () => void;
  ticks: boolean;
}) {
  const now = live ? <Now run={run} /> : null;
  // While a replay is listed, the moments played, newest on top, under the day it began (Iris).
  const moments = replay
    ? replay.moments.slice(0, replay.k).reverse()
    : run.moments;
  const [first] = replay ? replay.moments : moments;
  if (!first) return now;
  const day = utcDay(new Date(first.at));
  // The feed gives a moment no id, and two can match in every field: the repeat count keeps keys
  // unique. Keys come from the moment alone, so a poll that adds one keeps every other's node.
  const seen = new Map<string, number>();
  return (
    // At rest, the anchor the entry and /'s link land on, under the bar (app/globals.css), and
    // where focus goes when the pause hides at the end, never a Tab stop.
    <div
      id={resting ? "replay" : undefined}
      tabIndex={resting ? -1 : undefined}
      data-replaying={replay ? "" : undefined}
      className="crew-block"
    >
      <div className="crew-activity-head">
        <h2 className="crew-activity">
          {replay ? "Replay" : "Activity"}, {day} (UTC)
        </h2>
        {/* Pause updates' grammar: pressed means paused, and the name never changes. Its box is
          kept whenever a replay is offered, so it shows from the first moment to the end and
          moves nothing. */}
        {run.replay || replay ? (
          <button
            type="button"
            data-replay-pause=""
            data-shown={
              replay && replay.k <= replay.moments.length ? "" : undefined
            }
            aria-pressed={replay?.paused ?? false}
            onClick={onReplayPause}
            className="crew-pause crew-replay-pause"
          >
            <span aria-hidden="true" className="crew-bars" />
            Pause replay
          </button>
        ) : null}
      </div>
      {now}
      <ol data-moments="" className="crew-moments">
        {moments.map((moment) => {
          const at = new Date(moment.at);
          const time =
            utcDay(at) === day ? utcTime(at) : `${utcDay(at)} ${utcTime(at)}`;
          const id = `${moment.at} ${moment.kind} ${moment.text}`;
          const repeat = seen.get(id) ?? 0;
          seen.set(id, repeat + 1);
          return (
            <li key={`${id} ${repeat}`} data-kind={moment.kind}>
              <time dateTime={at.toISOString()} className="crew-time">
                {time}
              </time>{" "}
              <span className="crew-text">{moment.text}</span>
            </li>
          );
        })}
      </ol>
      {ticks ? TICK_KEY : null}
    </div>
  );
}

// Ink, underlined, a target 44 px tall below 1024 and 24 from it (app/globals.css, ".crew-link").
const LINK =
  "crew-link text-foreground underline decoration-1 underline-offset-[3px] hover:decoration-2";

function Evidence({ crew, record }: { crew: Crew; record: Facts["record"] }) {
  if (crew.state === "down") {
    return record?.pr ? (
      <dd data-evidence="">
        <a href={`${REPO_URL}/pull/${record.pr}`} className={LINK}>
          Pull request #{record.pr}
        </a>
      </dd>
    ) : (
      <dd data-evidence="" />
    );
  }
  const { run, state } = crew;
  const href = run.pr ? pullHref(run.pr) : null;
  return (
    <dd data-evidence="">
      {run.studio && (
        <a href={run.studio} className={LINK}>
          This run on the Studio
        </a>
      )}
      {run.studio && " "}
      {run.pr ? (
        href ? (
          <a href={href} className={LINK}>
            Pull request #{run.pr.number}
          </a>
        ) : (
          <span>Pull request #{run.pr.number}</span>
        )
      ) : (
        state !== "resting" && (
          <span>The pull request opens at the end of the sprint.</span>
        )
      )}
    </dd>
  );
}

export function CrewPanel({
  crew,
  facts,
  paused,
  ready,
  onPause,
  said,
  replay,
  onReplayPause,
  ticks,
}: Props) {
  const { record } = facts;
  const run = crew.state === "down" ? null : crew.run;
  // Only a resting run carries a replay, and only when it has a number (lib/crew-run.ts).
  const offer = run?.replay ? run.sprint : null;
  return (
    <section
      aria-labelledby="crew"
      data-crew-state={crew.state}
      className="crew"
    >
      <div className="crew-head">
        <h1 id="crew">Crew</h1>
        {/* The frame's ×: the way back to the sheet. */}
        <a data-close="" href="/" className="crew-close">
          <span className="sr-only">Close</span>
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M3 3 13 13M13 3 3 13" />
          </svg>
        </a>
      </div>
      {run ? (
        <Chip sprint={run.sprint} goal={run.goal} />
      ) : (
        <Chip sprint={record?.sprint ?? null} goal={record?.goal ?? null} />
      )}
      <div className="crew-status-row">
        <p data-status="" className="crew-status">
          {status(crew)}
        </p>
        {/* The entry (.crew/sprint/37/contract.md, amendment 1): in the status, where the visitor
          sees it, since Activity's head is below the fold at rest. Every press plays from moment
          1; crew-live.tsx takes the press and makes the anchor's jump once the replay is listed.
          Hidden as Pause updates is until the poller runs. */}
        {offer === null ? null : (
          <a
            href="#replay"
            data-replay=""
            data-ready={ready ? "" : undefined}
            className="crew-entry"
          >
            <span aria-hidden="true" className="crew-play" />
            Replay sprint {offer}
          </a>
        )}
        {/* WCAG 2.2.2's pause (.crew/sprint/35/notes-iris.md, section 1). Its name never flips to
          "Resume": aria-pressed carries the state. In the server's HTML, hidden until the poller
          runs (data-ready), so no inert control shows and its arrival moves nothing. */}
        <button
          type="button"
          data-pause=""
          data-ready={ready ? "" : undefined}
          aria-pressed={paused}
          onClick={onPause}
          className="crew-pause"
        >
          Pause updates
        </button>
      </div>
      <CrewTable crew={crew} />
      {run && (
        <Activity
          run={run}
          live={crew.state === "live"}
          resting={crew.state === "resting"}
          replay={replay}
          onReplayPause={onReplayPause}
          ticks={ticks}
        />
      )}
      <dl className="crew-facts">
        <dt>Evidence</dt>
        <Evidence crew={crew} record={record} />
        <dt>Approval</dt>
        <dd data-approval="">{approval(crew, facts)}</dd>
        <dt>Rules</dt>
        <dd data-rules="">{RULES}</dd>
      </dl>
      {/* The page's one live region: empty in the server's HTML, so a screen reader registers it
        before its first words. Each saying is a new node, so the same words twice are heard twice. */}
      <div
        data-announce=""
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {said.text ? <span key={said.count}>{said.text}</span> : null}
      </div>
    </section>
  );
}
