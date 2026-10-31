import { CrewTable } from "@/components/crew-table";
import { profile } from "@/content/profile";
import { type Crew, pullHref, type Run } from "@/lib/crew-feed";
import { REPO_URL } from "@/lib/site";
import type { SprintEntry } from "@/lib/sprint-log";
import { utcDay, utcTime } from "@/lib/utc";

// The crew's panel on /crew (.crew/sprint/31/contract.md, "Data rules"; crew-1440.webp and
// crew-390.webp): who is working on the site now, who approves, and the rules, told from the feed
// in one of four states. Everything the feed says is rendered as text, never as markup. Copper is
// only on a Working row and the now line, and both exist only while the crew is live.

const OWNER = profile.name;

const RULES =
  "Only real events from the crew's sessions, as they happen. Its briefs and words are public; credentials are masked before anything is stored. Visitors watch: they can't start or steer the crew.";

const PENDING = `Not given yet. The pull request merges only after the checks, Lens's review and ${OWNER}'s rules pass; what his rules leave to him waits for him.`;

/** The told state, and the build's merged retros, newest first: the first is the record. */
type Props = { crew: Crew; entries: SprintEntry[] };

function status(crew: Crew): string {
  switch (crew.state) {
    case "live":
      return "Live";
    case "open":
      return crew.run.health.state === "waiting"
        ? "Waiting on the owner"
        : "Paused";
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
function approval(crew: Crew, entries: SprintEntry[]): string {
  const merged = (entry: SprintEntry | undefined) =>
    !entry
      ? "Merged."
      : entry.ownersCall
        ? `${OWNER}, on the pull request.`
        : `Merged behind the checks, Lens's review and ${OWNER}'s rules.`;
  switch (crew.state) {
    case "open":
      if (crew.run.health.state === "waiting") {
        return `${OWNER}, on the pull request. Not given yet.`;
      }
      return PENDING;
    case "live":
      return PENDING;
    case "resting":
      return merged(entries.find((entry) => entry.sprint === crew.run.sprint));
    case "down":
      return merged(entries[0]);
  }
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
  // unique.
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

function Evidence({
  crew,
  record,
}: {
  crew: Crew;
  record: SprintEntry | undefined;
}) {
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

export function CrewPanel({ crew, entries }: Props) {
  const [record] = entries;
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
      <p data-status="" className="crew-status">
        {status(crew)}
      </p>
      <CrewTable crew={crew} />
      {run && <Activity run={run} live={crew.state === "live"} />}
      <dl className="crew-facts">
        <dt>Evidence</dt>
        <Evidence crew={crew} record={record} />
        <dt>Approval</dt>
        <dd data-approval="">{approval(crew, entries)}</dd>
        <dt>Rules</dt>
        <dd data-rules="">{RULES}</dd>
      </dl>
    </section>
  );
}
