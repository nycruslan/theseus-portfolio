# Ka's contract: the keel on `/crew` (Quill, sprint 46)

**The outcome.** A hiring executive who scrolls `/crew` past the crew's table finds six rules the
crew builds under, in plain words. Each says what enforces it (GitHub, the gate check, Lens's
review, or only guidance), quotes its file word for word, and links to that line on GitHub. He can
tell at a glance which rails bind and which only guide, and check any of them in one click. Today
`/crew` names "Ruslan Shulga's rules" and shows none of them (`plan.md`).

## The copy (brief Iris, Forge and Probe's oracle with it word for word)

- **Heading:** "Keel". **Lead:** "The rules the crew builds under. The crew replaces the planks
  sprint by sprint; the keel stays. These rules live in files that are Ruslan's, so a change to any
  of them waits for his approval. Each is quoted from its file."
- **The six rules,** in this order: `plan.md`'s table, rows 1 to 6. Each rule has its sentence,
  its source path and its quote. The quotes are exact; the sentences are drafts, and Iris may tighten
  them without changing what they claim.
- **Enforcer labels, one per rule:**
  1. "Enforced by GitHub: the protect-main ruleset"
  2. and 3. "Enforced by the gate check"
  4. "Enforced by Lens's review"
  5. "Guidance only: a hook in each session, which a shell command can get around"
  6. "Guidance only: the crew's own merge script"
- **Matching a quote to its file** (the page and the oracle use the same rule):
  - split the file into lines;
  - strip each line's leading whitespace, then one leading `#`, `//` or `*` with the spaces after
    it;
  - join the lines with single spaces and collapse every run of whitespace to one space;
  - the quote is a substring of the result, starting on line `a` and ending on line `b`.
- **The link:** `https://github.com/nycruslan/theseus-portfolio/blob/<ref>/<path>#L<a>`, with
  `-L<b>` added when `b` ≠ `a`. `<ref>` is `VERCEL_GIT_COMMIT_SHA` when the build has it, else
  `main`.
- **On the page,** the quote's text is the quote without its backticks. Whether code words get a
  code face is Iris's call.

## Placement is Iris's call, made first

The options are (a) under the panel in the right column, (b) a full-width band under both columns,
or (c) better (`plan.md`, Ka). She also sets the quote's type and how "binds" and "guidance" differ
to the eye. The data rules hold whatever she picks:

- the keel is outside `section[aria-labelledby="crew"]` and after it in DOM order;
- it has no `h1`, no `[aria-live]`, no button and no client code.

## Checks (Probe writes them red first, in a new `e2e/keel.spec.ts`)

- **K1 Server-rendered.** In GET `/crew`'s HTML, and in the DOM with scripts off, at 1440 × 900 and
  390 × 844, on the default server and the live fixture: one `section[aria-labelledby="keel"]` in
  `main`, after the panel; `h2#keel` reading "Keel"; the lead; one `ol` of six `li[data-rule]` in
  the contract's order. Each `li` holds:
  - the sentence;
  - `[data-enforcer]` with its label;
  - a `blockquote` with the quote's text;
  - exactly one `a` to its source.
- **K2 The file's own words, at its line.** For each rule, the link matches the contract's pattern,
  and the checkout's file at `<path>`, read by the matching rule, contains the contract's quote
  starting on line `a` (and ending on `b`).
- **K3 A rule drops when its file loses its words** (a data test, as P2 is). `lib/keel.ts`'s rule
  function is run on fixtures:
  - a source without its quote drops that rule only;
  - a missing source drops its rules;
  - with none left, the section isn't rendered, so no empty heading.
- **K4 Every source is Ruslan's.** Each linked path is an owner path by `.github/CODEOWNERS`, read
  with `.crew/scope.mjs`'s `codeowners` (the last matching line wins). This keeps the lead true.
- **K5 Honest about what binds.** Rules 5 and 6 carry labels beginning "Guidance only", and no
  other rule does.
- **K6 It reads at every width and in every mode.** At 1440 × 900, 1536 × 715, 1024 × 768,
  390 × 664 and 320 × 568, light and dark:
  - axe with B4.24's strict tags is clean on `/crew`;
  - nothing scrolls sideways, on the page or inside a quote;
  - every keel link is a 24 px target;
  - scrolled into view and at rest on Full, the keel meets no `[data-model]` box, so the hull never
    covers it and its text stays LCD;
  - in forced colours and in print, every rule, quote and link shows;
  - nothing in it is copper (B1.6's rule).
- **K7 Nothing above it moves.** At 1440 × 900 and 390 × 844, on the default server and the live
  fixture, with WebGL refused:
  - `.crew-drawing`, the panel's `h1`, its `table` and `[data-rules]` have main's boxes within
    0.5 px. Probe records them from main and names the commit.
  - From 1024 wide, with the keel's `h2` scrolled to the viewport's middle, `.crew-drawing` is
    still stuck at the top: its top equals the sticky offset main sets, the bar's 72 px.
  - B1.8's CLS read is 0 at load at 1440 × 900 and 390 × 664.
- **K8 Fixed at build.** The quotes come from the build, not from the file system on request:
  `/crew` regenerates on the server, and `.crew/**/*.mjs` isn't traced (`plan.md`, "A build
  constraint"). Forge proves it in the PR, and Lens reads the code:
  - run `next start` on the build with the six source files moved away;
  - serve a feed answer that makes `/crew` regenerate;
  - the keel's HTML is unchanged.

**Rider (Probe):** W5's and W7's reads that assume the feed's down state stop running under
`PLAYWRIGHT_BASE_URL`: W5's comparison with main's boxes at 900, W7's forced-colours stroke read,
and its Calm and Off layout comparison. The rest of each keeps running there. On production on
2026-11-02 they went red on the live pencil, by design (`close.md`). CI never sets the variable, so
CI is unchanged. The PR names the added skip and its reason for Lens.

## Kept checks: all unedited

These are the viewports the `/crew` checks pin (`grep -n setViewportSize e2e/`, and each spec's
size lists):

- 1440 × 900 and 390 × 844: `crew`, `crew-hull`, `crew-model`, `crew-model-off`, `crew-motion`,
  `crew-live`, `crew-replay`, `crew-replay-hull` and `crew-bar`;
- 320 × 568, 768 × 1024 and 1024 × 768: `crew-control`;
- 1440, 1024, 390 and 320 wide at 900 tall: `crew-live`;
- 320 to 1440 wide: `crew-bar`'s bar.

`helpers.ts`'s ROUTES runs `invariants.spec.ts` on `/crew`: tokens, axe, 24 px targets and
overflow. Also unedited:

- `crew.spec.ts`: the panel's parts in order, the first `dl` in the panel, `h1`s exactly
  `["Crew"]`, and the script budgets at `:1396` and `:1402`;
- `crew-live.spec.ts`'s single `aria-live` in `main`, and its budget at `:1610`;
- `crew-replay.spec.ts`'s `#replay` jump and its budgets;
- B2.10 and W1 to W17.

Nothing is rewritten or retired except the rider's guard. A red kept check is a stop for Atlas, not
an edit.

## Budgets

| Budget | Check |
|---|---|
| 0 B of new script on `/crew` and `/` | `crew.spec.ts:1396`, `:1402`, B2.10, unedited; bytes before and after reported |
| CLS 0 on `/crew` | K7 |
| `/crew`'s LCP element unchanged | reported at 1440 × 900 and 390 × 664 |
| The 3D costs no more | `crew-model` cost reads, unedited |
| Nothing new is copper | K6 |
| CI under `check`'s 35 minutes | `keel.spec.ts`'s time and the suite's, reported |

## Out of scope

- The ways in from `/`, `/log` and the Approval line, and the tally: Kb.
- Changing any rule, or any owner path or `content/`. The build reads the six files and edits none.
- The panel's "Rules" (the feed's broadcast rules), `/crew`'s card and description, `/llms.txt`
  and `/api/me.json`.
- `/crew`'s foot row over its canvas: it rides only if Iris's placement touches the foot.

Nothing here waits for the owner. He may take the keel, or rule 6 alone, down after the merge.
