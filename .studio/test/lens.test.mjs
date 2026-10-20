import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  commentFor,
  lastVerdict,
  notesOnly,
  plan,
  reviewedAgainst,
  SCHEMA,
  usageOf,
  verdictOf,
} from "../lens.mjs";
import { ghLog, REPO, routes, runHook, tempDir } from "./kit.mjs";

const R = `repos/${REPO}`;
const SLUG = "theseus-checks";
const AGAINST = reviewedAgainst("main", "f0e1");

/** A pull_request_target event for PR #15. */
function event({ action = "synchronize", label, changes } = {}) {
  return {
    action,
    ...(label && { label: { name: label } }),
    ...(changes && { changes }),
    pull_request: {
      number: 15,
      title: "Sprint 3: hero",
      body: "Contract: .studio/sprint/3/contract.md",
      base: { ref: "main", sha: "ba5e" },
      head: { sha: "c0ffee" },
    },
    repository: { full_name: REPO },
  };
}
const review = (verdict, findings = []) =>
  JSON.stringify({ verdict, summary: "Looks right.", findings });
const run = (id, conclusion, extra = {}) => ({
  id,
  status: "completed",
  conclusion,
  app: { slug: SLUG },
  external_id: AGAINST,
  ...extra,
});
const files = (...names) => ({
  status: "ahead",
  files: names.map((filename) => ({ filename })),
});

test("plan: a new review label or a new base always reviews; anything else may reuse a ship", () => {
  assert.equal(plan(event({ action: "labeled", label: "review" })), "review");
  assert.equal(
    plan(
      event({ action: "edited", changes: { base: { ref: { from: "x" } } } }),
    ),
    "review",
  );
  assert.equal(
    plan(event({ action: "edited", changes: { body: { from: "x" } } })),
    "reuse?",
  );
  assert.equal(
    plan(event({ action: "labeled", label: "needs-owner" })),
    "reuse?",
  );
  assert.equal(plan(event()), "reuse?");
});

test("only the team's notes leave a review standing", () => {
  assert.ok(
    notesOnly(
      files(
        ".studio/sprint/3/retro.json",
        ".studio/sprint/3/pr.md",
        "ROADMAP.md",
      ),
    ),
  );
  assert.ok(notesOnly(files(".studio/STATE.md")));
  for (const code of [
    // Memory loads into the agents' prompts, so it's reviewed like code.
    ".claude/agent-memory/engineer/MEMORY.md",
    "app/page.tsx",
    ".studio/lens.mjs",
    ".studio/sprint/3/hack.ts",
    ".studio/sprint/3/x/y.md",
  ]) {
    assert.ok(!notesOnly(files(".studio/STATE.md", code)), code);
  }
  // Code renamed into the notes still changed the build.
  const moved = {
    status: "ahead",
    files: [
      { filename: ".studio/sprint/3/a.md", previous_filename: "app/a.tsx" },
    ],
  };
  assert.ok(!notesOnly(moved));
  assert.ok(!notesOnly({ status: "ahead", files: [] }));
  assert.ok(!notesOnly({ ...files(".studio/STATE.md"), status: "diverged" }));
  const many = Array.from(
    { length: 300 },
    (_, i) => `.studio/sprint/3/n${i}.md`,
  );
  assert.ok(!notesOnly(files(...many)));
});

test("a verdict counts only from the checks app, newest first; cancelled and running ones don't", () => {
  assert.equal(lastVerdict([], SLUG), null);
  assert.equal(
    lastVerdict([run(1, "success"), run(2, "failure")], SLUG).conclusion,
    "failure",
  );
  assert.equal(
    lastVerdict([run(3, "success"), run(4, "cancelled")], SLUG).conclusion,
    "success",
  );
  const forged = run(9, "success", { app: { slug: "github-actions" } });
  assert.equal(
    lastVerdict([run(5, "failure"), forged], SLUG).conclusion,
    "failure",
  );
});

test("verdict: only a ship with no Important finding passes; anything unreadable fails", () => {
  assert.equal(
    verdictOf(review("ship", [{ severity: "nit", title: "t", detail: "d" }]))
      .pass,
    true,
  );
  assert.equal(verdictOf(review("changes")).pass, false);
  const contradiction = verdictOf(
    review("ship", [{ severity: "important", title: "t", detail: "d" }]),
  );
  assert.match(contradiction.reason, /counts as changes/);
  for (const output of [
    "",
    "not json",
    '{"verdict":"lgtm","findings":[]}',
    '{"verdict":"ship"}',
  ]) {
    assert.equal(verdictOf(output).pass, false, output);
  }
  assert.match(verdictOf("", { maxedOut: true }).reason, /ran out of turns/);
  assert.deepEqual(SCHEMA.properties.verdict.enum, [
    "ship",
    "changes",
    "blocked",
  ]);
});

test("the comment carries what the review cost, read from the action's execution file", () => {
  const file = join(tempDir(), "execution.json");
  const result = {
    type: "result",
    subtype: "success",
    num_turns: 18,
    duration_ms: 252_000,
  };
  const usage = {
    input_tokens: 10,
    cache_read_input_tokens: 900,
    output_tokens: 90,
  };
  writeFileSync(
    file,
    JSON.stringify([{ type: "system" }, { ...result, usage }]),
  );
  const read = usageOf(file);
  assert.deepEqual(read, {
    turns: 18,
    tokens: 1000,
    minutes: 4.2,
    maxedOut: false,
  });
  assert.match(
    commentFor(verdictOf(review("ship")), { head: "c0ffee", usage: read }),
    /18 turns, 1000 tokens/,
  );
  assert.equal(usageOf(join(tempDir(), "missing.json")), undefined);
});

/** Runs a lens.mjs step as the workflow does, in its own workspace. */
function step(name, payload, { table = {}, env = {} } = {}) {
  const dir = tempDir();
  writeFileSync(join(dir, "event.json"), JSON.stringify(payload));
  writeFileSync(join(dir, "outputs"), "");
  const gh = ghLog();
  const result = runHook("lens.mjs", "", {
    cwd: dir,
    args: [name],
    env: {
      GITHUB_EVENT_PATH: join(dir, "event.json"),
      GITHUB_OUTPUT: join(dir, "outputs"),
      APP_SLUG: SLUG,
      AGAINST,
      GH_ROUTES: routes({
        [`${R}/compare/ba5e...c0ffee`]: { merge_base_commit: { sha: "f0e1" } },
        [`${R}/compare/f0e1...c0ffee`]: {
          status: "ahead",
          files: [
            { filename: "app/page.tsx", status: "modified", patch: "+x" },
          ],
        },
        [`${R}/pulls/15`]: { head: { sha: "c0ffee" } },
        [`POST ${R}/check-runs`]: { id: 1 },
        ...table,
      }),
      GH_LOG: gh.file,
      ...env,
    },
  });
  const calls = gh.calls();
  const posted = (path) =>
    calls
      .filter((call) => call.includes(path))
      .map((call) => JSON.parse(call.at(-1)));
  return {
    ...result,
    outputs: readFileSync(join(dir, "outputs"), "utf8"),
    checks: posted(`${R}/check-runs`),
    reviews: posted(`${R}/pulls/15/reviews`),
    context:
      existsSync(join(dir, "lens-context.md")) &&
      readFileSync(join(dir, "lens-context.md"), "utf8"),
  };
}

const history = (runs, compare) => ({
  [`${R}/pulls/15/commits`]: [{ sha: "abc123" }, { sha: "c0ffee" }],
  [`${R}/commits/abc123/check-runs`]: { check_runs: runs },
  [`${R}/commits/c0ffee/check-runs`]: { check_runs: [] },
  [`${R}/compare/abc123...c0ffee`]: compare,
});

test("a notes-only push after a ship against the same base and merge-base reuses it", () => {
  const table = history(
    [run(1, "success")],
    files(".studio/sprint/3/retro.json"),
  );
  const reused = step("plan", event(), { table });
  assert.match(reused.outputs, /^review=false$/m);
  assert.deepEqual(
    [
      reused.checks[0].name,
      reused.checks[0].conclusion,
      reused.checks[0].external_id,
    ],
    ["lens", "success", AGAINST],
  );
});

test("a code change, another base or merge-base, a forged ship or a fresh label means a review", () => {
  const cases = [
    history([run(1, "success")], files("app/page.tsx")),
    history(
      [run(1, "success", { external_id: reviewedAgainst("main", "0ld") })],
      files("ROADMAP.md"),
    ),
    history(
      [run(1, "success", { app: { slug: "github-actions" } })],
      files("ROADMAP.md"),
    ),
  ];
  for (const table of cases) {
    const { outputs, checks, context } = step("plan", event(), { table });
    assert.match(outputs, /^review=true$/m);
    assert.equal(checks.length, 0);
    assert.match(
      context,
      /# PR #15: Sprint 3: hero[\s\S]*### app\/page\.tsx \(modified\)[\s\S]*\+x/,
    );
  }
  const labelled = step("plan", event({ action: "labeled", label: "review" }));
  assert.match(labelled.outputs, /^review=true$/m);
  assert.deepEqual(
    JSON.parse(labelled.outputs.match(/^schema=(.*)$/m)[1]),
    SCHEMA,
  );
  assert.match(labelled.outputs, /^against=main@f0e1$/m);
});

test("the verdict step posts one review with the findings inline, then the lens check", () => {
  const findings = [
    {
      severity: "important",
      file: "app/x.ts",
      line: 3,
      title: "Bug",
      detail: "Fix.",
    },
  ];
  const table = { [`POST ${R}/pulls/15/reviews`]: { id: 2 } };
  const changes = step("verdict", event(), {
    table,
    env: { STRUCTURED_OUTPUT: review("changes", findings) },
  });
  assert.equal(changes.reviews[0].event, "COMMENT");
  assert.deepEqual(changes.reviews[0].comments, [
    {
      path: "app/x.ts",
      line: 3,
      side: "RIGHT",
      body: "**important**: Bug. Fix.",
    },
  ]);
  assert.deepEqual(
    [changes.checks[0].conclusion, changes.checks[0].external_id],
    ["failure", AGAINST],
  );
  const ship = step("verdict", event(), {
    table,
    env: { STRUCTURED_OUTPUT: review("ship") },
  });
  assert.equal(ship.checks[0].conclusion, "success");
  const missing = step("verdict", event(), { table });
  assert.equal(missing.checks[0].conclusion, "failure");
  assert.match(missing.checks[0].output.summary, /no verdict/);
});

test("when GitHub refuses an inline comment, the findings stay in the review's body", () => {
  const findings = [
    {
      severity: "nit",
      file: "app/x.ts",
      line: 999,
      title: "Name",
      detail: "Rename.",
    },
  ];
  const table = {
    [`POST ${R}/pulls/15/reviews`]: {
      $seq: [{ $error: 422, message: "line not in diff" }, { id: 3 }],
    },
  };
  const { reviews, checks } = step("verdict", event(), {
    table,
    env: { STRUCTURED_OUTPUT: review("ship", findings), GH_STATE: tempDir() },
  });
  assert.equal(reviews.length, 2);
  assert.equal(reviews[1].comments, undefined);
  assert.match(
    reviews[1].body,
    /\*\*nit\*\* `app\/x\.ts:999`: Name\. Rename\./,
  );
  assert.equal(checks[0].conclusion, "success");
});

test("when GitHub won't take the review at all, the check still carries the verdict", () => {
  const table = {
    [`POST ${R}/pulls/15/reviews`]: {
      $error: 502,
      message: "unexpected end of JSON input",
    },
  };
  const { code, stdout, reviews, checks } = step("verdict", event(), {
    table,
    env: { STRUCTURED_OUTPUT: review("ship"), GH_STATE: tempDir() },
  });
  assert.equal(code, 0);
  assert.equal(reviews.length, 2);
  assert.equal(checks.length, 1);
  assert.equal(checks[0].conclusion, "success");
  assert.match(checks[0].output.summary, /Lens: ship/);
  assert.match(stdout, /GitHub didn't take the review .*the check carries it/);
});

test("a run whose head is no longer the PR's posts nothing", () => {
  const moved = { [`${R}/pulls/15`]: { head: { sha: "newer" } } };
  const planned = step("plan", event({ action: "labeled", label: "review" }), {
    table: moved,
  });
  assert.match(planned.outputs, /^review=false$/m);
  assert.equal(planned.context, false);
  const reviewed = step("verdict", event(), {
    table: moved,
    env: { STRUCTURED_OUTPUT: review("ship") },
  });
  assert.deepEqual([reviewed.checks.length, reviewed.reviews.length], [0, 0]);
  assert.match(reviewed.stdout, /moved on while Lens reviewed/);
});
