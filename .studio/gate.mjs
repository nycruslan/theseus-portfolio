// PreToolUse gate on handing a sprint PR on: `merge` in the portfolio, `ready` in the Studio, given
// as the first argument (see .claude/settings.json). The builder is never the judge, so the call goes
// through only when every CI check on the PR head passed, nothing waits for the owner, and Lens,
// Probe and, when visual files changed, Iris said ship about the code being handed on, with none of
// them still asking for changes. Each run is broadcast as the Studio's roll call. It fails closed:
// anything it can't check, or a command it can't be sure it read right, is a NO-GO. The ledger is a
// local file, so this holds the lead to the process; it can't stop an agent that forges it through
// the shell, which only a check outside this machine could.

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { broadcast } from "./post.mjs";
import { readLedger } from "./verdict.mjs";

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
]);
// gh can be pointed at another repository, while the gate checks this checkout's PR.
const ELSEWHERE = /\s(-R|--repo)|\bGH_(REPO|HOST)\b|\b(cd|pushd)\b/;

const target = process.argv[2];
if (target !== "merge" && target !== "ready") {
  console.error(
    `gate.mjs needs "merge" or "ready" in settings.json, not ${target}.`,
  );
  process.exit(2);
}
const hook = JSON.parse(readFileSync(0, "utf8"));
const call = prCall(hook);
// The settings' `if` filter is best-effort, so this may be some other command.
if (!call) process.exit(0);

let rollCall;
try {
  if (call.refusal) throw new Error(call.refusal);
  const pr = view(call);
  const items = [...checks(pr), ...ownerHold(pr), ...verdicts(pr)];
  rollCall = { pr: pr.number, head: pr.headRefOid, items };
} catch (error) {
  const note = `The gate couldn't check this PR (${error.message.trim()}).`;
  rollCall = { items: [nogo("gate", "check", note)] };
}
const pass = rollCall.items.every((item) => item.state === "go");
broadcast({
  ...hook,
  hook_event_name: "StudioGateChecked",
  gate: { target, ...rollCall, pass },
});
if (!pass) {
  const notes = rollCall.items.filter((item) => item.state !== "go");
  console.error(
    [
      `NO-GO for ${rollCall.pr ? `PR #${rollCall.pr}` : "this PR"}:`,
      ...notes.map((item) => `- ${item.note}`),
    ].join("\n"),
  );
  process.exit(2);
}

function prCall({ tool_name: tool, tool_input: input = {} }) {
  if (tool.startsWith("mcp__")) {
    return {
      selector: String(input.pullNumber),
      repo: `${input.owner}/${input.repo}`,
    };
  }
  const command = String(input.command ?? "");
  const calls = [
    ...command.matchAll(
      new RegExp(`\\bgh\\s+pr\\s+${target}\\b([^;&|\\n]*)`, "g"),
    ),
  ];
  if (!calls.length) return null;
  if (calls.length > 1 || ELSEWHERE.test(command)) {
    return {
      refusal: `run one \`gh pr ${target}\` per command, from this checkout, without -R, --repo, GH_REPO or cd`,
    };
  }
  const args = calls[0][1].match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  if (args.includes("--undo")) return null;
  let selector;
  for (let i = 0; i < args.length; i++) {
    if (VALUE_FLAGS.has(args[i])) i++;
    else if (!args[i].startsWith("-")) selector ??= args[i];
  }
  // Through `bash -c "…"`, the closing quote sticks to the PR.
  return { selector: selector?.replace(/^["']|["']$/g, "") };
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

  const given = readLedger(hook.session_id).filter(
    (entry) => "verdict" in entry,
  );
  return roles.map((role) => {
    const who = REVIEWERS[role];
    // Each reviewer's latest verdict stands, so one still asking for changes holds the merge even
    // when another reviewer in the same role said ship.
    const latest = [
      ...new Map(
        given
          .filter((entry) => entry.role === role)
          .map((entry) => [entry.agentId, entry]),
      ).values(),
    ];
    if (!latest.length) {
      return nogo(
        who,
        "verdict",
        `${who}: no verdict on record in this session; ask ${role} to review. If the review happened before the session restarted, leave the PR for the owner.`,
      );
    }
    const open = latest.filter((entry) => entry.verdict !== "ship");
    if (open.length) {
      const said = open
        .map(
          ({ agentId, verdict }) =>
            `${who} (agent ${agentId}) said "${verdict}"`,
        )
        .join("; ");
      return nogo(
        who,
        "verdict",
        `${said}: resolve it and send the change back to the same reviewer for re-review.`,
      );
    }
    const fresh = latest.find((entry) => covers(entry.head, headRefOid));
    if (!fresh) {
      return nogo(
        who,
        "verdict",
        `${who}: no ship on the current code; send the change back to ${who} for re-review.`,
      );
    }
    return { who, kind: "verdict", state: "go", score: fresh.score };
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
