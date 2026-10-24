import type { ReactNode } from "react";
import { sofiaCondensed } from "@/app/fonts";
import { Bar } from "@/components/bar";
import { Foot } from "@/components/foot";
import { LinesPlan } from "@/components/lines-plan";
import { LogRecord } from "@/components/log-record";
import { signatures } from "@/components/revisions";
import { SkipLink } from "@/components/skip-link";
import { PLANKS } from "@/lib/hull-layouts";
import { ghostPlanks, seatHolders } from "@/lib/lines-plan";
import type { SprintEntry } from "@/lib/sprint-log";

// The Log (.crew/sprint/29/b5-first-contract.md; the approved frames log-1440.webp and log-390.webp
// in .crew/sprint/17/design/): the ghost hull with its caption and count, then every merged sprint as
// a revision table, newest first. A record is the same page with the record open, at /log/<n>, so
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
        </div>

        {/* Below 768 px the bar's Read as page is hidden (components/bar.tsx), so it closes the
          header here, after the count line: under the drawing it would part the ghost hull from
          its caption, and on a record it would sit above the record's links yet follow them in
          Tab order, since the record precedes the drawing in the DOM. */}
        <Foot />

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
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.sprint}>
                  <th scope="row">
                    {/* The eyes see the number; the name is "Revision 13". */}
                    <a
                      href={`/log/${entry.sprint}`}
                      className="rev-link"
                      aria-current={entry.sprint === open ? "page" : undefined}
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
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
