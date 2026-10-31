import assert from "node:assert/strict";
import { test } from "node:test";
import { keepAnswers, ownerPicks, unbuilt } from "../picks.mjs";

const texts = (pick) => pick.options.map(({ text }) => text);

test("a pick's options are the one list under its heading: a checklist further down is never one of them", () => {
  const afterProse = ownerPicks(
    [
      "### Owner's pick: The footer",
      "Two columns read faster.",
      "- [ ] Two columns (Recommended)",
      "- [x] One column",
      "**Checklist**",
      "- [x] pnpm verify passes",
    ].join("\n"),
  );
  assert.deepEqual(texts(afterProse[0]), [
    "Two columns (Recommended)",
    "One column",
  ]);
  const afterBlank = ownerPicks(
    [
      "### Owner's pick: The footer",
      "- [ ] Two columns (Recommended)",
      "- [ ] One column",
      "",
      "Applied: Two columns, in #90.",
      "",
      "- [x] 184 of 184 e2e",
    ].join("\n"),
  );
  assert.deepEqual(texts(afterBlank[0]), [
    "Two columns (Recommended)",
    "One column",
  ]);
  assert.equal(afterBlank[0].applied, "Two columns");
  assert.deepEqual(unbuilt(afterBlank[0]), []);
});

test("reads the heading's variants, and never a pick in fenced code", () => {
  const picks = ownerPicks(
    [
      "### Owner’s pick: Curly",
      "- [ ] A (Recommended)",
      "#### Owner's pick: (waits) Spend $20 a month",
      "- [ ] No (Recommended)",
      "```md",
      "### Owner's pick: An example",
      "- [x] B",
      "```",
    ].join("\n"),
  );
  assert.deepEqual(
    picks.map(({ question, waits }) => [question, waits]),
    [
      ["Curly", false],
      ["Spend $20 a month", true],
    ],
  );
});

test("reads an Applied line in the team's words: bold, a bullet, more PRs, markdown in the option", () => {
  const applied = (line, option = "B") =>
    ownerPicks(
      `### Owner's pick: Q\n- [ ] A (Recommended)\n- [x] ${option}\n${line}`,
    )[0];
  for (const line of [
    "Applied: B, in #41.",
    "**Applied:** B, in #41.",
    "**Applied**: B in #41",
    "- Applied: B, in #41 and #42.",
    "Applied: b.",
  ]) {
    assert.deepEqual(unbuilt(applied(line)), [], line);
  }
  // An option with a link or bold reads as its words.
  assert.deepEqual(
    unbuilt(
      applied(
        "Applied: The canvas's B, in #41.",
        "The [canvas's](https://x.test) **B**",
      ),
    ),
    [],
  );
  // A sentence that only starts with the word is no Applied line.
  assert.equal(applied("Applied the fix in #41.").applied, null);
});

test("a tick beside the built option is a new answer: GitHub's boxes are independent", () => {
  const pick = (lines) =>
    ownerPicks(["### Owner's pick: Q", ...lines].join("\n"))[0];
  // The recommended box ticked to acknowledge it, then B ticked as well.
  assert.deepEqual(unbuilt(pick(["- [x] A (Recommended)", "- [x] B"])), ["B"]);
  // B applied, then C ticked without unticking B.
  assert.deepEqual(
    unbuilt(
      pick([
        "- [ ] A (Recommended)",
        "- [x] B",
        "- [x] C",
        "Applied: B, in #41.",
      ]),
    ),
    ["C"],
  );
});

test("a rewritten body keeps the owner's ticks and the team's Applied lines from the live one", () => {
  const live = [
    "## Goal",
    "Old goal.",
    "",
    "### Owner's pick: The footer",
    "- [ ] Two columns (Recommended)",
    "- [x] One column",
    "Applied: One column, in #90.",
    "",
    "### Owner's pick: Gone from the file",
    "- [x] Yes (Recommended)",
  ].join("\n");
  const file = [
    "## Goal",
    "New goal.",
    "",
    "### Owner's pick: The footer",
    "- [ ] Two columns (Recommended)",
    "- [ ] One column",
    "",
    "### Owner's pick: A new question",
    "- [ ] Yes (Recommended)",
    "- [ ] No",
    "",
    "## Evidence",
  ].join("\n");
  assert.equal(
    keepAnswers(file, live),
    [
      "## Goal",
      "New goal.",
      "",
      "### Owner's pick: The footer",
      "- [ ] Two columns (Recommended)",
      "- [x] One column",
      "Applied: One column, in #90.",
      "",
      "### Owner's pick: A new question",
      "- [ ] Yes (Recommended)",
      "- [ ] No",
      "",
      "## Evidence",
    ].join("\n"),
  );
  assert.equal(keepAnswers(file, null), file);
  assert.equal(keepAnswers(file, ""), file);
});

test("an answer the team applied in the body's file wins over the live body that hasn't it", () => {
  const live = [
    "### Owner's pick: The footer",
    "- [ ] Two columns (Recommended)",
    "- [x] One column",
  ].join("\n");
  const file = [
    "### Owner's pick: The footer",
    "- [ ] Two columns (Recommended)",
    "- [x] One column",
    "Applied: One column, in #90.",
  ].join("\n");
  assert.equal(keepAnswers(file, live), file);
  assert.deepEqual(unbuilt(ownerPicks(keepAnswers(file, live))[0]), []);
});

test("an option may carry indented lines of its own", () => {
  const [pick] = ownerPicks(
    [
      "### Owner's pick: The footer",
      "- [ ] Two columns (Recommended)",
      "  Reads faster on a wide screen.",
      "- [x] One column",
      "  Fits a phone.",
    ].join("\n"),
  );
  assert.deepEqual(texts(pick), ["Two columns (Recommended)", "One column"]);
  assert.deepEqual(unbuilt(pick), ["One column"]);
});

test("a checkbox nested under an option is part of it, not another option", () => {
  const [pick] = ownerPicks(
    [
      "### Owner's pick: The footer",
      "- [ ] Two columns (Recommended)",
      "  - [x] Needs the wider grid",
      "- [ ] One column",
    ].join("\n"),
  );
  assert.deepEqual(texts(pick), ["Two columns (Recommended)", "One column"]);
  assert.deepEqual(unbuilt(pick), []);
});
