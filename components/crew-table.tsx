import { type Crew, ROSTER, type RosterRole, type Run } from "@/lib/crew-run";

// The crew table (.crew/sprint/31/contract.md, "The crew"): the seven roles of this site's roster,
// always, named as the frames name them, whatever the feed sends. The feed only says what each is
// doing, and the rows lead with whoever is working, as crew-1440.webp orders them.

const CREW: Record<RosterRole, { name: string; word: string }> = {
  lead: { name: "Atlas", word: "Lead" },
  "product-owner": { name: "Quill", word: "Roadmap" },
  engineer: { name: "Forge", word: "Code" },
  "creative-engineer": { name: "Pixel", word: "Motion" },
  "code-reviewer": { name: "Lens", word: "Review" },
  "qa-engineer": { name: "Probe", word: "Tests" },
  "design-director": { name: "Iris", word: "Design" },
};

/** The state words, in the order the rows take. */
const WORDS = ["Working", "Waiting", "Done", "Not on this sprint"] as const;
type Word = (typeof WORDS)[number];

/** Each word's class: its dot, and copper for Working (app/globals.css, "The crew"). */
const SLUGS: Record<Word, string> = {
  Working: "working",
  Waiting: "waiting",
  Done: "done",
  "Not on this sprint": "absent",
};

type Told = Exclude<Crew["state"], "down">;

/**
 * A role's word in a state. Copper's Working is the live run's alone: a run that isn't live has
 * nobody at work this minute, and a resting run's every called role is done.
 */
function wordOf(state: Told, entry: Run["roles"][number] | undefined): Word {
  if (!entry || entry.state === "not-called") return "Not on this sprint";
  if (state === "resting" || entry.state === "done") return "Done";
  return entry.state === "working" && state === "live" ? "Working" : "Waiting";
}

type Row = {
  role: RosterRole;
  word: Word | null;
  line: string | null;
};

/** The seven rows: by state word, roster order within each; in down, roster order and no state. */
function rowsOf(crew: Crew): Row[] {
  if (crew.state === "down") {
    return ROSTER.map((role) => ({ role, word: null, line: null }));
  }
  const { state, run } = crew;
  return ROSTER.map((role) => {
    const entry = run.roles.find((line) => line.role === role);
    return { role, word: wordOf(state, entry), line: entry?.line ?? null };
  }).sort((a, b) => WORDS.indexOf(a.word) - WORDS.indexOf(b.word)); // stable: roster order holds
}

/**
 * What a screen reader hears when a told panel replaces a told one (.crew/sprint/35/contract.md,
 * "The announcement"): who started or stopped working, by the rows' own Working, in roster order;
 * "" when nobody did. The moments and the now line change far more often, so they aren't said.
 */
export function announcement(before: Crew, after: Crew): string {
  const working = (crew: Crew) =>
    new Set(
      rowsOf(crew).flatMap((row) => (row.word === "Working" ? [row.role] : [])),
    );
  const was = working(before);
  const is = working(after);
  return ROSTER.flatMap((role) =>
    was.has(role) === is.has(role)
      ? []
      : [`${CREW[role].name} ${is.has(role) ? "started" : "stopped"} working.`],
  ).join(" ");
}

/** "Forge, Pixel and Probe are not on this sprint." */
function absentSentence(names: string[]): string {
  if (names.length === 1) return `${names[0]} is not on this sprint.`;
  const last = names.at(-1);
  return `${names.slice(0, -1).join(", ")} and ${last} are not on this sprint.`;
}

export function CrewTable({
  crew,
  who,
}: {
  crew: Crew;
  /** The key's first sentence, from the server (lib/crew-key.ts imports the owner's profile). */
  who: string;
}) {
  const rows = rowsOf(crew);
  const absent = rows
    .filter((row) => row.word === "Not on this sprint")
    .map((row) => CREW[row.role].name);

  return (
    <>
      <table className="crew-table">
        <tbody>
          {rows.map(({ role, word, line }) => {
            const notCalled = word === "Not on this sprint";
            return (
              <tr
                key={role}
                data-role={role}
                className={`crew-row${notCalled ? " crew-row-absent" : ""}`}
              >
                <th scope="row" translate="no" className="crew-name">
                  {CREW[role].name}
                </th>
                {/* What each is, in visible words (.crew/sprint/40/contract.md): one string, so
                  the phrase stands whole in the server's HTML. */}
                <td className="crew-word">{`${CREW[role].word}, AI agent`}</td>
                {/* "Not on this sprint" runs into the empty line column, as the frame draws it,
                  so the state column is as wide as Working, Waiting and Done need. */}
                <td
                  data-state=""
                  colSpan={notCalled && line === null ? 2 : undefined}
                  className={`crew-state${word ? ` crew-${SLUGS[word]}` : ""}`}
                >
                  {word}
                </td>
                {notCalled && line === null ? null : (
                  <td className="crew-line">{line}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Below 768 px the roles not on this sprint fold into one line, as crew-390.webp draws it;
        their rows stay in the HTML, hidden there. */}
      {absent.length > 0 && <p data-absent="">{absentSentence(absent)}</p>}
      {/* Where the job column folds away, the roster's key in /'s words, so a phone still reads
        that every name is an AI agent (Iris, .crew/sprint/40/review-iris.md, must 2). Down keeps
        the job column, so it has none. */}
      {crew.state === "down" ? null : <p data-crew-who="">{who}</p>}
    </>
  );
}
