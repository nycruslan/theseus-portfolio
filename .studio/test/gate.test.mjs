import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { decide } from "../gate.mjs";
import { ghLog, REPO, routes, runHook, tempDir } from "./kit.mjs";

const R = `repos/${REPO}`;
const changed = (filename, extra = {}) => ({
  filename,
  status: "modified",
  additions: 0,
  deletions: 0,
  patch: "",
  ...extra,
});
const encode = (scripts) => ({
  content: Buffer.from(JSON.stringify({ scripts })).toString("base64"),
  encoding: "base64",
});
const labelled = (name) => ({ event: "labeled", label: { name } });

/** Runs the gate as the workflow does, on a pull_request_target event for PR #12. */
function gate(files, { labels = [], events = [], table = {}, env = {} } = {}) {
  const dir = tempDir();
  const event = join(dir, "event.json");
  const summary = join(dir, "summary.md");
  writeFileSync(
    event,
    JSON.stringify({
      pull_request: {
        number: 12,
        base: { sha: "ba5e" },
        head: { sha: "4ead" },
      },
      repository: { full_name: REPO },
    }),
  );
  writeFileSync(summary, "");
  const gh = ghLog();
  const result = runHook("gate.mjs", "", {
    env: {
      GITHUB_EVENT_PATH: event,
      GITHUB_STEP_SUMMARY: summary,
      GH_ROUTES: routes({
        [`${R}/pulls/12/files`]: files,
        [`${R}/issues/12/labels`]: labels.map((name) => ({ name })),
        [`${R}/issues/12/events`]: events,
        ...table,
      }),
      GH_LOG: gh.file,
      GH_STATE: tempDir(),
      ...env,
    },
  });
  return { ...result, gh: gh.calls(), summary: readFileSync(summary, "utf8") };
}

test("decide: the owner's label releases every hold, and nothing else does", () => {
  assert.equal(decide({ notes: [], labels: [], everHeld: false }).pass, true);
  const held = decide({
    notes: ["x is the owner's"],
    labels: [],
    everHeld: true,
  });
  assert.equal(held.pass, false);
  assert.equal(held.notes.length, 2);
  assert.match(held.summary, /needs the owner/);
  const approved = decide({
    notes: [],
    labels: ["owner-approved"],
    everHeld: true,
  });
  assert.equal(approved.pass, true);
  assert.match(approved.summary, /owner approved/);
});

test("passes a PR that stays on the team's side, reading it through the API alone", () => {
  const { code, stdout, gh } = gate([changed("app/page.tsx")]);
  assert.equal(code, 0);
  assert.match(stdout, /stays on the team's side/);
  // Only GET calls, and none that fetch the PR's code to run it.
  for (const call of gh)
    assert.ok(!call.includes("--method") || call.includes("GET"));
});

test("fails on owner paths unless the owner approved", () => {
  const files = [changed(".github/workflows/lens.yml")];
  const refused = gate(files);
  assert.equal(refused.code, 1);
  assert.match(
    refused.stdout,
    /::error::\.github\/workflows\/lens\.yml is the owner's/,
  );
  assert.match(refused.summary, /needs the owner/);
  const approved = gate(files, { labels: ["review", "owner-approved"] });
  assert.equal(approved.code, 0);
  assert.match(approved.stdout, /::notice::/);
});

test("holds a PR that ever carried needs-owner, even after the label came off", () => {
  const files = [changed("app/page.tsx")];
  const now = gate(files, { labels: ["needs-owner"] });
  assert.equal(now.code, 1);
  const before = gate(files, {
    events: [labelled("review"), labelled("needs-owner")],
  });
  assert.equal(before.code, 1);
  assert.match(before.stdout, /has carried needs-owner/);
  const released = gate(files, {
    labels: ["owner-approved"],
    events: [labelled("needs-owner")],
  });
  assert.equal(released.code, 0);
});

test("compares package.json's scripts where the PR branched and at its head", () => {
  const files = [changed("package.json", { additions: 1, deletions: 1 })];
  const table = {
    [`${R}/compare/ba5e...4ead`]: { merge_base_commit: { sha: "f0e1" } },
    [`${R}/contents/package.json`]: {
      $seq: [
        encode({ verify: "pnpm lint && pnpm build" }),
        encode({ verify: "true" }),
      ],
    },
  };
  const refused = gate(files, { table });
  assert.equal(refused.code, 1);
  assert.match(refused.stdout, /package\.json changes its scripts \(verify\)/);
  const bump = gate(files, {
    table: {
      ...table,
      [`${R}/contents/package.json`]: encode({ verify: "x" }),
    },
  });
  assert.equal(bump.code, 0);
});

test("fails closed when GitHub can't be read", () => {
  const { code } = gate([], { env: { GH_FAIL: "HTTP 502" } });
  assert.notEqual(code, 0);
});
