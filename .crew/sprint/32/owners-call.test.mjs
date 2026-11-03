// `node --test .crew/sprint/32/*.test.mjs`: the guard merge-record.mjs runs on /log's Approved
// column (R4), read against the repository's own CODEOWNERS through scope.mjs, as the step reads
// its merges'.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { codeowners } from "../../scope.mjs";
import {
  ownerPathsUnderGate,
  readsAsOwnersCall,
  refusal,
} from "./owners-call.mjs";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "..", "..");
const isOwned = codeowners(
  readFileSync(join(ROOT, ".github", "CODEOWNERS"), "utf8"),
);

// Sprint 36's outcome before and after R1, and the paths #91's squash changed that matter here.
const BEFORE =
  "waits for the owner: CI's 25-minute cap, raised to 35 in this PR as an Owner's pick";
const AFTER = `needs-owner: ${BEFORE}`;
const FILES = [
  ".crew/sprint/36/retro.json",
  ".github/workflows/ci.yml",
  "components/crew.tsx",
];

test("reads the owner's call as /log does", () => {
  assert.equal(readsAsOwnersCall(AFTER), true);
  assert.equal(readsAsOwnersCall("open, needs-owner: contract"), true);
  assert.equal(readsAsOwnersCall("NEEDS-OWNER"), true);
  assert.equal(readsAsOwnersCall(BEFORE), false);
  assert.equal(readsAsOwnersCall("needs-ownership"), false);
  assert.equal(readsAsOwnersCall(undefined), false);
  assert.equal(readsAsOwnersCall(["needs-owner"]), false);
});

test("a Gate retro whose squash touched an owner path is refused, naming the path", () => {
  assert.deepEqual(
    ownerPathsUnderGate({ outcome: BEFORE, files: FILES, isOwned }),
    [".github/workflows/ci.yml"],
  );
  assert.deepEqual(
    ownerPathsUnderGate({ outcome: undefined, files: FILES, isOwned }),
    [".github/workflows/ci.yml"],
  );
});

test("the owner's call passes, with or without an owner path", () => {
  assert.deepEqual(
    ownerPathsUnderGate({ outcome: AFTER, files: FILES, isOwned }),
    [],
  );
  assert.deepEqual(
    ownerPathsUnderGate({
      outcome: AFTER,
      files: ["components/keel.tsx"],
      isOwned,
    }),
    [],
  );
});

test("a Gate retro that touched only the team's paths passes", () => {
  const files = [
    ".crew/sprint/50/retro.json",
    ".crew/STATE.md",
    ".claude/agent-memory/engineer/MEMORY.md",
    "content/drafts/bio.md",
    "app/crew/page.tsx",
  ];
  assert.deepEqual(ownerPathsUnderGate({ outcome: BEFORE, files, isOwned }), []);
});

test("every owner path counts, both sides of a rename and any case", () => {
  const files = [
    ".crew/scope.mjs",
    ".Claude/settings.json",
    "content/profile.ts",
    "e2e/CLAUDE.md",
    "design/rubric.md",
  ];
  assert.deepEqual(
    ownerPathsUnderGate({ outcome: BEFORE, files, isOwned }),
    files,
  );
});

test("the refusal names the sprint, the PR and the paths", () => {
  const line = refusal({
    sprint: 36,
    pr: 91,
    paths: [".github/workflows/ci.yml"],
  });
  assert.match(line, /^sprint 36, #91, changed \.github\/workflows\/ci\.yml,/);
  assert.match(line, /\.crew\/sprint\/36\/retro\.json/);
  const many = refusal({
    sprint: 7,
    pr: 28,
    paths: ["a", "b", "c", "d", "e", "f", "g"],
  });
  assert.match(many, /changed a, b, c, d, e and 2 more,/);
});
