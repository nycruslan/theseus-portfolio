# Sprint 27 brief for Forge: the Full/Calm/Off control (Atlas)

## What this sprint is for, and for whom

B3's last build sprint. A hiring executive opens `/` and the loft plays, as today; in the bar a
small labelled control reads Full, Calm, Off. Whatever they press is what the page does, now and
on every later visit from that device; someone whose system asks for reduced motion finds Calm
pressed. The contract is `.crew/sprint/27/contract.md`: its data rules are what you build word for
word, and Probe's checks (B3.16 to B3.23, the B2.3 and keyboard rewrites) are what it's judged by.
The look is the owner-approved frame `.crew/sprint/17/design/motion-control.webp` and Iris's
sprint 22 notes, section 9 (`.crew/sprint/22/notes-iris.md`): an `inline-flex` group with a 1 px
ink border, `role="group" aria-label="Motion"`, three `<button aria-pressed>` 32 px tall, 44 on
phones, padding 0 12 (0 16 on phones), 14/600, 1 px ink dividers, pressed = ink ground, film text.
Desktop placement is `main.webp`'s: the bar's right end, after Read as page. The phone placement is
Iris's call, which Atlas relays mid-build; until then, a second row of the sticky bar below
1024 px, right-aligned.

## What you build, in this order

1. **The bytes, first, within the hour.** B2.10 holds `/`'s first-load script with WebGL refused
   within 2,048 B gzip of `/sprints'`, and the loader already takes 635 B. Write the store
   (`lib/motion.ts`) and the control (`components/motion-control.tsx`) as the smallest honest code
   (no dependency, one `useSyncExternalStore` each, the strings once), build, and measure what `/`
   fetches before `load` with WebGL refused against `/sprints` (your memory and
   `e2e/read.spec.ts`'s B2.10 have the method). Tell Atlas the number at once: if it can't fit,
   Atlas takes it to the owner and you don't widen anything quietly.
2. **The store and the control.** The mode rule word for word: `stored ?? (saveData ? "off" :
   reduce ? "calm" : "full")`, `localStorage["theseus:motion"]` inside try/catch, the hints followed
   live while nothing is stored, a press storing and applying at once, `disabled` Full and Calm
   with Off pressed when the `webgl2` probe is refused. The slot `[data-motion]` in the bar's `nav`
   after the four links, in the server's HTML at the group's size at every width (CLS 0; the page
   without scripts shows it empty); when scripts run it holds the group and carries `data-mode`.
   Targets 44 × 44 below 1024 px, 24 × 24 from it; the pressed state told apart without colour
   alone, with a forced-colours style (border or outline) and one ring per focused button
   (`e2e/keyboard.spec.ts`'s B2.9 is the rule; your memory has the `outline` lessons). Not printed.
3. **The loader and the mount.** `components/model.tsx` reads the store: Off never probes or
   imports; Calm mounts with `settled`; Full with `auto`; a press of Full from Calm or Off stops
   and mounts again with `loft`; Calm pressed mid-loft calls the mount's `settle()`; Off pressed
   calls `stop()`. In `lib/model/mount.ts`: `mount(host, seated, open)` with `open` as the contract
   says, returning `{ stop, settle }`; the reduced-motion `matchMedia` and its listener leave the
   mount (the store's reader does that work); `open()`'s rule becomes `open === "settled" || back ||
   (open === "auto" && played()) || !visible() || document.hidden`, and `loft` still sets the flag.
   Touch nothing else in the mount's state machine; it's subtle and B3.1 to B3.15 guard it.
4. **Riders.** In `lib/model/mount.ts`, `cross()` resets the ratio cap before its `!state` early
   return; `[data-model]` gets `overflow: clip` in "The model" section of `app/globals.css`; the
   stray JSDoc line above `cardGeometry` in `lib/model/stage.ts` goes (read Lens's four nits on
   #73 first: `gh api repos/nycruslan/theseus-portfolio/pulls/73/comments`). The fallback face: with
   the woff2 files refused (block them in your browser), the bar's four links stay on one row at
   390 and 320 and nothing scrolls sideways at 320 or 390 (Iris read the `.rev` table's
   `td[data-label]::before` labels as the likely cause of the 21 px: `.crew/sprint/26/review-iris.md`,
   "The fallback face"); fix the cause, not the symptom, in the bar's classes and "The revision
   table" section of `app/globals.css`.
5. **Iris's placement**, when Atlas relays it: the group's box, alignment and margins below
   1024 px, and anything she says about the empty slot and the pressed state in the dark scheme and
   forced colours. Serve your build on one of your ports and tell Atlas the URL as soon as the
   control works, so Iris can look early.

Nothing else: no change to `content/`, no edit to `e2e/`, no new dependency, nothing on `/read`,
`/sprints` or the 404.

## Files you own

`lib/motion.ts` (new), `components/motion-control.tsx` (new), `components/bar.tsx`,
`components/model.tsx`, `lib/model/mount.ts` (the open option, `settle`, the cap rider; nothing
else), `lib/model/stage.ts` (the one JSDoc line), and in `app/globals.css` a new "The motion
control" section plus the one `overflow: clip` line in "The model" and the fallback-face fix in
the bar's classes or "The revision table". Work in your own worktree from `sprint/27-motion-control`:
`git worktree add -b forge/27 /home/user/wt-forge-27 sprint/27-motion-control`, then `pnpm install
--frozen-lockfile` there. Your ports: 4730 to 4739; start servers with `node
node_modules/next/dist/bin/next start --port <n> &`, note the PID, check the port after `kill` and
kill the `next-server` child by its PID if it survives (`.crew/STATE.md`). Commit on `forge/27` in
small commits and **push the branch to origin after every commit** (`git push -u origin forge/27`):
Atlas cherry-picks from `origin/forge/27` as commits land.

Prove it: `pnpm verify` green; the model specs (`e2e/model-*.spec.ts`), `e2e/sheet.spec.ts`,
`e2e/keyboard.spec.ts`, `e2e/invariants.spec.ts` and `e2e/read.spec.ts` (B2.10) against your served
build with `PLAYWRIGHT_BASE_URL`, saying what's red and why (the B2.3 and keyboard rewrites land
from Probe's `origin/probe/27`; cherry-pick them into your worktree once Atlas says they're red
on main, and run Probe's `e2e/motion.spec.ts` as it lands). See it in a real browser: each mode
pressed at 1440 and 390, a reload after each, reduced motion emulated, scripts off, forced colours
(Playwright for that; agent-browser has no switch).

## Report

Outcome first. Then what's built, the commit shas in order (the bytes' first), the script-bytes
number against the budget, the checks run and their results (red ones with the assertion and the
number), what you did differently from the contract and why, the URL of your served build, and
what you couldn't verify. Then at most three memory lines in
`.claude/agent-memory/engineer/MEMORY.md` citing `.crew/sprint/27/`, committed in the worktree, and
the commit's sha.
