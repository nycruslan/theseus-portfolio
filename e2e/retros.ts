import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BUTTS } from "../lib/half-model";

// The oracle for the sheet (.crew/sprint/22/contract.md, "Data rules"), implemented from the
// contract's words with this file's own lines, never by importing the page's reader. Every expected
// value comes from the retro files in the checkout under test, so the checks stay true as sprints
// are added and a preview that carries its own sprint's retro passes like production.

const SPRINT_DIR = join(process.cwd(), ".crew", "sprint");

export type Retro = {
  sprint: number;
  /** The goal as /sprints shows it (presentGoal). */
  goal: string;
  ownersCall: boolean;
  /** The five cells after Rev and Description, as the contract's rules give them. */
  drawn: string[];
  checked: boolean;
  tested: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

/** As /sprints presents a goal: prefix, backticks and a trailing size tag off, first letter up. */
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

function checkedOf(retro: Record<string, unknown>) {
  const lens = retro.lens;
  return (
    (isRecord(lens) && isPositiveInteger(lens.runs)) ||
    typeof retro.lens_important_findings === "number"
  );
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
    const { sprint, goal, outcome } = retro;
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
      ownersCall:
        typeof outcome === "string" && /\bneeds-owner\b/i.test(outcome),
      drawn: drawnBy(roles),
      checked: checkedOf(retro),
      tested: roles.includes("qa-engineer"),
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
const ORDER =
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

/** The revision block's rows: the 5 newest valid retros, newest first, as their six cells. */
export const ROWS = [...MERGED]
  .reverse()
  .slice(0, 5)
  .map((retro) => ({
    rev: String(retro.sprint),
    description: retro.goal,
    drawn: retro.drawn.length > 0 ? retro.drawn.join(", ") : NONE,
    checked: retro.checked ? "Lens" : NONE,
    tested: retro.tested ? "Probe" : NONE,
    approved: retro.ownersCall ? "Owner" : "Gate",
  }));

/** The bio split after each ". ", as the contract splits it. */
export function bioParts(bio: string) {
  return bio
    .split(/(?<=\.) /)
    .map((part) => part.trim())
    .filter(Boolean);
}
