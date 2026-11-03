## Sprint 50: the record you can check (Ra, M)

**Goal (from the roadmap):** the keel's record line is true and links to the Log that backs it.

**Contract:** `.crew/sprint/50/contract.md`, which builds Quill's `.crew/sprint/49/first-contract.md`
(R1 to R5) as written. Decisions: `.crew/sprint/50/decisions.md`. Iris's call: `link.md`.

### What changed

- **R1, sprint 36 reads Owner.** #91 changed `.github/workflows/ci.yml`, waited for the owner and
  was merged by him (`.crew/sprint/36/decisions.md` 11), but its retro's `outcome` lacked the
  `needs-owner` token `/log` reads. The outcome now starts `needs-owner: waits for the owner: …`.
  The rule (`lib/sprint-log.ts`, `e2e/retros.ts`) is unchanged. Of 48 rows on `/log`, only 36's
  Approved changes (Forge compared every row with production's).
- **R2:** the keel's line now reads "48 sprints merged: 34 on the checks alone, 14 on Ruslan's own
  call." (equal to `/log`, K12 unedited).
- **R3, the line links to its evidence.** Iris's call: the whole line is one ink link to
  `/log#every-revision` (`components/keel.tsx`, `.keel-record-link` in `app/globals.css`), an
  inline-block whose padding (cancelled by negative margins) gives a 27.5 px target at 1440 and
  44.5 to 64 px below 1024, with no box on the page moving. It inherits the site's one focus ring.
  Forge used a class rather than Iris's `.keel-record a` selector, which biome's
  noDescendingSpecificity refused.
- **R4, it can't drift again.** `.crew/sprint/32/merge-record.mjs` reads each merged squash
  commit's paths, matches them against its parent's CODEOWNERS with `scope.mjs`'s `codeowners`, and
  exits 1 naming the sprint, PR and path when a retro that touched an owner path reads as Gate.
  `--retros <ref>` reads retros from a ref (default `origin/main`), so a branch can be checked
  before it merges. Records are still written first. Tests: `owners-call.test.mjs`, 6 of 6.
  - With R1: `merge-record: approvals: every retro on HEAD (--retros) whose merge touched an owner
    path reads as the owner's call`, exit 0 (re-run by Atlas on the integrated head).
  - R1 reverted (the mutant): `sprint 36, #91, changed .github/workflows/ci.yml, … its retro's
    outcome has no "needs-owner"`, exit 1.
- **R5, a moment no longer moves the keel.** Root cause (Probe, on production): while a reader sits
  at `/crew#keel`, Chrome anchored scrolling inside the panel, so a poll that grew it moved the keel
  33 to 34.5 px (CLS 0.0488 at 390 × 664, over the phone budget); a stale cached page's first poll
  did the same, which was K11's red on 2026-11-03. Fix: `overflow-anchor: none` on `.crew`. The
  trade is in `decisions.md` 5.

### Checks

- New: R1 (`e2e/log-record.spec.ts`), R3 and R5 (`e2e/keel-ways.spec.ts`), each red on the branch
  before the build (R1: "Expected Owner, Received Gate" ×10; R3: no `a` in the line ×5; R5: h2#keel
  moved 34.5 / 34.5 / 33 px) and green on the head.
- **Rewritten for Lens: K6's keel link count** (`e2e/keel.spec.ts`). It pinned `${KEEL} a` to
  `RULES.length`; R3 adds a seventh link by design. It now lists every keel link by where it sits
  (`rule 1` … `rule 6` and `the record line: /log#every-revision`) and pins that list, so the total
  and each link's place are both pinned: the same strength. The pre-sprint K6 on a mutant build went
  red with "Expected 6, Received 7".
- **The contract mutant** (bare R1 and bare link, unedited suite, 345 tests): the only reds were K6,
  as expected, plus K6's 24 px target read on the bare unpadded link, which Iris's padding meets on
  the head. No other kept check went red.
- On the head: `keel`, `keel-ways` and `log-record` specs 32 passed (Probe); `keel-ways`, `keel`,
  `crew`, `crew-live`, `log-pick`, `log-record` 69 of 69 (Forge). `pnpm verify` exit 0 on the
  integrated head (Atlas).

### Budgets

- Script on `/crew`: 481,552 B in 8 files before and after (0 B new); `/` unchanged at 464,751 B.
- CLS 0 landing on `/log#every-revision` and at `/crew#keel` when a moment arrives (R3, R5, K11).
- Nothing new is copper (K6, K12).
- The full suite took 33.1 min at 2 workers locally, under load from other runs; CI's time is read
  on this PR against the 35-minute cap.

### Not verified

Safari and Firefox; https://ruslanshulga.com (production was read at theseus-portfolio.vercel.app);
a reader sitting mid-panel when a moment lands (no check reads that).

Nothing here touches an owner path or `content/`, and nothing waits for the owner.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvbaVs4YaugNMC4sMdg
