// PreToolUse gate on handing a sprint PR on: `merge` in the portfolio, `ready` in the Studio, given
// as the first argument (see .claude/settings.json). The builder is never the judge, so the call goes
// through only when every CI check on the PR head passed, nothing waits for the owner, and Lens,
// Probe and, when visual files changed, Iris said ship about the code being handed on. Each run is
// broadcast as the Studio's roll call. It fails closed: anything it can't check is a NO-GO.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { broadcast } from "./post.mjs";
import { ledgerPath } from "./verdict.mjs";

const REVIEWERS = {
  "code-reviewer": "Lens",
  "qa-engineer": "Probe",
  "design-director": "Iris",
};
const VISUAL = /^(app|components|design|public)\/|\.css$/;
// gh lists at most 100 files, so a longer list may hide a visual change.
const MAX_FILES = 100;
// Commits that only touch the team's notes, memory or roadmap don't make a review stale.
const PRODUCT = [
  "--",
  ".",
  ":!.studio",
  ":!.claude/agent-memory",
  ":!ROADMAP.md",
];
const PASSED = new Set(["SUCCESS", "NEUTRAL", "SKIPPED"]);
// gh pr merge and gh pr ready options that take a value, so it isn't read as the PR.
const VALUE_FLAGS = new Set([
  "-t",
  "--subject",
  "-b",
  "--body",
  "-F",
  "--body-file",
  "-A",
  "--author-email",
  "--match-head-commit",
  "-R",
  "--repo",
]);

const target = process.argv[2];
const hook = JSON.parse(readFileSync(0, "utf8"));
const call = prCall(hook);
// The settings' `if` filter is best-effort, so this may be some other command.
if (!call) process.exit(0);

try {
  const pr = view(call);
  const items = [...checks(pr), ...ownerHold(pr), ...verdicts(pr)];
  const pass = items.every((item) => item.state === "go");
  broadcast({
    ...hook,
    hook_event_name: "StudioGateChecked",
    gate: { target, pr: pr.number, head: pr.headRefOid, items, pass },
  });
  if (!pass) {
    const notes = items.filter((item) => item.state !== "go");
    refuse([
      `NO-GO for PR #${pr.number}:`,
      ...notes.map((item) => `- ${item.note}`),
    ]);
  }
} catch (error) {
  refuse([`NO-GO: the gate couldn't check this PR (${error.message}).`]);
}

function prCall({ tool_name: tool, tool_input: input = {} }) {
  if (tool.startsWith("mcp__")) {
    return {
      selector: String(input.pullNumber),
      repo: `${input.owner}/${input.repo}`,
    };
  }
  const command = String(input.command ?? "");
  const match = command.match(
    new RegExp(`\\bgh\\s+pr\\s+${target}\\b([^;&|\\n]*)`),
  );
  const args = match?.[1].match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  if (!match || args.includes("--undo")) return null;
  let selector;
  for (let i = 0; i < args.length; i++) {
    if (VALUE_FLAGS.has(args[i])) i++;
    else if (!args[i].startsWith("-")) selector ??= args[i];
  }
  return { selector };
}

function view({ selector, repo }) {
  const args = ["pr", "view", ...(selector ? [selector] : [])];
  const fields = "number,headRefOid,files,labels,statusCheckRollup";
  args.push("--json", fields, ...(repo ? ["--repo", repo] : []));
  return JSON.parse(
    execFileSync("gh", args, { cwd: hook.cwd, encoding: "utf8" }),
  );
}

function checks({ statusCheckRollup: rollup }) {
  if (!rollup.length) {
    return [
      pending("CI", "CI hasn't reported on this PR yet: wait for its checks."),
    ];
  }
  return rollup.map((check) => {
    const who = check.name ?? check.context;
    const done = check.status
      ? check.status === "COMPLETED"
      : !["PENDING", "EXPECTED"].includes(check.state);
    if (!done) {
      return pending(who, `${who} is still running: wait for it.`);
    }
    const result = check.conclusion ?? check.state;
    return PASSED.has(result)
      ? { who, kind: "check", state: "go" }
      : nogo(who, "check", `${who} failed (${result}): fix it on the branch.`);
  });
}

function ownerHold({ labels }) {
  return labels.some(({ name }) => name === "needs-owner")
    ? [
        nogo(
          "owner",
          "decision",
          "The PR is labelled needs-owner: it waits for the owner's decision.",
        ),
      ]
    : [];
}

function verdicts({ files, headRefOid }) {
  const roles = ["code-reviewer", "qa-engineer"];
  const visual = files.some(({ path }) => VISUAL.test(path));
  if (visual || files.length >= MAX_FILES) roles.push("design-director");

  const ledger = ledgerPath(hook.session_id);
  const entries = existsSync(ledger)
    ? readFileSync(ledger, "utf8").trim().split("\n").map(JSON.parse)
    : [];
  return roles.map((role) => {
    const who = REVIEWERS[role];
    const entry = entries.findLast((candidate) => candidate.role === role);
    if (!entry) {
      return nogo(
        who,
        "verdict",
        `${who}: no verdict on record in this session; ask ${role} to review. If the review happened before the session restarted, leave the PR for the owner.`,
      );
    }
    if (entry.verdict !== "ship") {
      return nogo(
        who,
        "verdict",
        `${who} said "${entry.verdict}": resolve it and send the change back to ${who} for re-review.`,
      );
    }
    if (!covers(entry.head, headRefOid)) {
      return nogo(
        who,
        "verdict",
        `${who}: no ship on the current code; send the change back to ${who} for re-review.`,
      );
    }
    return { who, kind: "verdict", state: "go", score: entry.score };
  });
}

// A verdict covers the head when no product file changed since the reviewed commit.
function covers(reviewed, head) {
  if (!reviewed) return false;
  const diff = spawnSync(
    "git",
    ["diff", "--quiet", reviewed, head, ...PRODUCT],
    {
      cwd: hook.cwd,
    },
  );
  return diff.status === 0;
}

function pending(who, note) {
  return { who, kind: "check", state: "pending", note };
}

function nogo(who, kind, note) {
  return { who, kind, state: "nogo", note };
}

function refuse(lines) {
  console.error(lines.join("\n"));
  process.exit(2);
}
