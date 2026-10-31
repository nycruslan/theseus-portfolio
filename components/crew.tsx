import { CrewTable } from "@/components/crew-table";
import { type Crew, pullHref, type Run } from "@/lib/crew-run";
import { REPO_URL } from "@/lib/site";
import { utcDay, utcTime } from "@/lib/utc";

// The crew's panel on /crew (.crew/sprint/31/contract.md, "Data rules"; crew-1440.webp and
// crew-390.webp): who is working on the site now, who approves, and the rules, told from the feed
// in one of four states. Everything the feed says is rendered as text, never as markup. Copper is
// only on a Working row and the now line, and both exist only while the crew is live. The server
// renders it first and the browser again on each told poll (components/crew-live.tsx), from the
// same props, so it imports nothing the browser can't have.

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

type Props = {
  crew: Crew;
  facts: Facts;
  /** "Pause updates" is pressed: the visitor froze the panel. */
  paused: boolean;
  /** The poller runs, so the button does something and is shown. */
  ready: boolean;
  onPause: () => void;
  said: Said;
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

function Activity({ run, live }: { run: Run; live: boolean }) {
  const [newest] = run.moments;
  const now = live ? <Now run={run} /> : null;
  if (!newest) return now;
  const day = utcDay(new Date(newest.at));
  // The feed gives a moment no id, and two can match in every field: the repeat count keeps keys
  // unique. Keys come from the moment alone, so a poll that adds one keeps every other's node.
  const seen = new Map<string, number>();
  return (
    <>
      <h2 className="crew-activity">Activity, {day} (UTC)</h2>
      {now}
      <ol data-moments="" className="crew-moments">
        {run.moments.map((moment) => {
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
    </>
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
}: Props) {
  const { record } = facts;
  const run = crew.state === "down" ? null : crew.run;
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
      {run && <Activity run={run} live={crew.state === "live"} />}
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
