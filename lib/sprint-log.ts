import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// The build log's data: one entry per `.crew/sprint/<n>/retro.json`, read when the site is built.
// Only node:fs and node:path, by node: specifiers, so a test can call it on a folder of fixtures.
// Only `readdirSync` carries `turbopackIgnore`: the folder is a run-time argument, and without it
// the bundler traces the whole project into the server output. The build doesn't warn on
// `readFileSync`. The page is static, so nothing reads at request time.
// The rules (what throws, what is tolerated) are in .crew/sprint/12/contract.md, "The data rules".

export interface SprintEntry {
  /** The retro's `sprint`: a positive integer equal to its folder's number. */
  sprint: number;
  /**
   * The goal as the page shows it: process prefix, backticks and a trailing size tag removed, first
   * letter capitalised. The size has its own field.
   */
  goal: string;
  size?: "S" | "M" | "L";
  /** A positive integer: the pull request's number. */
  pr?: number;
  /** The team handed this sprint to the owner to decide (`needs-owner` in the retro's `outcome`). */
  ownersCall: boolean;
  /** The first three things that went wrong, as the team wrote them. Never evidence. */
  wentWrong: string[];
  /**
   * Who drew the revision, by the crew's names: the builders (Forge, Pixel) when either took part,
   * otherwise the designers (Iris, Quill); none when neither did. Always in that order.
   */
  drawn: string[];
  /** Lens reviewed it. */
  checked: boolean;
  /** Probe tested it. */
  tested: boolean;
}

const MAX_WENT_WRONG = 3;
const SIZES = ["S", "M", "L"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

// Backticks mean code in the retro and there is no code font on the page.
function withoutBackticks(text: string): string {
  return text.replaceAll("`", "");
}

// "Roadmap item 4:" names the process, not the goal. A final "(L)" repeats the size the entry already
// shows; any other parenthetical, such as "(L, contract step)", says more and stays.
function presentGoal(goal: string): string {
  const text = withoutBackticks(
    goal.replace(/^\s*roadmap item(\s+\d+)?\s*:\s*/i, ""),
  )
    .trim()
    .replace(/\s*\(\s*[SML]\s*\)$/i, "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function wentWrongOf(retro: Record<string, unknown>): string[] {
  // `wentWrong` is the current shape, `went_wrong` the one sprints 1 to 4 used. An array wins even
  // when empty, so a retro never mixes the two.
  const raw = Array.isArray(retro.wentWrong)
    ? retro.wentWrong
    : Array.isArray(retro.went_wrong)
      ? retro.went_wrong
      : [];
  const texts: string[] = [];
  for (const item of raw) {
    const what =
      typeof item === "string" ? item : isRecord(item) ? item.what : undefined;
    if (typeof what !== "string") continue;
    const text = withoutBackticks(what).trim();
    if (text !== "") texts.push(text);
  }
  return texts.slice(0, MAX_WENT_WRONG);
}

// The crew's roles (.claude/agents/) by the names the revision block shows. A Map, so a role like
// "constructor" finds nothing rather than an object's own property.
const CREW = new Map([
  ["engineer", "Forge"],
  ["creative-engineer", "Pixel"],
  ["design-director", "Iris"],
  ["product-owner", "Quill"],
  ["qa-engineer", "Probe"],
]);

/** The names of the roles in the retro's `agents`; anything that isn't `{ role: string }` is skipped. */
function crewOf(retro: Record<string, unknown>): string[] {
  if (!Array.isArray(retro.agents)) return [];
  return retro.agents.flatMap((agent: unknown) => {
    const name =
      isRecord(agent) && typeof agent.role === "string"
        ? CREW.get(agent.role)
        : undefined;
    return name ? [name] : [];
  });
}

// The revision block's columns (.crew/sprint/22/contract.md, "Data rules"). A missing or malformed
// field reads as nobody, never as an error: these cells are the record's footnotes, not its facts.
function drawnBy(crew: readonly string[]): string[] {
  const present = (names: string[]) =>
    names.filter((name) => crew.includes(name));
  const builders = present(["Forge", "Pixel"]);
  return builders.length > 0 ? builders : present(["Iris", "Quill"]);
}

// `lens.runs` is the current shape; sprints 1 to 4 recorded `lens_important_findings` instead.
function checkedByLens(retro: Record<string, unknown>): boolean {
  const { lens } = retro;
  return (
    (isRecord(lens) && isPositiveInteger(lens.runs)) ||
    typeof retro.lens_important_findings === "number"
  );
}

function parseRetro(file: string, folder: string): SprintEntry | undefined {
  let source: string;
  try {
    source = readFileSync(file, "utf8");
  } catch (error) {
    // A folder without a retro is a sprint in progress.
    if (isRecord(error) && error.code === "ENOENT") return undefined;
    throw error;
  }

  let retro: unknown;
  try {
    retro = JSON.parse(source);
  } catch (error) {
    throw new Error(`${file}: not valid JSON (${(error as Error).message})`);
  }
  if (!isRecord(retro)) throw new Error(`${file}: expected a JSON object`);

  const { sprint, goal } = retro;
  if (!isPositiveInteger(sprint)) {
    throw new Error(`${file}: "sprint" must be a positive integer`);
  }
  if (sprint !== Number(folder)) {
    throw new Error(
      `${file}: "sprint" is ${sprint} but the folder is ${folder}`,
    );
  }
  if (typeof goal !== "string" || presentGoal(goal) === "") {
    throw new Error(`${file}: "goal" must be a non-blank string`);
  }

  const { size, pr, outcome } = retro;
  const crew = crewOf(retro);
  return {
    sprint,
    goal: presentGoal(goal),
    size: SIZES.find((candidate) => candidate === size),
    pr: isPositiveInteger(pr) ? pr : undefined,
    ownersCall: typeof outcome === "string" && /\bneeds-owner\b/i.test(outcome),
    wentWrong: wentWrongOf(retro),
    drawn: drawnBy(crew),
    checked: checkedByLens(retro),
    tested: crew.includes("Probe"),
  };
}

/**
 * Every `<dir>/<n>/retro.json`, newest sprint first. A retro that is wrong throws, naming its file,
 * so the build fails instead of the public log quietly shrinking.
 */
export function readSprintLog(
  dir: string = join(process.cwd(), ".crew", "sprint"),
): SprintEntry[] {
  const files = new Map<number, string>();
  const entries: SprintEntry[] = [];
  for (const folder of readdirSync(/* turbopackIgnore: true */ dir)) {
    if (!/^\d+$/.test(folder)) continue;
    const file = join(dir, folder, "retro.json");
    const entry = parseRetro(file, folder);
    if (!entry) continue;
    const first = files.get(entry.sprint);
    if (first !== undefined) {
      throw new Error(`${file}: sprint ${entry.sprint} is also in ${first}`);
    }
    files.set(entry.sprint, file);
    entries.push(entry);
  }
  return entries.sort((a, b) => b.sprint - a.sprint);
}
