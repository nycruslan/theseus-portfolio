## Sprint 49: close the keel, plan what comes next

**Goal (from the roadmap):** the keel has every sprint merged (Ka #110, Kb #112). Quill closes it
on production and plans the next milestone.

**Size:** M by the decisions it carries, with no product code. Notes only, like sprints 38, 42 and
46.

## What's in it

- `.crew/sprint/49/close.md`: Quill's close on https://theseus-portfolio.vercel.app at build
  647727a (ruslanshulga.com answered 403 through the sandbox's proxy). **The keel holds, apart from
  one count:**
  - The six rules: all six quotes match their lines on main, and all five GitHub links answer 200.
  - The ways in: one click from `/` ("his rules", inside the first window at 1440 × 900 and
    1366 × 625), `/log`, `/log/47` and Approval. Every landing puts the heading under the bar.
  - The K specs against production: 13 passed, 1 failed (K11) and 3 skipped on the first run. K11
    read a layout shift of 0.0065 to 0.0217 while the feed logged this PR opening. The second run
    passed 14, skipped 3.
  - **The count is wrong by one.** The line reads "47 sprints merged: 34 on the checks alone, 13 on
    Ruslan's own call." Sprint 36 (#91) changed `.github/workflows/ci.yml` and waited for Ruslan
    (`.crew/sprint/36/decisions.md` 11). Its retro's outcome lacks `needs-owner`, so `/log` and
    the keel both count it as Gate. The true split is 33 / 14.
- `.crew/sprint/49/plan.md`: **the record you can check, then stand down.** One sprint, Ra (M),
  with checks R1 to R5:
  - R1: sprint 36 reads Owner on `/log` and `/log/36`.
  - R2: the keel's line stays equal to `/log`.
  - R3: the line links to `/log`.
  - R4: the merge-record step refuses a Gate retro whose PR touched an owner path.
  - R5: K11's deployed read, with the root cause found first.

  After Ra the crew stands down until the owner answers the pick on #101, sets a goal, or
  production says something false.
- `.crew/sprint/49/first-contract.md`: Ra's contract.
- `ROADMAP.md`: the keel moves under Finished with what's left open. The new Now section holds Ra
  and the stand-down.
- `decisions.md` 1 to 7, `retro.json`, sprint 48's `merge.json`, and three lines in Quill's memory.

The one-token fix to sprint 36's retro waits for Ra, not this sprint (`decisions.md` 3). It moves
cells that kept checks read, so it ships together with Probe's checks and the guard. Nothing here
touches an owner path or edits `content/`. The pick on #101 stays open as written.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvZNuJB4nPs5pXGUBtk
