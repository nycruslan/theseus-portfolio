// The steps around Lens's review in CI (.github/workflows/lens.yml). Both run from the default
// branch with the team's checks app token; neither runs the PR's code.
// - `node .studio/lens.mjs plan` decides whether this run reviews. A new `review` label or a new
//   base always does. A push reuses Lens's last ship instead when it was given against the same
//   base and merge-base and only notes changed since, so a close-out commit doesn't pay for a
//   second review; reusing posts the `lens` check itself. To review, it writes the PR's
//   description and diff to lens-context.md for the model, which reads but never writes.
// - `node .studio/lens.mjs verdict` reads the review's structured output (claude-code-action's
//   `--json-schema`), posts it on the PR as one review with the findings inline, and posts the
//   `lens` check run: success only on ship with no Important finding.

import {
  appendFileSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { api, list, postCheck } from "./github.mjs";

// The team's notes, which no build reads: changing them doesn't make a review stale.
const NOTES =
  /^(\.studio\/sprint\/[^/]+\/([^/]+\.md|retro\.json)|\.studio\/STATE\.md|\.claude\/agent-memory\/[^/]+\/[^/]+\.md|ROADMAP\.md)$/u;
// GitHub's compare lists at most 300 files, so a list that long may hide code.
const COMPARE_LIMIT = 300;
const VERDICTS = ["ship", "changes", "blocked"];
export const CONTEXT = "lens-context.md";

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
          severity: { enum: ["important", "nit", "pre-existing"] },
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

/** "review" when the event asks for a fresh review, "reuse?" when a ship may still stand. */
export function plan(event) {
  const labelled = event.action === "labeled" && event.label?.name === "review";
  const rebased = event.action === "edited" && Boolean(event.changes?.base);
  return labelled || rebased ? "review" : "reuse?";
}

/** Whether a compare between a reviewed commit and the head changed notes and nothing else. */
export function notesOnly({ status, files = [] }) {
  return (
    status === "ahead" &&
    files.length > 0 &&
    files.length < COMPARE_LIMIT &&
    files.every(
      ({ filename, previous_filename: from }) =>
        NOTES.test(filename) && (!from || NOTES.test(from)),
    )
  );
}

/** The newest finished `lens` run the checks app posted on one commit, or null. */
export function lastVerdict(runs, slug) {
  const finished = runs.filter(
    ({ app, status, conclusion }) =>
      app?.slug === slug &&
      status === "completed" &&
      ["success", "failure"].includes(conclusion),
  );
  return finished.length
    ? finished.reduce((a, b) => (b.id > a.id ? b : a))
    : null;
}

/** Where a review was given: the base branch and the merge-base, as the check run records it. */
export function reviewedAgainst(base, mergeBase) {
  return `${base}@${mergeBase}`;
}

/**
 * The commit whose ship covers `head`: the newest commit with a finished `lens` verdict, when it
 * is a ship given against the same base and merge-base, and only notes changed since.
 */
function reusableShip({ repo, number, head, against, slug }) {
  const commits = list(
    `repos/${repo}/pulls/${number}/commits?per_page=100`,
  ).map(({ sha }) => sha);
  for (const sha of commits.reverse()) {
    const runs = list(
      `repos/${repo}/commits/${sha}/check-runs?check_name=lens&filter=all&per_page=100`,
      { key: "check_runs" },
    );
    const verdict = lastVerdict(runs, slug);
    if (!verdict) continue;
    if (verdict.conclusion !== "success" || verdict.external_id !== against)
      return null;
    if (sha === head) return sha;
    return notesOnly(api(`repos/${repo}/compare/${sha}...${head}`))
      ? sha
      : null;
  }
  return null;
}

// The model's whole view of the PR besides the checkout: its description and its diff.
function writeContext({ repo, pr }) {
  const files = list(`repos/${repo}/pulls/${pr.number}/files?per_page=100`);
  const lines = [
    `# PR #${pr.number}: ${pr.title}`,
    "",
    `Base ${pr.base.ref}, head ${pr.head.sha}. The PR's files are checked out in pr/.`,
    "",
    pr.body ?? "",
    "",
    "## Diff",
  ];
  for (const { filename, status, patch } of files) {
    lines.push("", `### ${filename} (${status})`, "");
    lines.push(
      patch
        ? `\`\`\`diff\n${patch}\n\`\`\``
        : `No diff shown: read pr/${filename}.`,
    );
  }
  writeFileSync(CONTEXT, `${lines.join("\n")}\n`);
}

/**
 * The verdict from the review's structured output. It passes only on a ship with no Important
 * finding; anything missing, malformed or contradictory fails.
 */
export function verdictOf(structured, usage) {
  let review;
  try {
    review = JSON.parse(structured);
  } catch {
    const reason = usage?.maxedOut
      ? "Lens ran out of turns before giving a verdict."
      : "The review returned no verdict.";
    return { pass: false, reason };
  }
  if (!VERDICTS.includes(review?.verdict) || !Array.isArray(review.findings)) {
    return { pass: false, reason: "The review's verdict couldn't be read." };
  }
  const important = review.findings.some(
    ({ severity }) => severity === "important",
  );
  if (review.verdict === "ship" && important) {
    return {
      pass: false,
      review,
      reason:
        "Lens said ship but listed Important findings, which counts as changes.",
    };
  }
  return { pass: review.verdict === "ship", review };
}

/** The review's text: verdict, summary, findings, and what the run cost. */
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
      maxedOut: result.subtype === "error_max_turns",
    };
  } catch {
    return undefined;
  }
}

// One review on the head: the findings with a file and line go inline. GitHub refuses the whole
// review when a line isn't in the diff, so then the findings stay in the body alone.
function postReview({ repo, number, head, body, findings }) {
  const path = `repos/${repo}/pulls/${number}/reviews`;
  const comments = findings
    .filter(({ file, line }) => file && line)
    .map(({ severity, file, line, title, detail }) => ({
      path: file,
      line,
      side: "RIGHT",
      body: `**${severity}**: ${title}. ${detail}`,
    }));
  const review = { commit_id: head, event: "COMMENT", body };
  try {
    api(path, { method: "POST", body: { ...review, comments } });
  } catch {
    api(path, { method: "POST", body: review });
  }
}

function summary(text) {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  }
}

function runPlan(event, env) {
  const repo = event.repository.full_name;
  const pr = event.pull_request;
  const compare = api(`repos/${repo}/compare/${pr.base.sha}...${pr.head.sha}`);
  const against = reviewedAgainst(pr.base.ref, compare.merge_base_commit.sha);
  const output = (name, value) =>
    appendFileSync(env.GITHUB_OUTPUT, `${name}=${value}\n`);
  output("schema", JSON.stringify(SCHEMA));
  output("against", against);
  if (plan(event) === "reuse?") {
    const slug = env.APP_SLUG;
    const from = reusableShip({
      repo,
      number: pr.number,
      head: pr.head.sha,
      against,
      slug,
    });
    if (from) {
      const title = `Lens's ship on ${from.slice(0, 7)} stands: only notes changed since.`;
      postCheck({
        repo,
        name: "lens",
        head: pr.head.sha,
        pass: true,
        title,
        summary: title,
        externalId: against,
      });
      output("review", "false");
      summary(title);
      return;
    }
  }
  writeContext({ repo, pr });
  output("review", "true");
}

function runVerdict(event, env) {
  const repo = event.repository.full_name;
  const { number, head } = event.pull_request;
  const usage = usageOf(env.EXECUTION_FILE);
  const result = verdictOf(env.STRUCTURED_OUTPUT ?? "", usage);
  const body = commentFor(result, { head: head.sha, usage });
  summary(body);
  postReview({
    repo,
    number,
    head: head.sha,
    body,
    findings: result.review?.findings ?? [],
  });
  const title = result.pass
    ? "Lens: ship"
    : `Lens: ${result.review?.verdict ?? "no verdict"}`;
  postCheck({
    repo,
    name: "lens",
    head: head.sha,
    pass: result.pass,
    title,
    summary: body,
    externalId: env.AGAINST,
  });
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const step = { plan: runPlan, verdict: runVerdict }[process.argv[2]];
  if (step) step(event, process.env);
  else {
    console.error("Usage: node .studio/lens.mjs plan|verdict");
    process.exitCode = 2;
  }
}
