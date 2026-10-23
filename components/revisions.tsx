import { PlankCount, PlankLegend } from "@/components/plank-key";
import type { SprintEntry } from "@/lib/sprint-log";

const NONE = "—";
const ROWS = 5;

/**
 * A row's cells after Rev and Description, by their column's head (contract, "Data rules"). The
 * first three hold the crew's names, which a page translator would otherwise turn into words.
 */
const signatures = (
  entry: SprintEntry,
): [head: string, cell: string, names: boolean][] => [
  ["Drawn", entry.drawn.length > 0 ? entry.drawn.join(", ") : NONE, true],
  ["Checked", entry.checked ? "Lens" : NONE, true],
  ["Tested", entry.tested ? "Probe" : NONE, true],
  ["Approved", entry.ownersCall ? "Owner" : "Gate", false],
];

type RevisionsProps = {
  /** Every sprint on record, newest first (lib/sprint-log.ts). */
  entries: readonly SprintEntry[];
  /** The bio's sentences after the title block's two. */
  caption: string;
  /** The drawing's plank count, and how many the crew has replaced. */
  planks: number;
  replaced: number;
  className?: string;
};

// The sheet's revision block (.crew/sprint/22/contract.md, B1.5; notes-iris.md, section 8): the five
// newest sprints on record as a drawing's revision table, who drew, checked, tested and approved
// each, read from its retro at build time. The full record is the Log, one link away. On phones each
// row folds under its number (app/globals.css, "The revision table"); the cells stay the same.
export function Revisions({
  entries,
  caption,
  planks,
  replaced,
  className = "",
}: RevisionsProps) {
  return (
    <section
      aria-labelledby="revisions"
      className={`sheet-row flex flex-col gap-2.5 border-t-2 border-foreground px-4 pt-[18px] pb-6 lg:border-x lg:border-b lg:px-6 lg:pb-4 ${className}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <h2
          id="revisions"
          className="font-cond text-step-xl leading-none font-bold"
        >
          Revisions
        </h2>
        {caption ? <p className="text-step-sm text-muted">{caption}</p> : null}
      </div>
      <table className="rev">
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
          {entries.slice(0, ROWS).map((entry) => (
            <tr key={entry.sprint}>
              <th scope="row">{entry.sprint}</th>
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
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-step-sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <PlankCount planks={planks} replaced={replaced} />
          <PlankLegend />
        </div>
        <a
          href="/sprints"
          className="inline-flex min-h-6 items-center font-semibold text-foreground underline decoration-1 underline-offset-[3px] hover:decoration-2"
        >
          All {entries.length} revisions in the Log
        </a>
      </div>
    </section>
  );
}
