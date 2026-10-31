import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BUTTS } from "../lib/half-model";

// The oracle for the sheet (.crew/sprint/22/contract.md, "Data rules") and, since sprint 30, for the
// Log (.crew/sprint/29/b5-first-contract.md, "Data rules": the ghost hull, the record, the plank's
// words and the Log's lines), implemented from the contracts' words with this file's own lines,
// never by importing the page's reader. Every expected value comes from the retro files in the
// checkout under test, so the checks stay true as sprints are added and a preview that carries its
// own sprint's retro passes like production.

const SPRINT_DIR = join(process.cwd(), ".crew", "sprint");

export type Retro = {
  sprint: number;
  /** The goal as the Log shows it (presentGoal). */
  goal: string;
  size?: "S" | "M" | "L";
  pr?: number;
  ownersCall: boolean;
  /** The five cells after Rev and Description, as the contract's rules give them. */
  drawn: string[];
  checked: boolean;
  tested: boolean;
  /** The first three `wentWrong[].what` (or `went_wrong`), whole, backticks off, as the reader gives them. */
  wentWrong: string[];
  /** The retro's `outcome` and every `evidence` string: never on the page. */
  unshown: string[];
  /** The sprint's merge record (`merge.json`, sprint 32's B5b), when it has a valid one. */
  merge?: Merge;
};

/** A merge record: `.crew/sprint/<n>/merge.json` (.crew/sprint/32/contract.md, "The merge record"). */
export type Merge = {
  pr: number;
  mergedAt: string;
  commit: string;
  lines: { original: number; total: number };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

/** As the Log presents a goal: prefix, backticks and a trailing size tag off, first letter up. */
function presentGoal(goal: string) {
  const bare = goal
    .replace(/^\s*roadmap item(?:\s+\d+)?\s*:\s*/i, "")
    .replaceAll("`", "")
    .trim()
    .replace(/\s*\(\s*[SML]\s*\)$/i, "")
    .trim();
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

const NAMES: Record<string, string> = {
  engineer: "Forge",
  "creative-engineer": "Pixel",
  "design-director": "Iris",
  "product-owner": "Quill",
  "qa-engineer": "Probe",
};

/** Contract: Forge, Pixel (those present, in that order); otherwise Iris, Quill; otherwise none. */
function drawnBy(roles: readonly string[]) {
  const present = (names: string[]) =>
    names.filter((name) => roles.some((role) => NAMES[role] === name));
  const builders = present(["Forge", "Pixel"]);
  return builders.length > 0 ? builders : present(["Iris", "Quill"]);
}

function rolesOf(retro: Record<string, unknown>) {
  if (!Array.isArray(retro.agents)) return [];
  return retro.agents.flatMap((agent: unknown) =>
    isRecord(agent) && typeof agent.role === "string" ? [agent.role] : [],
  );
}

/** The list the reader takes: `wentWrong` when it is an array (even empty), else `went_wrong`. */
function itemsOf(retro: Record<string, unknown>): unknown[] {
  return Array.isArray(retro.wentWrong)
    ? retro.wentWrong
    : Array.isArray(retro.went_wrong)
      ? retro.went_wrong
      : [];
}

/** C12's rules: a string or a string `what`, backticks off, trimmed, blanks skipped, three kept. */
function wentWrongOf(retro: Record<string, unknown>) {
  return itemsOf(retro)
    .flatMap((item) => {
      const what =
        typeof item === "string"
          ? item
          : isRecord(item)
            ? item.what
            : undefined;
      return typeof what === "string" ? [what.replaceAll("`", "").trim()] : [];
    })
    .filter((text) => text !== "")
    .slice(0, 3);
}

function unshownOf(retro: Record<string, unknown>) {
  const evidence = itemsOf(retro).flatMap((item) =>
    isRecord(item) && typeof item.evidence === "string" ? [item.evidence] : [],
  );
  return [retro.outcome, retro.evidence, ...evidence].filter(
    (text): text is string => typeof text === "string",
  );
}

function checkedOf(retro: Record<string, unknown>) {
  const lens = retro.lens;
  return (
    (isRecord(lens) && isPositiveInteger(lens.runs)) ||
    typeof retro.lens_important_findings === "number"
  );
}

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

/** A folder's `merge.json` as parsed JSON, or undefined when it is missing or isn't JSON. */
export function readMergeFile(sprint: number): unknown {
  const file = join(SPRINT_DIR, String(sprint), "merge.json");
  if (!existsSync(file)) return undefined;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
}

/** The record when every field has the contract's shape; a bad record counts as none. */
function mergeOf(raw: unknown): Merge | undefined {
  if (!isRecord(raw) || !isRecord(raw.lines)) return undefined;
  const { pr, mergedAt, commit } = raw;
  const { original, total } = raw.lines;
  if (
    !isPositiveInteger(pr) ||
    typeof mergedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(mergedAt) ||
    Number.isNaN(Date.parse(mergedAt)) ||
    typeof commit !== "string" ||
    !/^[0-9a-f]{40}$/.test(commit) ||
    !isCount(original) ||
    !isCount(total) ||
    original > total
  ) {
    return undefined;
  }
  return { pr, mergedAt, commit, lines: { original, total } };
}

/** Every valid retro, oldest first. A file the build would reject is left out here. */
function readRetros(): Retro[] {
  const found: Retro[] = [];
  for (const folder of readdirSync(SPRINT_DIR)) {
    const file = join(SPRINT_DIR, folder, "retro.json");
    if (!/^\d+$/.test(folder) || !existsSync(file)) continue;
    let retro: unknown;
    try {
      retro = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    if (!isRecord(retro)) continue;
    const { sprint, goal, outcome, size, pr } = retro;
    if (
      !isPositiveInteger(sprint) ||
      sprint !== Number(folder) ||
      typeof goal !== "string" ||
      presentGoal(goal) === ""
    ) {
      continue;
    }
    const roles = rolesOf(retro);
    found.push({
      sprint,
      goal: presentGoal(goal),
      size: size === "S" || size === "M" || size === "L" ? size : undefined,
      pr: isPositiveInteger(pr) ? pr : undefined,
      ownersCall:
        typeof outcome === "string" && /\bneeds-owner\b/i.test(outcome),
      drawn: drawnBy(roles),
      checked: checkedOf(retro),
      tested: roles.includes("qa-engineer"),
      wentWrong: wentWrongOf(retro),
      unshown: unshownOf(retro),
      merge: mergeOf(readMergeFile(sprint)),
    });
  }
  return found.sort((a, b) => a.sprint - b.sprint);
}

/** The merged sprints: the valid retros, in ascending sprint number. */
export const MERGED = readRetros();

/** Every plank id "k.j": lift k from the deck (0) to the keel (6), BUTTS[k].length + 1 planks. */
export const PLANK_IDS = BUTTS.flatMap((butts, k) =>
  Array.from({ length: butts.length + 1 }, (_, j) => `${k}.${j}`),
);

/** The shipwright's order, copied from .crew/sprint/17/render/hull.mjs line 117. */
export const ORDER =
  "5.1 3.2 1.1 6.0 4.2 0.1 2.0 3.0 5.2 1.3 4.0 0.2 6.1 2.1 1.2 3.1 4.1 2.2 5.0 3.3 0.0 1.0".split(
    " ",
  );

/** Each plank's label: the last sprint to seat it, or undefined for an original plank. */
export const SEATED: Record<string, number | undefined> = (() => {
  const seats: Record<string, number | undefined> = Object.fromEntries(
    PLANK_IDS.map((id) => [id, undefined]),
  );
  for (const [i, retro] of MERGED.entries()) {
    const id = ORDER[i % ORDER.length];
    if (id) seats[id] = retro.sprint;
  }
  return seats;
})();

export const REPLACED = Math.min(MERGED.length, PLANK_IDS.length);
export const ORIGINAL = PLANK_IDS.length - REPLACED;

const NONE = "—";

/** A revision's six cells, as the revision block on / and the Log's table give them. */
export function cellsOf(retro: Retro) {
  return {
    rev: String(retro.sprint),
    description: retro.goal,
    drawn: retro.drawn.length > 0 ? retro.drawn.join(", ") : NONE,
    checked: retro.checked ? "Lens" : NONE,
    tested: retro.tested ? "Probe" : NONE,
    approved: retro.ownersCall ? "Owner" : "Gate",
  };
}

/** The revision block's rows: the 5 newest valid retros, newest first, as their six cells. */
export const ROWS = [...MERGED].reverse().slice(0, 5).map(cellsOf);

// ---------------------------------------------------------------------------------------------
// The Log (.crew/sprint/29/b5-first-contract.md, "Data rules")

/** The seat the i-th merged sprint (i from 0) takes: ORDER[i mod 22]. */
export const SEAT_OF: ReadonlyMap<number, string> = new Map(
  MERGED.map((retro, i) => [retro.sprint, ORDER[i % ORDER.length] ?? ""]),
);

/** Each seat's holders: the merged sprints that seated it, ascending. */
const HOLDERS: Readonly<Record<string, readonly number[]>> = Object.fromEntries(
  PLANK_IDS.map((id) => [
    id,
    MERGED.filter((retro) => SEAT_OF.get(retro.sprint) === id).map(
      (retro) => retro.sprint,
    ),
  ]),
);

/** The ghost hull: each seat with a holder, numbered by its first; a seat with none is a gap. */
export const GHOST: Readonly<Record<string, number>> = Object.fromEntries(
  PLANK_IDS.flatMap((id) => {
    const first = HOLDERS[id]?.[0];
    return first === undefined ? [] : [[id, first]];
  }),
);

/** The number of seats in each lift, deck (0) to keel (6). */
export const SEATS_PER_LIFT = BUTTS.map((butts) => butts.length + 1);

/** The plank's words for sprint n (the contract's "The plank's words"). */
export function plankWords(n: number) {
  const seat = SEAT_OF.get(n) ?? "";
  const [k = Number.NaN, j = Number.NaN] = seat.split(".").map(Number);
  const holders = HOLDERS[seat] ?? [];
  const at = holders.indexOf(n);
  const words = [
    `Lift ${k + 1} of 7 from the deck, plank ${j + 1} of ${SEATS_PER_LIFT[k]} from the stern.`,
    at === 0
      ? "It replaced an original plank, now in the ghost hull."
      : `It replaced sprint ${holders[at - 1]}'s plank. The original is in the ghost hull, numbered ${holders[0]}.`,
  ];
  const next = holders[at + 1];
  if (next !== undefined) words.push(`Sprint ${next} has since replaced it.`);
  return words.join(" ");
}

/** The merged sprints before and after n, by merged order; undefined at either end. */
export function neighbours(n: number) {
  const at = MERGED.findIndex((retro) => retro.sprint === n);
  return {
    previous: at > 0 ? MERGED[at - 1]?.sprint : undefined,
    next: at >= 0 ? MERGED[at + 1]?.sprint : undefined,
  };
}

const SIZE_WORDS = { S: "Small", M: "Medium", L: "Large" } as const;

/** The repository the pull requests live in: a fixed fact of the crew, not the owner's. */
export const REPO = "https://github.com/nycruslan/theseus-portfolio";

/** A record's `dl`, as [dt, dd] pairs in the contract's order. */
export function recordPairs(retro: Retro): [string, string][] {
  const cells = cellsOf(retro);
  return [
    ["Drawn", cells.drawn],
    ["Checked", cells.checked],
    ["Tested", cells.tested],
    ["Approved", cells.approved],
    ...(retro.size
      ? [["Size", SIZE_WORDS[retro.size]] as [string, string]]
      : []),
    ...(retro.merge
      ? [["Date", recordDate(retro.merge.mergedAt)] as [string, string]]
      : []),
    ...(retro.pr
      ? [["Pull request", `Pull request #${retro.pr}`] as [string, string]]
      : []),
    ["Plank", plankWords(retro.sprint)],
  ];
}

const K = MERGED.length;
const SEATS = PLANK_IDS.length;

/** The ghost hull's caption. */
export const GHOST_CAPTION =
  "The ghost hull: the original planks the crew has taken out, each numbered by the sprint that replaced it.";

/** The count line under it. */
export const GHOST_COUNT =
  K >= SEATS
    ? `All ${SEATS} original planks are out: the last went with sprint ${MERGED[SEATS - 1]?.sprint}.${K > SEATS ? ` Since then the crew has replaced ${K - SEATS} planks of its own.` : ""}`
    : `${K} of ${SEATS} original planks are out. The gaps are the ${SEATS - K} still sailing.`;

/** Every revision's lede. Iris may reword the first sentence (sprint 30, decision 4): it is this line. */
export const LEDE = `A crew of AI agents rebuilds this site one sprint at a time. ${K} revisions, newest first: choose one to open its record.`;

/** The bio split after each ". ", as the contract splits it. */
export function bioParts(bio: string) {
  return bio
    .split(/(?<=\.) /)
    .map((part) => part.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------------------------
// The dates and the lines (.crew/sprint/32/contract.md, "What the page shows"). Each wording is
// one rule below, so a reword is one line.

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const WEEKDAYS = "Sun Mon Tue Wed Thu Fri Sat".split(" ");
const pad = (n: number) => String(n).padStart(2, "0");

/** The newest record: the one merged last, by `mergedAt` (decision 11), not the highest sprint. */
const NEWEST_DATED = MERGED.filter((retro) => retro.merge).reduce<
  Retro | undefined
>(
  (newest, retro) =>
    !newest ||
    Date.parse(retro.merge?.mergedAt ?? "") >
      Date.parse(newest.merge?.mergedAt ?? "")
      ? retro
      : newest,
  undefined,
);
export const NEWEST_MERGE = NEWEST_DATED?.merge;
/** The sprint whose record is the newest. */
export const NEWEST_DATED_SPRINT = NEWEST_DATED?.sprint;
const NEWEST_YEAR = NEWEST_MERGE
  ? new Date(NEWEST_MERGE.mergedAt).getUTCFullYear()
  : Number.NaN;

/** The merge's UTC day, "2026-10-24": what a day group is keyed on. */
export const dayKey = (mergedAt: string) => mergedAt.slice(0, 10);

/** The Date cell's words for a UTC instant: "24 Oct", with " 2025" when it isn't the newest record's year. */
export function dateWords(mergedAt: string, year = NEWEST_YEAR) {
  const d = new Date(mergedAt);
  const words = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return d.getUTCFullYear() === year ? words : `${words} ${d.getUTCFullYear()}`;
}

/** A row's Date cell: its record's day, or empty (never "—") when it has none. */
export const dateCell = (retro: Retro) =>
  retro.merge ? dateWords(retro.merge.mergedAt) : "";

/** A day group's header: "Sat 24 Oct · 4 revisions", "1 revision" in the singular. */
export function groupHeader(
  mergedAt: string,
  count: number,
  year = NEWEST_YEAR,
) {
  const weekday = WEEKDAYS[new Date(mergedAt).getUTCDay()];
  return `${weekday} ${dateWords(mergedAt, year)} · ${count} ${count === 1 ? "revision" : "revisions"}`;
}

/** The header of a run of rows without a record. */
export const UNDATED = "Undated";

export type Group = { header: string; day?: string; sprints: number[] };

/**
 * The table's groups, top to bottom (decision 11): the rows in table order (sprint number,
 * descending), cut into runs wherever a row's UTC day, or whether it has a record, differs from
 * the row above's. Each run is one group, its header counting the run's rows.
 */
export const GROUPS: Group[] = (() => {
  const runKey = (retro: Retro) =>
    retro.merge ? dayKey(retro.merge.mergedAt) : UNDATED;
  const runs: Retro[][] = [];
  for (const retro of [...MERGED].reverse()) {
    const run = runs.at(-1);
    const above = run?.at(-1);
    if (run && above && runKey(above) === runKey(retro)) run.push(retro);
    else runs.push([retro]);
  }
  return runs.map((run) => {
    const merge = run[0]?.merge;
    return merge
      ? {
          header: groupHeader(merge.mergedAt, run.length),
          day: dateWords(merge.mergedAt),
          sprints: run.map((retro) => retro.sprint),
        }
      : { header: UNDATED, sprints: run.map((retro) => retro.sprint) };
  });
})();

/** The record's Date pair: "24 Oct 2026, 03:36 UTC", the year always. */
export function recordDate(mergedAt: string) {
  const d = new Date(mergedAt);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

/** The lines figure's line in the Log's header, from a record. */
export function linesLine(merge: Pick<Merge, "commit" | "lines">) {
  const { original, total } = merge.lines;
  const percent = (Math.round((original * 1000) / total) / 10).toFixed(1);
  const n = (value: number) => value.toLocaleString("en-US");
  return `${n(original)} of ${n(total)} lines of the site's code are still original: ${percent}%, by git blame on app, components and lib at ${merge.commit.slice(0, 7)}.`;
}

/** The words that find the line on the page, wherever its numbers fall. */
export const LINES_PHRASE = "lines of the site's code are still original";

/** The Log's lines line, from the newest record; undefined when no sprint has one (the line is absent). */
export const LINES = NEWEST_MERGE ? linesLine(NEWEST_MERGE) : undefined;
