# Sprint 26 brief for Probe: the phone and tablet checks, failing first (Atlas)

## What this sprint is for

B3's second build sprint: the model runs at every width, registered on the drawing the page shows
(`.plan-wide` from 768 px, `.plan-narrow` below), with the phone level and the 1.5 cap below
768 px, the stepping rule, a still frame under 30 fps, and sprint 25's riders. The contract is
`.crew/sprint/26/contract.md`; its data rules change sprint 25's where they say so and are what the
page and your harness implement word for word. Its checks are yours: sprint 25's B3.1 to B3.9
widened as each says, and B3.11 to B3.15 new. Pixel builds in parallel from the first minute, so
your checks come first and fail on today's page.

Read before you write: the contract whole; your own B3 specs and `e2e/webgl.ts`, `e2e/model.ts`,
`e2e/pixels.ts` (your harness; `openModel` already takes `touch`, `cpu`, `dpr`, `clock`);
`.crew/sprint/24/spike/spike.md` S2, S4 and S5 for the phone numbers; `lib/hull-layouts.ts`
(`NARROW`: the narrow drawing's viewBox and scale; its profile is `.plan-narrow .ln-outline`);
`.crew/scope.mjs` (the gate counts `expect(` per e2e file: a rewrite ends with at least as many);
Lens's nits on #72 for B3.6, B3.7, B3.14 and B3.15 (`gh api repos/nycruslan/theseus-portfolio/pulls/72/comments`);
your memory.

## The work, in this order

1. **The B3.5 rewrite and B3.11** first (the width Off path goes; the level by width), pushed as
   soon as they're red, so Pixel builds against them.
2. **B3.1 to B3.4, B3.6 to B3.9** at the contract's new widths and cases, each as a case added to
   its test or a new test, titled by its number and what it asserts. B3.2's formula uses
   `G_NARROW`: copy its value into `e2e/model.ts` beside `GROW` (0.1 until Iris rules; Atlas sends
   you her value). B3.1's registration on the narrow drawing reads `.plan-narrow .ln-outline` and
   the narrow profile's columns from `NARROW` as `profile()` does from `WIDE`.
3. **B3.12 to B3.15**: the frame hog (an init script with its own `requestAnimationFrame` loop
   spinning for 40 ms a frame, armed at the first `landed` state), the touch drag, the forced-colours
   switch mid-visit (`emulateMedia({ forcedColors })`), the lost context through the handle your
   context wrapper keeps (`WEBGL_lose_context`). Add a B3.10 self-check for the hog if it needs one.
4. **The two nits in your own checks**: B3.7's scheme switch `toBe(1)`, B3.6's off-screen and
   hidden windows proven with a scheme switch inside each (0 frames while away, 1 once back).
5. **Which checks are red on main.** B3.11, B3.12 and B3.5's rewrite could pass on today's page
   only by accident; say which pass without the build and why. A check that can pass without the
   change needs a mutant once the build exists (`.claude/agent-memory/qa-engineer/MEMORY.md` has the
   recipe), and only then.

Hooks you may rely on: `[data-model]`, its `data-state`, its one canvas, `.plan-wide`,
`.plan-narrow`, `.ln-outline`, `[data-plank]`, `data-sprint`, `.plan-plank`, `.ln-leader`. No new
hook: the stepping shows in the canvas's buffer size per frame (record `canvas.width` with each
frame in your wrapper if you need it), the level in the triangles submitted.

## Files you own

`e2e/**` only. Work in your own worktree from `sprint/26-phones`:
`git worktree add -b probe/26 /home/user/wt-probe-26 sprint/26-phones`, then
`pnpm install --frozen-lockfile` there. Your ports: 4710 to 4719 (`PLAYWRIGHT_PORT=<yours>`; serve
your own build for fast iteration, your memory). Commit on `probe/26` in small commits and **push
the branch to origin after every commit** (`git push -u origin probe/26`): Atlas cherry-picks from
`origin/probe/26` as commits land. Don't touch `app/`, `components/`, `lib/` or the notes.

## Report

Outcome first. Then the list of tests by file with the red run's output on today's page, which
pass on main and why, the `expect(` count per rewritten file before and after, the commit shas (the
B3.5 rewrite's first), what you did differently from the contract and why, and what you couldn't
check (SwiftShader's numbers are floors; say so). Then at most three memory lines in
`.claude/agent-memory/qa-engineer/MEMORY.md` citing `.crew/sprint/26/`, committed in the worktree,
and the commit's sha.
