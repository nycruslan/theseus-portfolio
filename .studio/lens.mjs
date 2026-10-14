// The steps around Lens's review in CI (.github/workflows/lens.yml):
// - `node .studio/lens.mjs plan` decides what this run does. It fails at once on a fork's PR (no
//   secrets reach it) or one without the `review` label. When the label was just added it reviews.
//   Otherwise (a push, another label) it reuses Lens's ship from the head, or from an earlier
//   commit when only notes changed since, so a close-out commit or a needs-owner label doesn't
//   buy a second review. Anything else is reviewed again.
// - `node .studio/lens.mjs verdict` reads the review's structured output (claude-code-action's
//   `--json-schema`), posts it on the PR as one comment, and fails the job unless it says ship.
// Every path that isn't a clean ship fails the job, so the required `lens` check fails closed.

import { appendFileSync, readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { api, list } from "./github.mjs";

export const REVIEW_LABEL = "review";
// The team's notes: changing them doesn't make a review stale.
const NOTES =
  /^(\.studio\/sprint\/|\.studio\/STATE\.md$|\.claude\/agent-memory\/|ROADMAP\.md$)/;
const VERDICTS = ["ship", "changes", "blocked"];
const SEVERITIES = ["important", "nit", "pre-existing"];

/** What the review returns, validated by claude-code-action before the verdict step reads it. */
export const SCHEMA = {
  type: "object",
  properties: {
    verdict: { enum: VERDICTS },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { enum: SEVERITIES },
          file: { type: "string" },
          line: { type: "integer" },
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["severity", "title", "detail"],
      },
    },
  },
  required: ["verdict", "summary", "findings"],
};

/** The first decision, from the event alone: "fail", "review", or "reuse?" (look for a ship). */
export function plan(event) {
  const pr = event.pull_request;
  if (pr.head.repo?.full_name !== event.repository.full_name) {
    return {
      action: "fail",
      reason:
        "Lens reviews branches of this repository only: a fork's PR gets no secrets.",
    };
  }
  if (!pr.labels.some(({ name }) => name === REVIEW_LABEL)) {
    return {
      action: "fail",
      reason: `Lens hasn't reviewed this head: it runs once the PR carries the \`${REVIEW_LABEL}\` label.`,
    };
  }
  if (event.action === "labeled" && event.label?.name === REVIEW_LABEL) {
    return { action: "review" };
  }
  return { action: "reuse?" };
}

/** The newest finished verdict among one commit's `lens` runs: success, failure or null. */
export function lastVerdict(runs) {
  const finished = runs.filter(
    ({ status, conclusion }) =>
      status === "completed" && ["success", "failure"].includes(conclusion),
  );
  if (!finished.length) return null;
  return finished.reduce((a, b) => (b.id > a.id ? b : a)).conclusion;
}

export function notesOnly(files) {
  return files.every(({ filename }) => NOTES.test(filename));
}

/**
 * The commit whose ship covers `head`: the newest commit with a finished `lens` verdict, if that
 * verdict is a ship and only notes changed between it and the head. Null when there's none.
 */
export function reusableShip({ repo, number, head }) {
  const commits = list(`repos/${repo}/pulls/${number}/commits?per_page=100`)
    .map(({ sha }) => sha)
    .reverse();
  for (const sha of commits) {
    const runs = list(
      `repos/${repo}/commits/${sha}/check-runs?check_name=lens&filter=all&per_page=100`,
      { key: "check_runs" },
    );
    const verdict = lastVerdict(runs);
    if (!verdict) continue;
    if (verdict !== "success") return null;
    if (sha === head) return sha;
    const { files = [] } = api(`repos/${repo}/compare/${sha}...${head}`);
    return notesOnly(files) ? sha : null;
  }
  return null;
}

/**
 * The verdict from the review's structured output. It passes only on a ship with no Important
 * finding; anything missing, malformed or contradictory fails.
 */
export function verdictOf(structured) {
  let review;
  try {
    review = JSON.parse(structured);
  } catch {
    return { pass: false, reason: "The review returned no verdict." };
  }
  if (!VERDICTS.includes(review?.verdict) || !Array.isArray(review.findings)) {
    return { pass: false, reason: "The review's verdict couldn't be read." };
  }
  const important = review.findings.filter(
    ({ severity }) => severity === "important",
  );
  if (review.verdict === "ship" && important.length) {
    return {
      pass: false,
      review,
      reason:
        "Lens said ship but listed Important findings, which counts as changes.",
    };
  }
  return { pass: review.verdict === "ship", review };
}

/** The PR comment for a review: verdict, summary, findings, and what the run cost. */
export function commentFor({ review, reason }, { head, usage } = {}) {
  const lines = [
    `**Lens: ${review?.verdict ?? "no verdict"}** on ${String(head).slice(0, 7)}`,
    "",
    review?.summary ?? "",
    ...(reason ? ["", reason] : []),
  ];
  for (const { severity, file, line, title, detail } of review?.findings ??
    []) {
    const where = file ? ` \`${file}${line ? `:${line}` : ""}\`` : "";
    lines.push(`- **${severity}**${where}: ${title}. ${detail}`);
  }
  if (usage) {
    lines.push(
      "",
      `<sub>${usage.turns} turns, ${usage.tokens} tokens, ${usage.minutes} min</sub>`,
    );
  }
  return lines.join("\n").trim();
}

/** Turns, tokens and minutes from claude-code-action's execution file, when it has a result. */
export function usageOf(executionFile) {
  try {
    const messages = JSON.parse(readFileSync(executionFile, "utf8"));
    const result = messages.findLast(({ type }) => type === "result");
    const u = result.usage ?? {};
    const tokens =
      (u.input_tokens ?? 0) +
      (u.cache_creation_input_tokens ?? 0) +
      (u.cache_read_input_tokens ?? 0) +
      (u.output_tokens ?? 0);
    return {
      turns: result.num_turns,
      tokens,
      minutes: Math.round((result.duration_ms ?? 0) / 6000) / 10,
    };
  } catch {
    return undefined;
  }
}

function output(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  }
}

function summary(text) {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  }
}

function runPlan(event) {
  output("schema", JSON.stringify(SCHEMA));
  let { action, reason } = plan(event);
  if (action === "reuse?") {
    const { number, head } = event.pull_request;
    try {
      const from = reusableShip({
        repo: event.repository.full_name,
        number,
        head: head.sha,
      });
      action = from ? "reuse" : "review";
      if (from)
        reason = `Lens said ship on ${from.slice(0, 7)}, and only notes changed since.`;
    } catch {
      // Can't tell: reviewing again costs a run but never passes unreviewed code.
      action = "review";
    }
  }
  output("review", action === "review");
  if (reason) summary(reason);
  if (action === "fail") process.exitCode = 1;
}

function runVerdict(event) {
  const head = event.pull_request.head.sha;
  const result = verdictOf(process.env.STRUCTURED_OUTPUT ?? "");
  const body = commentFor(result, {
    head,
    usage: usageOf(process.env.EXECUTION_FILE),
  });
  summary(body);
  api(
    `repos/${event.repository.full_name}/issues/${event.pull_request.number}/comments`,
    {
      method: "POST",
      fields: { body },
    },
  );
  if (!result.pass) process.exitCode = 1;
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const step = process.argv[2];
  if (step === "plan") runPlan(event);
  else if (step === "verdict") runVerdict(event);
  else {
    console.error("Usage: node .studio/lens.mjs plan|verdict");
    process.exitCode = 2;
  }
}
