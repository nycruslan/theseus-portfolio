# Sprint 50's contract: the record you can check (Ra, M)

The contract is Quill's, written in sprint 49: `.crew/sprint/49/first-contract.md`, checks R1 to
R5, with its budgets, kept checks and out-of-scope list. This sprint builds it as written. Atlas's
notes on how it's run are in `decisions.md`.

**The outcome, in a sentence.** A hiring executive on `/crew#keel` reads "N sprints merged: G on the
checks alone, O on Ruslan's own call", the numbers are true (sprint 36 counts as Ruslan's call), and
one click on the line takes him to the Log's "Every revision" that backs them.

| Check | Who | What a visitor (or the crew) notices |
|---|---|---|
| R1 | Forge builds, Probe checks | Sprint 36 reads Owner on `/log` and `/log/36` |
| R2 | K12, unedited | The keel's line equals `/log`'s Gate and Owner counts |
| R3 | Iris calls the words, Forge builds, Probe checks | The line links to `/log#every-revision`, ink, 24 px, lands in view, CLS 0 |
| R4 | Forge | The merge-record step refuses a Gate retro whose PR touched an owner path |
| R5 | Probe | K11's deployed landing read: root cause first |

The one kept check rewritten: K6's link count (`e2e/keel.spec.ts`), by Probe, with the same
strength (six source links, one per rule, plus exactly one `/log#every-revision` link in the line).
