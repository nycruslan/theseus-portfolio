// `node .crew/sprint/32/merge-record.mjs`, from the repository root: writes the merge record of
// every merged sprint that has none, `.crew/sprint/<n>/merge.json` (.crew/sprint/32/contract.md,
// "The merge record"):
//
//   { "pr": 74, "mergedAt": "2026-10-24T03:36:27Z", "commit": "<40 hex>",
//     "lines": { "original": 64, "total": 5288 } }
//
// A merged sprint is a valid retro on origin/main with a `pr`. Its merge is the one commit on
// origin/main's first-parent line whose subject ends in "(#<pr>)": keyed on the retro's `pr`, never
// the subject's sprint, since sprint 14 has #43 and its close-out notes, #44. GitHub stamps a
// squash merge's committer date with the merge time, so that date, in UTC with a "Z", is
// `mergedAt`. With no such commit, or more than one, it writes nothing for that sprint and says so.
// It never rewrites a record (it skips one that exists and creates each file exclusively), so a
// second run writes nothing.
// Only Node's built-ins and git; it deepens a shallow clone first, since blame needs the whole
// history. Nothing reads git when the site is built: the page reads these files (decision 4).
//
// The lines figure at a commit (decision 8): every file `git ls-tree -r` lists under app/,
// components/ and lib/ at that commit, and every line `git blame <commit> -- <file>` prints for it,
// plain (no -w, -M or -C), is one of `total`. A line is `original` when blame gives it a commit whose
// committer time is strictly before sprint 1's merge (46ed7ee, 2026-10-13T23:10:36Z): the code the
// crew found. Sprint 1's own lines are the first plank it replaced. Checked against Quill's
// measurements (.crew/sprint/29/b5-plan.md, "The lines") before anything is written, and refused if
// either differs: 70 of 2,027 at e6551d3 and 64 of 5,288 at 0fcb84f. "At or before" gives 114 and
// 90; the author time gives the same figures as the committer time on this history.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "origin/main";
const SPRINT_DIR = ".crew/sprint";
const DIRS = ["app", "components", "lib"];
const SPRINT_1 = "46ed7eea68d1d3bb59175128fa1583e6a8f67bda";
const CALIBRATION = [
  { commit: "e6551d3c3844a880b00c5bccff805bb0bca56b90", original: 70, total: 2027 },
  { commit: "0fcb84fd20d3c50a0dce53746ae03ac115b17e88", original: 64, total: 5288 },
];

const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 1 << 28,
    stdio: ["ignore", "pipe", "pipe"],
  });

const thousands = (n) => n.toLocaleString("en-US");
const short = (hash) => hash.slice(0, 7);

function fail(message) {
  console.error(`merge-record: ${message}`);
  process.exit(1);
}

/** `original` and `total` at a commit, by the rule in the header. */
function linesAt(commit, cut) {
  const listing = git("ls-tree", "-r", "-z", commit, "--", ...DIRS);
  const files = listing
    .split("\0")
    .filter(Boolean)
    .flatMap((entry) => {
      const [meta, path] = entry.split("\t");
      return meta.split(" ")[1] === "blob" ? [path] : [];
    });
  let original = 0;
  let total = 0;
  for (const file of files) {
    // --line-porcelain repeats each line's commit headers, so every line carries its own time.
    let time = 0;
    for (const line of git("blame", "--line-porcelain", commit, "--", file).split("\n")) {
      if (line.startsWith("committer-time ")) time = Number(line.slice(15));
      else if (line.startsWith("\t")) {
        total += 1;
        if (time < cut) original += 1;
      }
    }
  }
  return { original, total };
}

/** A retro the site's reader accepts, with the pull request it merged by. */
function mergedSprintOf(folder) {
  let retro;
  try {
    retro = JSON.parse(git("show", `${BASE}:${SPRINT_DIR}/${folder}/retro.json`));
  } catch {
    // No retro on main (a sprint in progress), or one the build would reject.
    return undefined;
  }
  if (typeof retro !== "object" || retro === null || Array.isArray(retro)) return undefined;
  const { sprint, goal, pr } = retro;
  const positive = (n) => typeof n === "number" && Number.isInteger(n) && n > 0;
  if (!positive(sprint) || sprint !== Number(folder)) return undefined;
  if (typeof goal !== "string" || goal.trim() === "") return undefined;
  return positive(pr) ? { sprint, pr } : undefined;
}

const root = realpathSync(git("rev-parse", "--show-toplevel").trim());
if (realpathSync(process.cwd()) !== root) {
  fail(`run it from the repository root, ${root}`);
}

if (git("rev-parse", "--is-shallow-repository").trim() === "true") {
  console.log("merge-record: the clone is shallow; fetching origin main's whole history");
  // The refspec names origin/main, which a single-branch clone's default refspec wouldn't update.
  execFileSync(
    "git",
    ["fetch", "--unshallow", "origin", "+refs/heads/main:refs/remotes/origin/main"],
    { stdio: "inherit" },
  );
}

const cut = Number(git("log", "-1", "--format=%ct", SPRINT_1).trim());
for (const { commit, original, total } of CALIBRATION) {
  const got = linesAt(commit, cut);
  const line = `${thousands(got.original)} of ${thousands(got.total)} at ${short(commit)}`;
  if (got.original !== original || got.total !== total) {
    fail(`calibration: ${line}, expected ${thousands(original)} of ${thousands(total)}`);
  }
  console.log(`merge-record: calibration ${line}, as measured in .crew/sprint/29/b5-plan.md`);
}

// Main's own line, oldest last: hash, committer time (seconds) and subject per commit.
const commits = git("log", "--first-parent", "--format=%H%x00%ct%x00%s", BASE)
  .split("\n")
  .filter(Boolean)
  .map((row) => {
    const [hash, time, subject] = row.split("\0");
    return { hash, time: Number(time), subject };
  });

const folders = git("ls-tree", "--name-only", `${BASE}:${SPRINT_DIR}`)
  .split("\n")
  .filter((name) => /^[1-9]\d*$/.test(name))
  .sort((a, b) => Number(a) - Number(b));

let written = 0;
let kept = 0;
for (const folder of folders) {
  const merged = mergedSprintOf(folder);
  if (!merged) continue;
  const { sprint, pr } = merged;
  const file = join(root, SPRINT_DIR, folder, "merge.json");
  if (existsSync(file)) {
    kept += 1;
    continue;
  }

  const matches = commits.filter(({ subject }) => subject.trimEnd().endsWith(`(#${pr})`));
  if (matches.length !== 1) {
    const found = matches.map(({ hash }) => short(hash)).join(", ");
    console.log(
      matches.length === 0
        ? `merge-record: sprint ${sprint}: no commit on ${BASE} ends in "(#${pr})"; nothing written`
        : `merge-record: sprint ${sprint}: ${matches.length} commits on ${BASE} end in "(#${pr})" (${found}); nothing written`,
    );
    continue;
  }
  const [{ hash, time }] = matches;
  const record = {
    pr,
    mergedAt: new Date(time * 1000).toISOString().replace(/\.\d{3}Z$/, "Z"),
    commit: hash,
    lines: linesAt(hash, cut),
  };

  mkdirSync(join(root, SPRINT_DIR, folder), { recursive: true });
  // "wx" creates the file or throws if it appeared meanwhile: a record is never rewritten.
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
  written += 1;
  const { original, total } = record.lines;
  console.log(
    `merge-record: sprint ${sprint}: wrote ${SPRINT_DIR}/${folder}/merge.json (#${pr}, ${record.mergedAt}, ${short(hash)}, ${thousands(original)} of ${thousands(total)} lines original)`,
  );
}
console.log(`merge-record: ${written} written, ${kept} already recorded and left as they are`);
