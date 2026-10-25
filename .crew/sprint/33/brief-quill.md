# Brief: Quill, sprint 33 (B5c contract)

**What it's for.** B5c is the last sprint of B5: on `/log` the card model stands in vellum, the 22
original planks numbered as the 2D ghost hull numbers them, under the Full/Calm/Off control in
`/log`'s bar; a pointer on a plank opens the record of the sprint that took it out; the table stays
the keyboard's way in. It is the archive moment the direction's novelty budget allows. The visitor
is the hiring executive who follows "All N revisions in the Log" (seconds to "this crew has a
record"), and the engineer who stays and shares a record.

**Your job.** Write `.crew/sprint/33/contract.md`, one page or so, ready for Probe to turn into
failing Playwright checks and for Pixel (3D) and Forge (the control in `/log`'s bar) to build.
Start from `.crew/sprint/29/b5-plan.md` ("B5c") and ground every check in the current code and a
measurement, not in the plan's words alone (`.crew/STATE.md`, "Contracts" and "Specs").

Read first: `.crew/STATE.md`; `.crew/sprint/29/b5-plan.md`; B3's contracts and decisions
(`.crew/sprint/25`, `26`, `27`: the loft, the phone budgets, the control); `.crew/sprint/30` and
`32` (`/log` today); `components/model.tsx`, `lib/model/*`, `components/log.tsx`,
`components/bar.tsx`, `app/log/page.tsx`; the specs `e2e/model-*.spec.ts`, `e2e/log*.spec.ts`,
`e2e/motion.spec.ts`, `e2e/invariants.spec.ts` (B2.10's script budget), `e2e/keyboard.spec.ts`.

What the contract must settle:
- The outcome in a sentence or two; numbered checks B5.17 onward (B5b ended at B5.16; confirm)
  that a visitor would notice: vellum planks and numbers equal the 2D rule (`e2e/retros.ts`'s
  oracle); Full opens with one camera move, Calm settled, Off is B5a's drawing with no WebGL;
  0 frames at rest; Off and hidden never request the chunk; a pick lands on the right record;
  the control in `/log`'s bar, remembered on the device as on `/` (one storage key or two? say
  which and why).
- Budgets: draws ≤ 8, triangles ≤ 30k desktop and 12k phones, the chunk ≤ 250 kB gzip as B3.6
  measures, and B2.10's script budget, whose baseline the plan moves from `/log` to the 404
  (measure it on today's main build and say the numbers).
- Which live checks it keeps unedited (B5a's and B5b's on the Off path with WebGL refused),
  which it rewrites with the same assertions (B2.3 for the control on `/log`), and anything that
  would be a weakened test (owner's approval, `gate`): avoid those where you can and name any.
- What's out of scope: `/crew` (B4, on #78, waiting for the owner; #78 re-lays the bar below 768
  and moves Read as page to the drawing's foot, so say how `/log`'s control below 768 must stand
  so that whichever of #78 and this PR merges second can keep both sides); the pencil row.
- Riders that touch `/log` or the loader and ride here (ROADMAP.md, B5b and B3 entries): Lens's
  nit on #82 (B5.16 checks records only to sprint 30: assert every `merge.json` on disk parses),
  Iris's two on #82 (the lines figure's rule stops at the text's width from 640 to 1023; link the
  commit hash), and Lens's nit on #74 (`onClick={() => refused || press(value)}`).
- Leave room for Iris's calls, which she's writing at the same time in
  `.crew/sprint/33/notes-iris.md` (the vellum in 3D, the numbers on planks, the camera move, the
  pick's affordance, the control's place on `/log`): name each as "Iris's call" in the contract
  and fold her notes in when they land (read the file before you finish). Pixel is spiking the
  mount on a second route at the same time; his findings land in `.crew/sprint/33/spike-pixel.md`.

**Files you own:** `.crew/sprint/33/contract.md`, and your memory. Don't edit code or specs. If you
need a build to measure, use your own worktree (`git worktree add /home/user/wt-quill-33 HEAD`,
`pnpm install --frozen-lockfile`) and ports 4840 to 4849; start servers with node and kill them by
PID.

**Report:** the contract's path, the checks in one line each, the measured numbers with how you
measured them, and any call you made that the owner or Iris should know. Don't commit; Atlas does.
