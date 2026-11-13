import { GRID, keyOf, OFF_GRID, onGrid, type Win } from "./trials";
import sweep from "./trials-sweep.json";

// The committed sweep (.crew/sprint/63/contract.md, T4): the contact links' freeboard at every
// swept window, measured by .crew/sprint/63/trials-sweep.mjs on a production build of `commit` in
// `chromium`, with the frame's address top-level at the window, scripts off and fonts ready.
// Imported into the server's bundle, never read from disk: the window pages render on demand, on
// servers that don't have the repository's files (memory, sprint 46).
//
// Each freeboard is in tenths of a pixel, rounded so the kind still reads as the unrounded value
// does (the script's tenthOf). `columns` holds one string per grid width, heights ascending: the
// first height's value, then each step's change, `d*n` for n steps of d. `windows` holds the
// pinned and named windows off the grid, and `sideways` every window that scrolls sideways.

export type Swept = { freeboard: number; sideways: boolean };

export const SWEEP_META = {
  commit: sweep.commit,
  chromium: sweep.chromium,
} as const;

const [width, height] = [GRID.width, GRID.height];
const ROWS = (height.to - height.from) / height.step + 1;

/** A column's string, decoded to its tenths, heights ascending. */
function column(text: string) {
  const [first = "", ...steps] = text.split(",");
  const out = [Number(first)];
  for (const step of steps) {
    const [change = "", times = "1"] = step.split("*");
    for (let i = 0; i < Number(times); i++)
      out.push((out.at(-1) ?? 0) + Number(change));
  }
  return out;
}

const grid = sweep.columns.map(column);
const offGrid: Readonly<Record<string, number>> = sweep.windows;
let checked = false;

/**
 * A sweep written for another grid, or before a window was pinned or named, would answer wrongly or
 * not at all: the server's pages check it first, so the build fails instead (lib/trials-answer.ts,
 * sweptTrial). The browser's copy is the one the build checked, so the check and its message stay
 * out of the trials controller's chunk (.crew/sprint/64/contract.md, T10's budget).
 */
export function checkSweep() {
  if (checked) return;
  if (
    grid.length !== (width.to - width.from) / width.step + 1 ||
    grid.some((col) => col.length !== ROWS || col.some(Number.isNaN)) ||
    OFF_GRID.some((win) => offGrid[keyOf(win)] === undefined)
  )
    throw new Error(
      `lib/trials-sweep.json (taken on ${sweep.commit}) doesn't hold every window lib/trials.ts sweeps: rewrite it with \`pnpm build && node .crew/sprint/63/trials-sweep.mjs\``,
    );
  checked = true;
}

const sideways = new Set<string>(sweep.sideways);

/** The sweep's reading at a window, or undefined for one it doesn't hold. */
export function sweptAt(w: number, h: number): Swept | undefined {
  const win: Win = [w, h];
  const tenths = onGrid(win)
    ? grid[(w - width.from) / width.step]?.[(h - height.from) / height.step]
    : offGrid[keyOf(win)];
  if (tenths === undefined) return undefined;
  return { freeboard: tenths / 10, sideways: sideways.has(keyOf(win)) };
}
