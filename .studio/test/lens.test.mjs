import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  commentFor,
  lastVerdict,
  notesOnly,
  plan,
  SCHEMA,
  usageOf,
  verdictOf,
} from "../lens.mjs";
import { ghLog, REPO, routes, runHook, tempDir } from "./kit.mjs";

const R = `repos/${REPO}`;
/** A pull_request event for PR #15, from this repository unless `fork` says otherwise. */
function event({
  action = "synchronize",
  label,
  labels = ["review"],
  fork,
} = {}) {
  return {
    action,
    ...(label && { label: { name: label } }),
    pull_request: {
      number: 15,
      labels: labels.map((name) => ({ name })),
      head: { sha: "c0ffee", repo: { full_name: fork ?? REPO } },
    },
    repository: { full_name: REPO },
  };
}
const review = (verdict, findings = []) =>
  JSON.stringify({ verdict, summary: "Looks right.", findings });
const run = (id, conclusion, status = "completed") => ({
  id,
  status,
  conclusion,
});

test("plan: a fork's PR and an unlabelled one fail before anything runs", () => {
  assert.equal(
    plan(event({ fork: "stranger/theseus-portfolio" })).action,
    "fail",
  );
  assert.equal(plan(event({ labels: ["needs-owner"] })).action, "fail");
});

test("plan: adding the review label reviews; a push or another label looks for a ship first", () => {
  assert.equal(
    plan(event({ action: "labeled", label: "review" })).action,
    "review",
  );
  assert.equal(
    plan(event({ action: "labeled", label: "needs-owner" })).action,
    "reuse?",
  );
  assert.equal(plan(event()).action, "reuse?");
});

test("the newest finished run on a commit is its verdict; cancelled and running ones don't count", () => {
  assert.equal(lastVerdict([]), null);
  assert.equal(lastVerdict([run(1, "success"), run(2, "failure")]), "failure");
  assert.equal(
    lastVerdict([run(3, "success"), run(4, "cancelled")]),
    "success",
  );
  assert.equal(
    lastVerdict([run(5, "success"), run(6, null, "in_progress")]),
    "success",
  );
});

test("only the team's notes leave a review standing", () => {
  assert.ok(
    notesOnly([
      { filename: ".studio/sprint/3/retro.json" },
      { filename: "ROADMAP.md" },
    ]),
  );
  assert.ok(
    !notesOnly([
      { filename: ".studio/STATE.md" },
      { filename: "app/page.tsx" },
    ]),
  );
});

test("verdict: only a ship with no Important finding passes", () => {
  assert.equal(
    verdictOf(review("ship", [{ severity: "nit", title: "t", detail: "d" }]))
      .pass,
    true,
  );
  assert.equal(verdictOf(review("changes")).pass, false);
  assert.equal(verdictOf(review("blocked")).pass, false);
  const contradiction = verdictOf(
    review("ship", [{ severity: "important", title: "t", detail: "d" }]),
  );
  assert.equal(contradiction.pass, false);
  assert.match(contradiction.reason, /counts as changes/);
});

test("verdict: no output, broken JSON or an unknown verdict fails closed", () => {
  for (const output of [
    "",
    "not json",
    '{"verdict":"lgtm","findings":[]}',
    '{"verdict":"ship"}',
  ]) {
    assert.equal(verdictOf(output).pass, false, output);
  }
});

test("the schema asks for exactly the verdicts the parser accepts", () => {
  assert.deepEqual(SCHEMA.properties.verdict.enum, [
    "ship",
    "changes",
    "blocked",
  ]);
  assert.deepEqual(SCHEMA.required, ["verdict", "summary", "findings"]);
});

/** Runs a lens.mjs step as the workflow does. */
function step(name, payload, { table = {}, env = {} } = {}) {
  const dir = tempDir();
  const path = join(dir, "event.json");
  const outputs = join(dir, "outputs");
  writeFileSync(path, JSON.stringify(payload));
  writeFileSync(outputs, "");
  const gh = ghLog();
  const result = runHook("lens.mjs", "", {
    args: [name],
    env: {
      GITHUB_EVENT_PATH: path,
      GITHUB_OUTPUT: outputs,
      GH_ROUTES: routes(table),
      GH_LOG: gh.file,
      ...env,
    },
  });
  return { ...result, outputs: readFileSync(outputs, "utf8"), gh: gh.calls() };
}

const history = (runsBySha, files = []) => ({
  [`${R}/pulls/15/commits`]: Object.keys(runsBySha).map((sha) => ({ sha })),
  ...Object.fromEntries(
    Object.entries(runsBySha).map(([sha, runs]) => [
      `${R}/commits/${sha}/check-runs`,
      { check_runs: runs },
    ]),
  ),
  [`${R}/compare/*`]: { files },
});

test("a notes-only push after a ship reuses it instead of reviewing again", () => {
  const table = history({ abc123: [run(1, "success")], c0ffee: [] }, [
    { filename: ".studio/sprint/3/retro.json" },
  ]);
  const reused = step("plan", event(), { table });
  assert.equal(reused.code, 0);
  assert.match(reused.outputs, /^review=false$/m);
  assert.match(reused.stdout, /ship on abc123/);
});

test("a product change, an earlier changes verdict or an unreadable history asks for a review", () => {
  const product = history({ abc123: [run(1, "success")], c0ffee: [] }, [
    { filename: "app/page.tsx" },
  ]);
  assert.match(
    step("plan", event(), { table: product }).outputs,
    /^review=true$/m,
  );
  const changes = history({ abc123: [run(1, "failure")], c0ffee: [] });
  assert.match(
    step("plan", event(), { table: changes }).outputs,
    /^review=true$/m,
  );
  const broken = step("plan", event(), { env: { GH_FAIL: "HTTP 502" } });
  assert.equal(broken.code, 0);
  assert.match(broken.outputs, /^review=true$/m);
});

test("plan fails an unlabelled PR, and always hands the workflow the schema", () => {
  const { code, outputs, stdout } = step("plan", event({ labels: [] }));
  assert.equal(code, 1);
  assert.match(stdout, /once the PR carries the `review` label/);
  assert.deepEqual(JSON.parse(outputs.match(/^schema=(.*)$/m)[1]), SCHEMA);
});

test("the verdict step posts the review on the PR and fails unless it ships", () => {
  const table = { [`POST ${R}/issues/15/comments`]: { id: 1 } };
  const ship = step("verdict", event(), {
    table,
    env: { STRUCTURED_OUTPUT: review("ship") },
  });
  assert.equal(ship.code, 0);
  const posted = ship.gh.find((call) =>
    call.includes(`${R}/issues/15/comments`),
  );
  assert.ok(
    posted.some((arg) => arg.startsWith("body=**Lens: ship** on c0ffee")),
  );
  const changes = step("verdict", event(), {
    table,
    env: {
      STRUCTURED_OUTPUT: review("changes", [
        {
          severity: "important",
          file: "app/x.ts",
          line: 3,
          title: "Bug",
          detail: "Fix.",
        },
      ]),
    },
  });
  assert.equal(changes.code, 1);
  assert.match(changes.stdout, /\*\*important\*\* `app\/x\.ts:3`: Bug\. Fix\./);
  const missing = step("verdict", event(), { table });
  assert.equal(missing.code, 1);
  assert.match(missing.stdout, /no verdict/);
});

test("the comment carries what the review cost, read from the action's execution file", () => {
  const file = join(tempDir(), "execution.json");
  writeFileSync(
    file,
    JSON.stringify([
      { type: "system" },
      {
        type: "result",
        num_turns: 18,
        duration_ms: 252_000,
        usage: {
          input_tokens: 10,
          cache_read_input_tokens: 900,
          output_tokens: 90,
        },
      },
    ]),
  );
  const usage = usageOf(file);
  assert.deepEqual(usage, { turns: 18, tokens: 1000, minutes: 4.2 });
  assert.match(
    commentFor(verdictOf(review("ship")), { head: "c0ffee", usage }),
    /18 turns, 1000 tokens, 4\.2 min/,
  );
  assert.equal(usageOf(join(tempDir(), "missing.json")), undefined);
});
