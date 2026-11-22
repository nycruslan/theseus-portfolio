## Sprint 82 (S): the Log gives sprint 40's real merge time

**Goal** (from the roadmap's stand-down defect condition, found by Probe's production sweep):
/log/40 says its pull request merged an hour before it did. It should give the time GitHub
records.

**Size:** S. **Decisions:** `.crew/sprint/82/decisions.md`.

### The defect

On production, /log/40's Date reads "1 Nov 2026, 08:03 UTC". GitHub says PR #99 merged at
2026-11-01T09:03:09Z. Its required `check` run finished at 09:02:55Z, so an 08:03 merge is
impossible. The squash commit's committer date, which `merge-record.mjs` takes as the merge time, was stamped
08:03:08Z across the US fall-back that night. It's the only one of 80 records with the wrong
minute.

### The change

- `.crew/sprint/40/merge.json`: `mergedAt` is `2026-11-01T09:03:09Z`, GitHub's `merged_at`.
- `.crew/sprint/32/merge-record.mjs`: a comment says the committer date failed once and how to
  check a record made across a clock change. Its behavior is unchanged.
- Riding along: sprint 81's merge record (`.crew/sprint/81/merge.json`), written by this run's
  pre-flight, and Probe's memory line on the finding.

### Results

- `gh api repos/nycruslan/theseus-portfolio/pulls/99 --jq .merged_at` → `2026-11-01T09:03:09Z`.
- The built /log/40 reads "1 Nov 2026, 09:03 UTC" (local `next start`, curl).
- `pnpm verify` passes. `e2e/log-dates.spec.ts`, `log-cards.spec.ts` and `log-record.spec.ts`:
  23 passed.
- Probe's sweep found nothing else that qualifies: no broken internal link or anchor, no blank
  image, no console error, no text cut or overlapped at the default font (83 of 84 loads clean,
  the 84th the ellipsis B1.5 calls for).

No check is retired or added. No owner path or `content/` is touched.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvZJVdmg2dva3A4F2i7
