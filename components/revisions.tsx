import { INLINE_LINK } from "@/components/crew-link";
import { PlankCount, PlankLegend } from "@/components/plank-key";
import { CREW_APPROVED, CREW_WHO } from "@/lib/crew-key";
import type { Run } from "@/lib/crew-run";
import type { Pencil } from "@/lib/live-layer";
import type { SprintEntry } from "@/lib/sprint-log";
import { utcDay, utcTime } from "@/lib/utc";

const NONE = "—";
const ROWS = 5;

/**
 * The foot row's links, the Log and the door into its yard, one string so the two stay alike word
 * for word (.crew/sprint/60/contract.md, "The door"): ink, semibold, a 1 px underline 3 px out and
 * 2 px on hover, at least 24 px tall.
 */
const FOOT_LINK =
  "inline-flex min-h-6 items-center font-semibold text-foreground underline decoration-1 underline-offset-[3px] hover:decoration-2";

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

/**
 * The table's key (.crew/sprint/40/contract.md, "Data rules"): the names are AI agents, and what
 * Gate and Owner mean under Approved. / and the Log set it under the same hook. Its first sentence
 * is a span of its own, which / sets in ink (Iris, .crew/sprint/40/review-iris.md, must 1). In the
 * rest, "his rules" is a link to the keel, in ink and underlined as the block's other links, and
 * inline, so the line keeps its length and its wrap (.crew/sprint/48/contract.md, K9). Each part is
 * one string, so its words stand whole in the server's HTML.
 */
export function CrewKey({ className }: { className: string }) {
  return (
    <p data-crew-key="" className={className}>
      <span className="crew-key-who">{CREW_WHO}</span>
      {` ${CREW_APPROVED.before}`}
      <a href="/crew#keel" className={INLINE_LINK}>
        {CREW_APPROVED.rules}
      </a>
      {CREW_APPROVED.after}
    </p>
  );
}

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
  /** The crew at rest: the last merge the feed told, and the replay it offers. */
  rest?: Pick<Run, "sprint" | "mergedAt" | "replay"> | null;
  className?: string;
};

/**
 * The rest line (.crew/sprint/34/contract.md, "The rest line"; notes-iris.md, calls 1 and 2): /crew's
 * resting status word for word (components/crew.tsx), "Crew resting. Sprint 33 merged 31 Oct, 01:50
 * UTC.", the sprint and the time each kept on one line where the line wraps. With a replay offered,
 * the way to it follows at the line's end, or on a line of its own where they don't fit: a link to
 * /crew's anchor, which plays it there (.crew/sprint/37/contract.md, "The rest line on /"). HTML
 * alone, so / ships no script for it.
 */
function RestLine({
  rest,
}: {
  rest: Pick<Run, "sprint" | "mergedAt" | "replay">;
}) {
  const { sprint, mergedAt } = rest;
  const merged = mergedAt === null ? Number.NaN : Date.parse(mergedAt);
  const at = Number.isNaN(merged) ? null : new Date(merged);
  const sentence = (
    <>
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
    </>
  );
  // Only a run with a number offers a replay (lib/crew-run.ts).
  if (!rest.replay || sprint === null) {
    return (
      <p data-rest="" className="rev-rest">
        {sentence}
      </p>
    );
  }
  return (
    <p data-rest="" className="rev-rest rev-rest-replay">
      <span>{sentence}</span>
      <a href="/crew#replay" className="rev-replay">
        <span aria-hidden="true" className="rev-play" />
        Replay sprint {sprint}
      </a>
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
// each, read from its retro at build time. The full record is the Log, one link away, and its yard,
// where a visitor rebuilds the ship, one more. On phones each row folds under its number
// (app/globals.css, "The revision table"); the cells stay the same.
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
  // The yard's first step: the sprint merged first, the oldest entry, which /log's own "Rebuild it
  // yourself" opens too (components/log.tsx, `merged[0]`), so the two doors can't disagree.
  const first = entries.at(-1)?.sprint;
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
      {/* Right under the rows it explains, at every width, so a visitor reads who the names are in
        the first screen: at 1440 × 900 it takes one line of the block's slack above its foot, which
        the resting state's rest line leaves at 45 px (.crew/sprint/40/decisions.md, 8). From 1024
        to 1439 px the contact links follow the bio instead of waiting at this block's foot under
        960 px tall to 1279, and from 1280 under 900 or wider than 13:8, so its line can't push
        them out of view; a taller window holds both (.crew/sprint/45/placement.md, call 2). From
        1024 to 1247 it takes two lines, split between its sentences (app/globals.css). */}
      <CrewKey className="rev-key text-step-sm text-muted" />
      {/* At the cell's foot from 1024 px, on the title block's Contact line, when the row is
          taller than this block (the bottom row's minimum height, app/globals.css). The door into
          the yard follows the Log link, beside it or on the next line where the two don't fit
          (.crew/sprint/60/contract.md, "The door"; .crew/sprint/57/door-iris.md): HTML alone, so
          / ships no script for it, and Tab reaches it right after the Log link. Its room on the
          line is the legend's Original item, left out while no plank on the drawing is original
          (components/plank-key.tsx), so Contact's links stay where they were. */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-step-sm lg:mt-auto">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <PlankCount planks={planks} replaced={replaced} />
          <PlankLegend
            planks={planks}
            replaced={replaced}
            pencil={Boolean(pencil)}
            copper={Boolean(pencil?.live)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <a href="/log" className={FOOT_LINK}>
            All {entries.length} revisions in the Log
          </a>
          {first === undefined ? null : (
            <>
              {" "}
              <a href={`/log/${first}`} className={FOOT_LINK}>
                Rebuild it yourself
              </a>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
