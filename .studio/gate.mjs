// PreToolUse gate on handing a sprint PR on: `merge` in the portfolio, `ready` in the Studio, given
// as the first argument (see .claude/settings.json). The builder is never the judge, so the call goes
// through only when:
// - CI passed on the PR head. With `gh pr merge --auto` it may still be running, but only while
//   GitHub holds the merge for its required checks;
// - the PR stays on the team's side: no owner paths and no weakened tests (scope.mjs);
// - nothing waits for the owner (needs-owner);
// - the reviewers the change needs said ship about the code being handed on: Lens always, Probe when
//   the e2e checks changed, Iris when visual files did, and any reviewer who weighed in. Verdicts
//   are the theseus/* statuses on the head commit (verdict.mjs posts them), with this session's
//   ledger as the fallback, and a no from either holds the merge.
// Each run is broadcast as the Studio's roll call. It fails closed: anything it can't check, or a
// command it can't be sure it read right, is a NO-GO. The statuses and the ledger are written from
// this machine, so this holds the lead to the process; branch protection on GitHub makes it binding.

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { broadcast } from "./post.mjs";
import { changedFiles, scopeNotes } from "./scope.mjs";
import {
  CONTEXTS,
  latestPerReviewer,
  readLedger,
  statusText,
} from "./verdict.mjs";

const REVIEWERS = {
  "code-reviewer": "Lens",
  "qa-engineer": "Probe",
  "design-director": "Iris",
};
// What makes a reviewer needed besides Lens: the e2e checks for Probe, what visitors see for Iris.
const NEEDS = {
  "qa-engineer": /^(e2e\/|playwright\.config\.)/,
  "design-director": /^(app|components|design|public)\/|\.css$/,
};
// Commits that only touch the team's notes, memory or roadmap don't make a review stale.
const PRODUCT = [
  "--",
  ".",
  ":!.studio",
  ":!.claude/agent-memory",
  ":!ROADMAP.md",
];
const PASSED = new Set(["SUCCESS", "NEUTRAL", "SKIPPED"]);
// gh merges these at once even with --auto (isImmediatelyMergeable in cli/cli
// pkg/cmd/pr/merge/merge.go), so only BLOCKED or BEHIND means GitHub will wait for the checks.
const HELD = new Set(["BLOCKED", "BEHIND"]);
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
  const files = changedFiles({
    number: pr.number,
    repo: call.repo,
    cwd: hook.cwd,
  });
  const items = [
    ...checks(pr, call),
    ...scopeNotes(files).map((note) => nogo("owner", "decision", note)),
    ...ownerHold(pr, call),
    ...verdicts(pr, files),
  ];
  rollCall = { pr: pr.number, head: pr.headRefOid, items };
} catch (error) {
  const note = `The gate couldn't check this PR (${error.message.trim()}).`;
  rollCall = { items: [nogo("gate", "check", note)] };
}
const pass = rollCall.items.every((item) => item.state === "go");
if (pass) carryForward(rollCall, call);
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
  // Moving a PR back to draft, or cancelling auto-merge, hands nothing on.
  if (args.includes("--undo") || args.includes("--disable-auto")) return null;
  let selector;
  for (let i = 0; i < args.length; i++) {
    if (VALUE_FLAGS.has(args[i])) i++;
    else if (!args[i].startsWith("-")) selector ??= args[i];
  }
  // Through `bash -c "…"`, the closing quote sticks to the PR.
  return {
    selector: selector?.replace(/^["']|["']$/g, ""),
    auto: args.includes("--auto"),
  };
}

function view({ selector, repo }) {
  const args = ["pr", "view", ...(selector ? [selector] : [])];
  const fields = "number,headRefOid,labels,statusCheckRollup,mergeStateStatus";
  args.push("--json", fields, ...(repo ? ["--repo", repo] : []));
  return JSON.parse(
    execFileSync("gh", args, { cwd: hook.cwd, encoding: "utf8" }),
  );
}

// CI is every check but the reviewers' verdicts, which verdicts() reads.
function checks({ statusCheckRollup: rollup, mergeStateStatus }, { auto }) {
  const held = auto && HELD.has(mergeStateStatus);
  const ci = rollup.filter((check) => !isVerdict(check));
  if (!ci.length) {
    return held
      ? []
      : [
          pending(
            "CI",
            "CI hasn't reported on this PR yet: wait for its checks.",
          ),
        ];
  }
  return ci.flatMap((check) => {
    const who = check.name ?? check.context;
    const done = check.status
      ? check.status === "COMPLETED"
      : !["PENDING", "EXPECTED"].includes(check.state);
    if (!done) {
      return held
        ? []
        : [
            pending(
              who,
              `${who} is still running: wait for it${auto ? " (GitHub isn't holding this PR for its checks, so --auto would merge it now)" : ""}.`,
            ),
          ];
    }
    const result = check.conclusion ?? check.state;
    return PASSED.has(result)
      ? [{ who, kind: "check", state: "go" }]
      : [
          nogo(
            who,
            "check",
            `${who} failed (${result}): fix it on the branch.`,
          ),
        ];
  });
}

// Every gh call runs as the owner, so removing the label can't be told apart from the owner's own
// decision. Once a PR has carried needs-owner, only the owner merges it.
function ownerHold({ number, labels }, { repo }) {
  const events = execFileSync(
    "gh",
    [
      "api",
      `repos/${repo ?? "{owner}/{repo}"}/issues/${number}/events`,
      "--paginate",
      "--jq",
      '.[] | select(.event == "labeled") | .label.name',
    ],
    { cwd: hook.cwd, encoding: "utf8" },
  );
  const held = [...labels.map(({ name }) => name), ...events.split("\n")];
  return held.includes("needs-owner")
    ? [
        nogo(
          "owner",
          "decision",
          "The PR has carried needs-owner, so the owner decides and merges it.",
        ),
      ]
    : [];
}

function verdicts({ statusCheckRollup: rollup, headRefOid: head }, files) {
  const statuses = new Map(
    rollup.filter(isVerdict).map((status) => [status.context, status]),
  );
  const given = readLedger(hook.session_id).filter(
    (entry) => "verdict" in entry,
  );
  return Object.entries(REVIEWERS).flatMap(([role, who]) => {
    const status = statuses.get(CONTEXTS[role]);
    const theirs = given.filter((entry) => entry.role === role);
    const needed =
      role === "code-reviewer" ||
      files.some(({ filename }) => NEEDS[role].test(filename)) ||
      status ||
      theirs.length;
    return needed ? [verdict(role, who, status, theirs, head)] : [];
  });
}

// A review of older code no longer stands once the product changed: the final verdict after a fix
// comes from a fresh review of the code being handed on.
function verdict(role, who, status, theirs, head) {
  const current = latestPerReviewer(
    theirs.filter((entry) => covers(entry.head, head)),
  );
  const open = current.filter((entry) => entry.verdict !== "ship");
  if (status && status.state !== "SUCCESS" && status.state !== "PENDING") {
    return nogo(
      who,
      "verdict",
      `${who} said "${status.description}" on this commit: resolve it and send it back for review.`,
    );
  }
  if (open.length) {
    const said = open
      .map(
        ({ agentId, verdict }) => `${who} (agent ${agentId}) said "${verdict}"`,
      )
      .join("; ");
    return nogo(
      who,
      "verdict",
      `${said}: resolve it and send it back for review.`,
    );
  }
  if (status?.state === "SUCCESS") {
    return { who, kind: "verdict", state: "go", score: scoreIn(status) };
  }
  const ship = current.at(-1);
  if (ship) {
    // The ledger's ship covers this commit, but GitHub has no status on it yet.
    const carried = {
      context: CONTEXTS[role],
      line: ship.line,
      from: ship.head,
    };
    return { who, kind: "verdict", state: "go", score: ship.score, carried };
  }
  if (status?.state === "PENDING") {
    return pending(
      who,
      `${who} is still reviewing: wait for the verdict.`,
      "verdict",
    );
  }
  return nogo(
    who,
    "verdict",
    theirs.length
      ? `${who}: no ship on the current code; ask a fresh ${role} to review it.`
      : `${who}: no verdict on record; ask ${role} to review. If the review happened before the session restarted, leave the PR for the owner.`,
  );
}

// GitHub's required theseus/* checks need a status on the head itself. When the head only adds
// notes to the commit a reviewer passed, post that verdict on it too, so branch protection agrees
// with the gate. A failed post changes nothing here: GitHub then simply waits.
function carryForward({ head, items }, { repo }) {
  for (const { carried } of items) {
    if (!carried) continue;
    const from = carried.from.slice(0, 7);
    const line = carried.line ?? "Verdict: ship";
    spawnSync(
      "gh",
      [
        "api",
        "--method",
        "POST",
        `repos/${repo ?? "{owner}/{repo}"}/statuses/${head}`,
        "-f",
        "state=success",
        "-f",
        `context=${carried.context}`,
        "-f",
        `description=${statusText(`${line} (from ${from}; only notes changed since)`)}`,
      ],
      { cwd: hook.cwd, stdio: "ignore", timeout: 15_000 },
    );
  }
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

function isVerdict(check) {
  return Object.values(CONTEXTS).includes(check.context);
}

function scoreIn({ description = "" }) {
  const score = description.match(/(\d+(?:\.\d+)?)\s*\/\s*10\b/)?.[1];
  return score ? Number(score) : undefined;
}

function pending(who, note, kind = "check") {
  return { who, kind, state: "pending", note };
}

function nogo(who, kind, note) {
  return { who, kind, state: "nogo", note };
}
