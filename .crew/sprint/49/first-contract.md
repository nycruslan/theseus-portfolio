# Ra's contract: the record you can check (Quill, sprint 49)

**The outcome.** A hiring executive on `/crew#keel` reads "N sprints merged: G on the checks alone,
O on Ruslan's own call". The numbers are true, and one click takes him to the Log that backs them.
There, every revision's Approved says what GitHub's gate really did. Today the line reads 47: 34 /
13, and the truth is 33 / 14. Sprint 36 (#91) changed `.github/workflows/ci.yml`, waited for
Ruslan's approval and was merged by him (`.crew/sprint/36/decisions.md` 11), yet `/log` and
`/log/36` say "Gate" (`close.md`, "Is the record line right?").

**The cause.** `/log`'s Approved column, the keel's line and Probe's oracle all read one rule:
`needs-owner` in the retro's `outcome` (`lib/sprint-log.ts:225`, `e2e/retros.ts:187`). Sprint 36's
outcome says "waits for the owner: …" without the token. The rule is right, and the record is
wrong. So the fix corrects the record and guards it. Neither rule changes, and K12 runs unedited.

## Checks

- **R1 Sprint 36 reads Owner.** On `/log` its row's Approved cell reads "Owner", and on `/log/36`
  the record's Approved reads "Owner". Both are server HTML, at 1440 × 900 and 390 × 844, scripts on
  and off.
  - The way to do it: `.crew/sprint/36/retro.json`'s `outcome` carries the token its PR carried
    ("needs-owner: waits for the owner: …"). That's one edit to a crew file, which Lens judges
    against `decisions.md` 11.
  - Every other row keeps its Approved. Probe's oracle (`e2e/retros.ts`) reads the corrected retro,
    so every Log check that reads Approved follows unedited.
  - R1 itself pins sprint 36 by number. It's a check of this fix, not a re-derivation of the rule.
- **R2 The keel's line is true.** `p[data-keel-record]` still equals `/log`'s Gate and Owner counts
  (K12, unedited).
  - On the PR's own build, with its own retro, it reads "49 sprints merged: 35 on the checks alone,
    14 on Ruslan's own call.", provided sprints 49 and 50 merge on the checks. Before Ra, once
    sprint 49 merges, production will read 48: 35 / 13.
  - The numbers in this bullet are a reading, not the check. K12's oracle is the check.
- **R3 The line links to its evidence.** The line holds exactly one `a`, to `/log#every-revision`
  (the Log's `h2#every-revision`). It's server HTML, scripts on and off, with the line's words
  unchanged (K12's `textContent`).
  - It's ink, never copper, at rest, hovered and focused (K6's and K12's paint reads cover it
    unedited).
  - It meets the keel's own target rule: at least 24 × 24 px from 1024 wide and 44 px tall below
    (K6's `smallLinks`, unedited).
  - Following it from `/crew#keel` at 1440 × 900 and 390 × 844 lands with `h2#every-revision`
    wholly in view under the bar, with CLS 0 (K11's measure).
- **R4 It can't drift again.** The step Atlas runs at every run's start
  (`node .crew/sprint/32/merge-record.mjs`, `.crew/STATE.md`) reads each merged sprint's squash
  commit. It already deepens a shallow clone for blame.
  - When a squash touched an owner path, by the CODEOWNERS of its parent read with
    `.crew/scope.mjs`'s `codeowners`, and the retro doesn't read as the owner's call, the step exits
    non-zero and names the sprint, the PR and the path.
  - It passes with R1's edit in the retro it reads.
  - With R1's edit reverted (the mutant), it fails naming "36, #91, .github/workflows/ci.yml".
  - The step reads retros from `origin/main` today, where R1's edit lands only at the merge. Forge
    shows both runs in the PR against the branch's retros, and says how.
  - This is the crew's tooling, not a page, so it's shown by its output in the PR, not in a browser.
    The 13 Owner sprints that touched no owner path stay Owner: the guard only refuses Gate.
- **R5 Rider (Probe): K11's deployed landing read.** On production on 2026-11-03, K11's scripts-on
  passes went red once, with a CLS of 0.006 to 0.022 after landing, and passed on a re-run
  (`close.md`). Find the cause first, on the live fixture: does a moment arriving while the reader
  sits at `#keel` move the keel?
  - **If it does,** that's a product defect: a reader sees the text move, and the rubric's phone
    budget says nothing shifts after load. Report it to Atlas with the measurement. Fixing it is
    Forge's only if it's a CSS rule, such as scroll anchoring on the panel. Otherwise it goes to the
    roadmap. K11 stays unedited either way.
  - **If it doesn't,** say what moved. Any guard added under `PLAYWRIGHT_BASE_URL` is a named skip
    for Lens, with its reason.

## Iris's call comes first, and it's small

Which words carry the link: the whole line, or "N sprints merged". She also makes sure its focus ring
is the site's ring and nothing new. Her open note on the ring around inline links stays parked: it
changes ring checks site-wide. Nothing on the page moves: K7's boxes and the keel's layout are
unedited.

## Kept checks

**The viewports the keel's checks pin** (`grep -n setViewportSize e2e/`, and each spec's size
lists):

- K1 and K7: 1440 × 900 and 390 × 844;
- K6: 1440 × 900, 1536 × 715, 1024 × 768, 390 × 664 and 320 × 568, light and dark;
- K11: 1440 × 900, 1536 × 715 and 390 × 664;
- B4.8: the default server and the live and open fixtures.

Ra places nothing near `/`'s title block and doesn't touch `/`.

**Checks that allowlist or count links in the keel:**

| Check | What it pins | With R3 |
|---|---|---|
| K6, `keel.spec.ts:952` | `${KEEL} a` count `toBe(RULES.length)` | **Red.** Rewritten by Probe with the same strength: six source links, one per rule, plus exactly one `a[href="/log#every-revision"]` in `p[data-keel-record]`. The PR names it for Lens. |
| K6's target, copper and print/forced-colours loops (`:953`, `:964`) | every `${KEEL} a` | Unedited. They now cover the new link too. |
| K1, `keel.spec.ts:261`, `:889` | exactly one `a` per `li[data-rule]` | Unedited. The line is outside the `li`s. |
| B4.8, `crew.spec.ts:931` | hrefs on `/crew`: the site's own `/…` allowed; exactly six blob links in the keel | Unedited. `/log#every-revision` is a site path, and the blob count stays six. |
| B4.13's Tab order, `crew.spec.ts:1193` | the stops up to Evidence's links | Unedited. The keel's links come after them. |
| K12, `keel-ways.spec.ts:615` | the line's text, place and paint, descendants included | Unedited. |
| invariants on `/crew` (`helpers.ts`'s ROUTES) | axe, tokens, 24 px targets, overflow | Unedited. |

**Before the build,** Probe runs the unedited suite on a scratch build carrying a bare version of R1
and R3 (the contract mutant, `.crew/STATE.md`, sprint 48's lesson). I expect one red, K6's count.
Any other red goes into the PR as a named rewrite before Forge's build is final.

## Budgets

| Budget | Check |
|---|---|
| 0 B of new script on `/crew` and `/` | B4.14's budgets and B2.10, unedited; bytes before and after reported |
| CLS 0 on `/crew` and on landing at `/log` | K7, K11 and R3 |
| Nothing new is copper | K6 and K12, unedited |
| `/` unchanged | W1 to W17, B4.22, P3 and P8, unedited |
| CI under 35 minutes | reported |

## Out of scope

- Changing the rule the Approved column reads, or Probe's oracle. The record is wrong, not the rule.
- A sentence per Owner revision saying what he decided, and a filtered view of his calls
  (`plan.md`).
- `.claude/skills/sprint/retro.md` (an owner path). Ra's retro proposes that it say `outcome`
  carries `needs-owner` whenever `gate` held the PR, since `/log` reads it.
- Iris's ring note, the 24 px bar, the LCD hand-off checks, `openHome` and `shownOn`, and the keel
  in `/llms.txt`, `/api/me.json` or a card.
- Any owner path, and `content/`.

Nothing here waits for the owner.
