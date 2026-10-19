import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { decide, ownerApproved } from "../gate.mjs";
import { ghLog, REPO, routes, runHook, tempDir } from "./kit.mjs";

const R = `repos/${REPO}`;
const HEAD = "4ead4ead";
const changed = (filename, extra = {}) => ({
  filename,
  status: "modified",
  patch: "",
  ...extra,
});
const encode = (scripts) => ({
  content: Buffer.from(JSON.stringify({ scripts })).toString("base64"),
  encoding: "base64",
});
const labelled = (name) => ({ event: "labeled", label: { name } });
const review = (login, state, commit_id = HEAD) => ({
  user: { login },
  state,
  commit_id,
});
const pr = (extra = {}) => ({
  number: 12,
  state: "open",
  base: { ref: "main", sha: "ba5e" },
  head: { sha: HEAD },
  labels: [],
  ...extra,
});

/** Runs the gate as the workflow does, and returns the check run it posted. */
function gate(
  files,
  { pull = pr(), events = [], reviews = [], table = {}, event, env = {} } = {},
) {
  const path = join(tempDir(), "event.json");
  writeFileSync(
    path,
    JSON.stringify({
      ...(event ?? { pull_request: { number: 12 } }),
      repository: {
        full_name: REPO,
        default_branch: "main",
        owner: { login: "nycruslan" },
      },
    }),
  );
  const gh = ghLog();
  const result = runHook("gate.mjs", "", {
    env: {
      GITHUB_EVENT_PATH: path,
      GH_ROUTES: routes({
        [`${R}/pulls/12`]: pull,
        [`${R}/pulls/12/files`]: files,
        [`${R}/pulls/12/reviews`]: reviews,
        [`${R}/issues/12/events`]: events,
        [`POST ${R}/check-runs`]: { id: 1 },
        ...table,
      }),
      GH_LOG: gh.file,
      GH_STATE: tempDir(),
      ...env,
    },
  });
  const posted = gh.calls().find((call) => call.includes(`${R}/check-runs`));
  return { ...result, check: posted && JSON.parse(posted.at(-1)) };
}

test("decide: only the owner's approval of the head releases a hold", () => {
  assert.equal(
    decide({ notes: [], everHeld: false, approved: false }).pass,
    true,
  );
  const held = decide({
    notes: ["x is the owner's"],
    everHeld: true,
    approved: false,
  });
  assert.deepEqual([held.pass, held.notes.length], [false, 2]);
  assert.equal(
    decide({ notes: ["x"], everHeld: true, approved: true }).pass,
    true,
  );
});

test("the owner's latest deciding review must approve this exact head", () => {
  const approve = review("nycruslan", "APPROVED");
  assert.ok(ownerApproved([approve], "nycruslan", HEAD));
  assert.ok(
    ownerApproved(
      [approve, review("nycruslan", "COMMENTED", "old")],
      "nycruslan",
      HEAD,
    ),
  );
  assert.ok(
    !ownerApproved([review("nycruslan", "APPROVED", "old")], "nycruslan", HEAD),
  );
  assert.ok(
    !ownerApproved(
      [approve, review("nycruslan", "DISMISSED")],
      "nycruslan",
      HEAD,
    ),
  );
  assert.ok(
    !ownerApproved(
      [approve, review("nycruslan", "CHANGES_REQUESTED")],
      "nycruslan",
      HEAD,
    ),
  );
  assert.ok(
    !ownerApproved([review("theseus-bot", "APPROVED")], "nycruslan", HEAD),
  );
});

test("passes a PR that stays on the team's side, with a check run on its live head", () => {
  const { code, check } = gate([changed("app/page.tsx")]);
  assert.equal(code, 0);
  assert.equal(check.name, "gate");
  assert.equal(check.head_sha, HEAD);
  assert.equal(check.conclusion, "success");
});

test("holds owner paths, scripts and needs-owner until the owner approves the head", () => {
  const owner = [changed(".github/workflows/lens.yml")];
  assert.equal(gate(owner).check.conclusion, "failure");
  assert.match(gate(owner).check.output.summary, /lens\.yml is the owner's/);
  const stale = gate(owner, {
    reviews: [review("nycruslan", "APPROVED", "older")],
  });
  assert.equal(stale.check.conclusion, "failure");
  const approved = gate(owner, { reviews: [review("nycruslan", "APPROVED")] });
  assert.equal(approved.check.conclusion, "success");
  assert.match(approved.check.output.title, /owner approved this head/);
  // Marked, so merge.mjs leaves it to the owner: a session could have posted that approval.
  assert.equal(approved.check.external_id, "owner-approved");
  assert.equal(gate([changed("app/page.tsx")]).check.external_id, undefined);
  const held = gate([changed("app/page.tsx")], {
    events: [labelled("review"), labelled("needs-owner")],
  });
  assert.equal(held.check.conclusion, "failure");
  assert.match(held.check.output.summary, /has carried needs-owner/);
});

test("compares package.json's scripts where the PR branched and at its head", () => {
  const files = [changed("package.json")];
  const table = {
    [`${R}/compare/ba5e...${HEAD}`]: { merge_base_commit: { sha: "f0e1" } },
    [`${R}/contents/package.json`]: {
      $seq: [
        encode({ verify: "pnpm lint && pnpm build" }),
        encode({ verify: "true" }),
      ],
    },
  };
  assert.match(
    gate(files, { table }).check.output.summary,
    /changes its scripts \(verify\)/,
  );
  const bump = {
    ...table,
    [`${R}/contents/package.json`]: encode({ verify: "x" }),
  };
  assert.equal(gate(files, { table: bump }).check.conclusion, "success");
});

test("after the review relay, judges the open PR into the default branch at the run's head", () => {
  const relay = { workflow_run: { head_sha: HEAD, pull_requests: [] } };
  const table = {
    [`${R}/commits/${HEAD}/pulls`]: [
      { number: 9, state: "open", base: { ref: "sprint/3" } },
      { number: 12, state: "open", base: { ref: "main" } },
    ],
  };
  const { check } = gate([changed("app/page.tsx")], { event: relay, table });
  assert.equal(check.conclusion, "success");
});

test("a PR under the owner's login (every team PR) holds, and says the owner merges it with the bypass", () => {
  const { check } = gate([changed(".claude/settings.json")], {
    pull: pr({ user: { login: "NYCRuslan" } }),
  });
  assert.equal(check.conclusion, "failure");
  assert.match(check.output.title, /merge it with the ruleset's bypass/);
});

test("posts nothing when the head moved while it judged", () => {
  const pull = { $seq: [pr(), pr({ head: { sha: "newer" } })] };
  const { code, check, stdout } = gate([changed("app/page.tsx")], { pull });
  assert.equal(code, 0);
  assert.equal(check, undefined);
  assert.match(stdout, /no longer the PR's head/);
});

test("leaves a PR into another branch, or a closed one, alone", () => {
  assert.equal(
    gate([], { pull: pr({ base: { ref: "sprint/3", sha: "x" } }) }).check,
    undefined,
  );
  assert.equal(gate([], { pull: pr({ state: "closed" }) }).check, undefined);
});

test("fails without a verdict when GitHub can't be read", () => {
  const { code, check } = gate([], { env: { GH_FAIL: "HTTP 502" } });
  assert.notEqual(code, 0);
  assert.equal(check, undefined);
});
