# Brief: Forge, sprint 33 (the page side of B5c)

**What it's for.** B5c puts the card model on `/log` and on every `/log/<n>` as the ghost hull in
vellum, under the Full/Calm/Off control. Pixel builds the 3D in the chunk; you make the pages
carry it. Read `.crew/sprint/33/contract.md` (B5.18, B5.22, B5.25, B5.26 and the "live checks"
table are mostly yours), Iris's notes `.crew/sprint/33/notes-iris.md` (call 5, the control's
place, with the CSS for both merge orders with #78) and Pixel's spike `.crew/sprint/33/spike-pixel.md`.

**The work.**
- `<Model seated={[]} />` right after `[data-ghost]` on `/log` (Pixel's spike already added it in
  `components/log.tsx`; it's yours now) and on each record (`components/log-record.tsx`,
  `app/log/[n]`).
- `<MotionControl />` in the bar from 768 on `/log` and the records exactly as on `/`, and below 768
  in a row right after the Log's header, 12 px under the lines figure, buttons at the right. #78
  (waiting for the owner) puts a `<Foot />` in that place below 768; leave the row shaped so that
  whichever PR merges second can make it `<Foot control={<MotionControl />} />` (Iris's notes).
- Lens's nit on #74: with WebGL refused, pressing the already-pressed Off stores nothing
  (`onClick={() => refused || press(value)}`). The loader must stay within B2.10's 10 B.
- Iris's rider on #82: from 640 to 1023 px the lines figure's rule is as wide as the header's
  column.
- No client code beyond the existing loader: `/log` with WebGL refused loads exactly `/`'s files.

**Checks.** Probe is writing them on `probe/33`; Atlas cherry-picks them onto the sprint branch as
they land; merge or cherry-pick them into yours. Don't edit `e2e/`; a check that looks wrong goes to
Atlas (SendMessage `main`).

**Your files:** `components/log.tsx`, `components/log-record.tsx`, `app/log/**`,
`components/bar.tsx`, `MotionControl` in `components/model.tsx`, and in `app/globals.css` only the
Log's header and the control's row, in one block. Pixel (`pixel/33`) owns `lib/model/*` and the
model layer's CSS.

**Setup:** `git worktree add -b forge/33 /home/user/wt-forge-33 origin/sprint/33-b5c-ghost-3d`;
`pnpm install --frozen-lockfile`; ports 4830 to 4839; servers with node, killed by PID. Push after
every commit (`git push -u origin forge/33`). `pnpm verify` and the e2e specs your files touch pass
before you report (the full suite once Pixel's work is in, which Atlas runs).

**Report:** commits, the checks' results, the loader's byte change, what you couldn't verify. Up to
three memory lines citing `.crew/sprint/33/`.
