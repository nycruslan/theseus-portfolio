import type { ReactNode } from "react";
import { sofiaCondensed } from "@/app/fonts";
import { Bar } from "@/components/bar";
import { LinesPlan } from "@/components/lines-plan";
import { LogRecord } from "@/components/log-record";
import { signatures } from "@/components/revisions";
import { SkipLink } from "@/components/skip-link";
import { PLANKS } from "@/lib/hull-layouts";
import { ghostPlanks, seatHolders } from "@/lib/lines-plan";
import { dayWords, utcDay, utcYear, weekdayWords } from "@/lib/log-dates";
import type { MergeRecord, SprintEntry } from "@/lib/sprint-log";

// The Log (.crew/sprint/29/b5-first-contract.md; the approved frames log-1440.webp and log-390.webp
// in .crew/sprint/17/design/): the ghost hull with its caption and count, the lines figure, then
// every merged sprint as a revision table, newest first, grouped by the UTC day it merged
// (.crew/sprint/32/contract.md). A record is the same page with the record open, at /log/<n>, so
// opening one is a document navigation and Back closes it with no script. The page loads the
// framework's script and nothing else (B5.10), and nothing on it moves or is copper.

type LogProps = {
  /** Every merged sprint, newest first (lib/sprint-log.ts). */
  entries: readonly SprintEntry[];
  /** The record open on this page, by its sprint. */
  open?: number;
};

/**
 * The count line under the caption (contract, "The Log's header"). "sprint 23" never breaks, so a
 * phone's line doesn't end on "sprint" with the number alone below it.
 */
function countLine(merged: readonly number[]): ReactNode {
  const k = merged.length;
  const all = PLANKS.length;
  if (k < all) {
    return `${k} of ${all} original planks are out. The gaps are the ${all - k} still sailing.`;
  }
  const since =
    k > all
      ? ` Since then the crew has replaced ${k - all} planks of its own.`
      : "";
  return (
    <>
      {`All ${all} original planks are out: the last went with `}
      <span className="whitespace-nowrap">{`sprint ${merged[all - 1]}`}</span>
      {`.${since}`}
    </>
  );
}

const count = new Intl.NumberFormat("en-US");

/**
 * The ship of Theseus in one number, from the newest merge record (contract, "The lines figure"),
 * one sentence: the figure in the display face, the rest under it (.crew/sprint/32/notes-iris.md,
 * section 3). The hash is kept from a page translator.
 */
function LinesFigure({ commit, lines: { original, total } }: MergeRecord) {
  // One decimal, rounded half up on whole numbers rather than on a binary fraction.
  const percent = (Math.round((original * 1000) / total) / 10).toFixed(1);
  return (
    <p className="log-lines">
      <span className="log-lines-n">
        {`${count.format(original)} of ${count.format(total)} lines`}
      </span>
      {` of the site's code are still original: ${percent}%, by git blame on app, components and lib at `}
      <span translate="no">{commit.slice(0, 7)}</span>.
    </p>
  );
}

type DayGroup = {
  /** The UTC day, "2026-10-24", or none for a run of rows without a merge record. */
  day?: string;
  /** The run's rows, in the table's order; never empty. */
  entries: SprintEntry[];
};

/**
 * The table's groups, top to bottom (contract, "Day groups"; decision 11): runs of consecutive rows
 * in the table's order, sprint number descending, so the groups never reorder the rows. A new
 * group starts wherever a row's UTC merge day, or whether it has a record, differs from the row
 * above's; a day shows twice only when a sprint merged after a higher one, on a later day.
 */
function dayGroups(entries: readonly SprintEntry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const entry of entries) {
    const day = entry.merge ? utcDay(entry.merge.mergedAt) : undefined;
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.entries.push(entry);
    else groups.push({ day, entries: [entry] });
  }
  return groups;
}

/** The record merged last, whatever its sprint's number (decision 11). */
function latestMerge(entries: readonly SprintEntry[]) {
  let latest: MergeRecord | undefined;
  for (const { merge } of entries) {
    if (
      merge &&
      (!latest || Date.parse(merge.mergedAt) > Date.parse(latest.mergedAt))
    ) {
      latest = merge;
    }
  }
  return latest;
}

/** "4 revisions", "1 revision". */
function revisions(n: number) {
  return `${n} ${n === 1 ? "revision" : "revisions"}`;
}

export function Log({ entries, open }: LogProps) {
  // The planks are seated oldest first.
  const merged = entries.map((entry) => entry.sprint).reverse();
  const holders = seatHolders(merged);
  const record = entries.find((entry) => entry.sprint === open);
  const seat = record
    ? [...holders].find(([, list]) => list.includes(record.sprint))
    : undefined;
  // The record's place in merged order, for its previous and next revisions.
  const at = record ? merged.indexOf(record.sprint) : -1;
  // The newest record is the one merged last: the lines figure's, and the year a date leaves out.
  const newest = latestMerge(entries);
  const year = newest ? utcYear(newest.mergedAt) : Number.NaN;

  return (
    <>
      <SkipLink />
      <Bar at={record ? "record" : "log"} className={sofiaCondensed.variable} />
      {/* tabIndex -1: the skip link's landing spot, never a Tab stop. */}
      <main
        id="main"
        tabIndex={-1}
        className={`log${record ? " log-open" : ""} ${sofiaCondensed.variable}`}
      >
        {/* The header, then the record, then the drawing: below 1024 px CSS sets the drawing
          between the h1 and the caption, as the frame does; it is hidden from assistive tech, so
          the reading order is the DOM's (.crew/sprint/30/notes-iris.md, section 1.2). */}
        <div className="log-head">
          <h1>Log</h1>
          <p data-ghost-caption="">
            The ghost hull: the original planks the crew has taken out, each
            numbered by the sprint that replaced it.
          </p>
          <p data-ghost-count="">{countLine(merged)}</p>
          {newest ? <LinesFigure {...newest} /> : null}
        </div>

        {record && seat ? (
          <LogRecord
            entry={record}
            seat={seat[0]}
            holders={seat[1]}
            previous={merged[at - 1]}
            next={merged[at + 1]}
          />
        ) : null}

        <LinesPlan
          seats={ghostPlanks(merged)}
          view="ghost"
          current={seat?.[0]}
          className="log-ghost"
        />

        <section aria-labelledby="every-revision" className="log-revs">
          <h2 id="every-revision">Every revision</h2>
          {/* "27 revisions" never breaks, so the number keeps its noun on a phone. */}
          <p className="log-lede">
            {"A crew of AI agents rebuilds this site one sprint at a time. "}
            <span className="whitespace-nowrap">{`${entries.length} revisions`}</span>
            {", newest first: choose one to open its record."}
          </p>
          {/* The key to Approved, which the table and the records share (notes-iris.md, 3.2). */}
          <p className="log-lede log-key">
            Under Approved, Gate is CI, the owner's rules and Lens's review;
            Owner is the owner's own decision.
          </p>
          <table className="rev rev-log">
            <thead>
              <tr>
                <th scope="col" className="w-[34px]">
                  Rev
                </th>
                <th scope="col">Description</th>
                <th scope="col" className="w-[80px]">
                  Drawn
                </th>
                <th scope="col" className="w-[58px]">
                  Checked
                </th>
                <th scope="col" className="w-[52px]">
                  Tested
                </th>
                <th scope="col" className="w-[64px]">
                  Approved
                </th>
                <th scope="col" className="w-[52px]">
                  Date
                </th>
              </tr>
            </thead>
            {dayGroups(entries).map(({ day, entries: group }) => (
              // A day or "Undated" can head two runs, so the run's first sprint keys it.
              <tbody key={group[0]?.sprint}>
                <tr className="rev-day">
                  <th scope="rowgroup" colSpan={7}>
                    {day && group[0]?.merge ? (
                      <>
                        <time dateTime={day}>
                          {weekdayWords(group[0].merge.mergedAt, year)}
                        </time>
                        <span className="rev-day-n">
                          {` · ${revisions(group.length)}`}
                        </span>
                      </>
                    ) : (
                      "Undated"
                    )}
                  </th>
                </tr>
                {group.map((entry) => (
                  <tr key={entry.sprint}>
                    <th scope="row">
                      {/* The eyes see the number; the name is "Revision 13". */}
                      <a
                        href={`/log/${entry.sprint}`}
                        className="rev-link"
                        aria-current={
                          entry.sprint === open ? "page" : undefined
                        }
                      >
                        <span className="sr-only">Revision </span>
                        {entry.sprint}
                      </a>
                    </th>
                    <td>{entry.goal}</td>
                    {signatures(entry).map(([head, cell, names]) => (
                      <td
                        key={head}
                        data-label={head}
                        translate={names ? "no" : undefined}
                      >
                        {cell}
                      </td>
                    ))}
                    {/* Empty, never "—", until the sprint has a merge record (decision 5).
                      Folded, it is read by assistive tech only: the header names the day. */}
                    <td data-label="Date">
                      {entry.merge ? (
                        <time dateTime={entry.merge.mergedAt}>
                          {dayWords(entry.merge.mergedAt, year)}
                        </time>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </section>
      </main>
    </>
  );
}
