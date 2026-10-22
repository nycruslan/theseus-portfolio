# Sprint 24 decisions (Atlas)

1. **The Next upgrade is done, outside a sprint.** PR #69 (`fix/next-16.4.2`, merged by the owner on
   2026-10-22 at 23:20 UTC) moved `next` from 16.4.0 to 16.4.2 for three advisories, changing only
   `package.json` and the lockfile. The roadmap's "Next upgrade (S)" is ticked with it at this
   sprint's close-out. A fresh checkout's startup hook installed 16.4.0 from the PR #67 head it was
   provisioned on; `pnpm install --frozen-lockfile` on main gives 16.4.2.

2. **The revision block does not grow a row per sprint.** `components/revisions.tsx` shows
   `entries.slice(0, 5)`, and B1.1 asserts exactly five rows at 1440 × 900. The roadmap's and
   `.crew/STATE.md`'s premise ("one more row puts the contact links below the fold") was wrong.
   Measured on main's build at 1440 × 900 (`.crew/sprint/24/measure.md`): the block is 362.4 px tall;
   its description column is 466 px wide at 13 px, about 80 characters a line; sprint 23's 77-character
   goal is one line (row 31.9 px) and the goals of sprints 22, 21, 20 and 19 (87 to 99 characters)
   are two lines each (48.8 px); the title block's contact links end at 892.7 px, 7.3 px above the
   fold. So the block's height moves 16.9 px for each of the five goals that wraps, and B1.1 goes red
   only when all five do. Sprint 24's row replaces sprint 19's two-line row: with a one-line goal
   the block shrinks 16.9 px, and the margin becomes about 24 px. Five two-line rows can't happen
   before sprint 28 while sprint 23's one-line row is among the five.

3. **How the block holds its height (the call the roadmap gave Quill and Iris).** Two honest options:
   Iris's canvas note (`.crew/sprint/22/notes-iris.md`, section 8: one line, `text-overflow:
   ellipsis`, the full goal in the Log), which sprint 22's contract overruled ("never truncated",
   `decisions.md` 3.6) and which B1.5's "truncated cells" assertion guards, so taking it changes a
   check and needs the owner; or the full text kept with the retro's goal held to one line at 1440
   (at most 78 characters), which needs no code and no owner. Atlas's call for now: the second,
   recorded as a rule in `.crew/STATE.md` (the retro.md rule is the owner's to change, proposed in
   the retro). Quill's view from the visitor's side is in her report (`b3-plan.md`); the one-liner
   stays a proposal for the next PR that waits for the owner, so a taste call doesn't cost its own
   approval round. It isn't the blocker the roadmap said it was, so B3 starts now.

4. **Sprint 24 is B3's spike, not a build.** B3 is "the 3D card model and the registered loft" in one
   roadmap line, with an open stack decision (research section D: the direction's WebGPU stack is
   about 245 KiB gzip before GSAP, over the 250 KB budget as gzip; WebGL about 136 KiB) and a
   30 fps phone budget the cloud can't measure. Sprints 7 and 9 spiked before 8 and 10 built, and
   each measured contract took one Lens round against the unspiked draft's three (`.crew/STATE.md`).
   So Pixel measures (contract S1 to S7) and Quill turns B3 into sprints with the first build
   contract drafted; the owner takes the stack call at the B3 demo as the roadmap says. Iris joins
   from the first build sprint, beside Pixel on the loft's feel, as the direction asks; a spike of
   measurements doesn't need her turns.

5. **No product code this sprint.** The spike lives in `.crew/sprint/24/spike/`; `three` is added
   only in Pixel's measurement worktree and not committed, so `package.json`, knip and the lockfile
   are untouched and `pnpm verify` and the suite run as on main. The first build sprint adds the
   dependency with the code that uses it.
