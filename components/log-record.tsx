import type { ReactNode } from "react";
import { signatures } from "@/components/revisions";
import { PLANKS } from "@/lib/hull-layouts";
import { REPO_URL } from "@/lib/site";
import type { SprintEntry } from "@/lib/sprint-log";

// One revision's record, open on /log/<n> (.crew/sprint/29/b5-first-contract.md, "The record"): the
// row's cells, its size, its pull request and its plank, then what went wrong in the crew's words,
// whole. Only the retro's public fields and the cells the sheet already publishes.

const SIZE_WORDS = { S: "Small", M: "Medium", L: "Large" } as const;

/** The lifts, deck (0) to keel, and the seats in each, from the planks' ids "k.j". */
const LIFTS = PLANKS.reduce<number[]>((lifts, plank) => {
  const k = Number(plank.id.split(".")[0]);
  lifts[k] = (lifts[k] ?? 0) + 1;
  return lifts;
}, []);

/**
 * The plank's words (contract, "The plank's words"): where the seat is, counted from 1 as a visitor
 * counts, then what the sprint's plank replaced and whether a later sprint has replaced it.
 */
function plankWords(seat: string, holders: readonly number[], sprint: number) {
  const [k = 0, j = 0] = seat.split(".").map(Number);
  const at = holders.indexOf(sprint);
  const before = holders[at - 1];
  const after = holders[at + 1];
  return [
    `Lift ${k + 1} of ${LIFTS.length} from the deck, plank ${j + 1} of ${LIFTS[k]} from the stern.`,
    before === undefined
      ? "It replaced an original plank, now in the ghost hull."
      : `It replaced sprint ${before}'s plank. The original is in the ghost hull, numbered ${holders[0]}.`,
    after === undefined ? "" : `Sprint ${after} has since replaced it.`,
  ]
    .filter(Boolean)
    .join(" ");
}

/** One term of the record's list and its detail. */
type Pair = { term: string; detail: ReactNode; names?: boolean };

type LogRecordProps = {
  entry: SprintEntry;
  /** The seat its plank took, "k.j", and the seat's holders, oldest first. */
  seat: string;
  holders: readonly number[];
  /** The merged sprints either side of it, where there is one. */
  previous?: number;
  next?: number;
};

export function LogRecord({
  entry,
  seat,
  holders,
  previous,
  next,
}: LogRecordProps) {
  const { sprint } = entry;
  // The row's own cells first, the names kept from a page translator as in the table.
  const pairs: Pair[] = signatures(entry).map(([term, detail, names]) => ({
    term,
    detail,
    names,
  }));
  if (entry.size) pairs.push({ term: "Size", detail: SIZE_WORDS[entry.size] });
  if (entry.pr) {
    pairs.push({
      term: "Pull request",
      detail: (
        <a href={`${REPO_URL}/pull/${entry.pr}`} className="record-pr">
          Pull request #{entry.pr}
        </a>
      ),
    });
  }
  pairs.push({ term: "Plank", detail: plankWords(seat, holders, sprint) });

  // Two items can carry the same text, so a key also counts the earlier ones that equal it.
  const items = entry.wentWrong.map((text, at) => ({
    text,
    nth: entry.wentWrong.slice(0, at).filter((other) => other === text).length,
  }));

  return (
    <section aria-labelledby="record" className="record">
      <p className="record-rev">Rev {sprint}</p>
      <h2 id="record">{entry.goal}</h2>
      <dl>
        {pairs.map(({ term, detail, names }) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd translate={names ? "no" : undefined}>{detail}</dd>
          </div>
        ))}
      </dl>
      {items.length > 0 ? (
        <>
          <h3>What went wrong, in the crew's words</h3>
          <ul className="record-wrong">
            {items.map(({ text, nth }) => (
              <li key={`${nth}-${text}`}>{text}</li>
            ))}
          </ul>
        </>
      ) : null}
      <ul className="record-links">
        <li className="record-close">
          <a href="/log">
            Close<span className="sr-only"> revision {sprint}</span>
          </a>
        </li>
        {previous === undefined ? null : (
          <li className="record-previous">
            <a href={`/log/${previous}`}>Rev {previous}</a>
          </li>
        )}
        {next === undefined ? null : (
          <li className="record-next">
            <a href={`/log/${next}`}>Rev {next}</a>
          </li>
        )}
      </ul>
    </section>
  );
}
