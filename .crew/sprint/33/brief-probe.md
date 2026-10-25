# Brief: Probe, sprint 33 (B5c's checks, red first)

**What it's for.** B5c puts the card model on `/log` and every `/log/<n>` as the ghost hull in
vellum, under the Full/Calm/Off control, with a plank opening its record. Your checks are how the
team, Lens and the owner know it does what the contract says, on every path a visitor takes.

**Your job.** Turn `.crew/sprint/33/contract.md` into Playwright checks in `e2e/`: B5.18 to B5.26,
and the rewrites its "The live checks" table lists (same assertions; none loosened, none
retired, no `test.skip(`). The data rules are in the contract word for word: your oracle
(`e2e/retros.ts` and friends) implements the same rule the page does. Read Iris's notes
(`.crew/sprint/33/notes-iris.md`, the colour bands and the pick) and Pixel's spike
(`.crew/sprint/33/spike-pixel.md`, the hooks a harness can read). Reuse the B3 harness
(`e2e/model.ts`, `e2e/webgl.ts`, `e2e/pixels.ts`, `e2e/pose.ts`) and `.crew/STATE.md`'s
"Specs" and "The browser" lessons (ratio-dependent reads at rest, `preserveDrawingBuffer`, text
over WebGL asserted by what it must do, not by its pixels).

Every new check must be red on today's code (or, if a check could pass on main, say which and
why). Push the specs first, before the build lands, so the builders can run them. A hook a check
needs from the page (a data attribute, a test switch) is named in your report for Pixel and Forge;
prefer hooks the B3 harness already reads.

**Setup:** `git worktree add -b probe/33 /home/user/wt-probe-33 origin/sprint/33-b5c-ghost-3d`;
`pnpm install --frozen-lockfile`; ports 4810 to 4819 (`PLAYWRIGHT_PORT=4811 pnpm test:e2e …`);
servers with node, killed by PID. Commit to `probe/33` and push after every commit
(`git push -u origin probe/33`); Atlas cherry-picks onto the sprint branch.

**Files you own:** `e2e/` and your memory. Not product code.

**Report:** the commits, each check's title with its red-on-main result, the hooks the builders
must provide, and anything in the contract that can't be checked as written.
