import { PlankCount, PlankLegend } from "@/components/plank-key";
import type { Run } from "@/lib/crew-run";
import type { Pencil } from "@/lib/live-layer";
import type { SprintEntry } from "@/lib/sprint-log";
import { utcDay, utcTime } from "@/lib/utc";

const NONE = "—";
const ROWS = 5;

/**
 * A row's cells after Rev and Description, by their column's head (contract, "Data rules"). The
 * first three hold the crew's names, which a page translator would otherwise turn into words. The
 * Log's table and records read the same cells (components/log.tsx), so the two can't disagree.
 */
export const signatures = (
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
  /** The sprint in progress, whose row leads the five (lib/live-layer.ts). */
  pencil?: Pencil | null;
  /** The crew at rest: the last merge the feed told. */
  rest?: Pick<Run, "sprint" | "mergedAt"> | null;
  className?: string;
};

/**
 * The rest line (.crew/sprint/34/contract.md, "The rest line"; notes-iris.md, calls 1 and 2): /crew's
 * resting status word for word (components/crew.tsx), "Crew resting. Sprint 33 merged 31 Oct, 01:50
 * UTC.", the sprint and the time each kept on one line where the line wraps.
 */
function RestLine({ rest }: { rest: Pick<Run, "sprint" | "mergedAt"> }) {
  const { sprint, mergedAt } = rest;
  const merged = mergedAt === null ? Number.NaN : Date.parse(mergedAt);
  const at = Number.isNaN(merged) ? null : new Date(merged);
  return (
    <p data-rest="" className="rev-rest">
      <span className="font-semibold">Crew resting.</span>
      {sprint === null ? null : (
        <>
          {" "}
          <span className="whitespace-nowrap">Sprint {sprint}</span> merged
          {at ? (
            <>
              {" "}
              <time dateTime={at.toISOString()} className="whitespace-nowrap">
                {utcDay(at)}, {utcTime(at)} UTC
              </time>
            </>
          ) : null}
          .
        </>
      )}
    </p>
  );
}

/**
 * The sprint in progress, leading the rows (.crew/sprint/34/contract.md, "The pencil row";
 * main.webp's 17): its number on the pencil's hatch, its goal a link to /crew, where the crew tells
 * it, and while it is live "drawing now" in copper, outside the goal's ellipsis.
 */
function PencilRow({ pencil }: { pencil: Pencil }) {
  const { sprint, goal, live } = pencil;
  const cells: [head: string, cell: string, names: boolean][] = [
    ["Drawn", pencil.drawn, true],
    ["Checked", pencil.checked, true],
    ["Tested", pencil.tested, true],
    ["Approved", pencil.approved, false],
  ];
  return (
    <tr data-pencil="" data-live={live ? "" : undefined}>
      <th scope="row">
        <span className="rev-chip">{sprint}</span>
      </th>
      <td>
        <span className="rev-pencil">
          <a href="/crew" className="rev-goal">
            {goal ?? "In progress"}
          </a>
          {live ? (
            <>
              {" "}
              <span data-drawing="" className="rev-drawing">
                <span aria-hidden="true" className="rev-dot" />
                drawing now
              </span>
            </>
          ) : null}
        </span>
      </td>
      {cells.map(([head, cell, names]) => (
        <td key={head} data-label={head} translate={names ? "no" : undefined}>
          {cell}
        </td>
      ))}
    </tr>
  );
}

// The sheet's revision block (.crew/sprint/22/contract.md, B1.5; notes-iris.md, section 8): the five
// newest sprints on record as a drawing's revision table, who drew, checked, tested and approved
// each, read from its retro at build time. The full record is the Log, one link away. On phones each
// row folds under its number (app/globals.css, "The revision table"); the cells stay the same.
export function Revisions({
  entries,
  caption,
  planks,
  replaced,
  pencil,
  rest,
  className = "",
}: RevisionsProps) {
  // The pencil row takes the first of the five; its own retro, when the build holds one, isn't
  // listed twice.
  const rows = pencil
    ? entries
        .filter((entry) => entry.sprint !== pencil.sprint)
        .slice(0, ROWS - 1)
    : entries.slice(0, ROWS);
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
      {rest ? <RestLine rest={rest} /> : null}
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
          {pencil ? <PencilRow pencil={pencil} /> : null}
          {rows.map((entry) => (
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
      {/* At the cell's foot from 1024 px, on the title block's Contact line, when the row is
          taller than this block (the bottom row's minimum height, app/globals.css). */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-step-sm lg:mt-auto">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <PlankCount planks={planks} replaced={replaced} />
          <PlankLegend
            pencil={Boolean(pencil)}
            copper={Boolean(pencil?.live)}
          />
        </div>
        <a
          href="/log"
          className="inline-flex min-h-6 items-center font-semibold text-foreground underline decoration-1 underline-offset-[3px] hover:decoration-2"
        >
          All {entries.length} revisions in the Log
        </a>
      </div>
    </section>
  );
}
