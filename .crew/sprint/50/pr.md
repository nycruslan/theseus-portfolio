## Sprint 50: the record you can check (Ra, M)

**Goal (from the roadmap):** the keel's record line is true and links to the Log that backs it.

**Contract:** `.crew/sprint/50/contract.md`, which builds Quill's `.crew/sprint/49/first-contract.md`
(R1 to R5) as written.

- R1: sprint 36 (#91) changed `.github/workflows/ci.yml`, waited for the owner and was merged by
  him, but its retro's `outcome` lacked the `needs-owner` token `/log` reads, so `/log` and the keel
  counted it as Gate. Its retro now carries the token (`.crew/sprint/36/decisions.md` 11).
- R2: the keel's line stays equal to `/log` (K12, unedited).
- R3: the line links to `/log#every-revision`.
- R4: the merge-record step refuses a Gate retro whose PR touched an owner path.
- R5: K11's deployed landing read, root cause first.

**Results:** in progress.

**Decisions:** `.crew/sprint/50/decisions.md`.

Nothing here touches an owner path or `content/`, and nothing waits for the owner.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvbaVs4YaugNMC4sMdg
