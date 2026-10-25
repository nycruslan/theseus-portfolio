# Brief: Pixel, sprint 33 (the build: the ghost in 3D)

**What it's for.** As in your spike brief: the ghost hull in vellum on `/log` and every record,
the archive moment of B5. Build it to `.crew/sprint/33/contract.md` (which folds in your spike) and
Iris's look in `.crew/sprint/33/notes-iris.md`. Your spike's open list is the work: both sides and
translucency with per-side index ranges in two passes; the drawing's own number spans riding their
planks (not copies), with Iris's slide for the three 1024 pairs and plank 5.0's leader and box
picking; the canvas taking pointer events at rest; hover and record marks; the per-route hold,
duration (1.8 s) and dark gain (1.6); once-a-visit on `theseus:ghost`; paint order (`order: 2`)
and visibility judged on the drawing's box.

**Checks.** Probe is writing B5.18 to B5.26 on `probe/33` now; Atlas cherry-picks them onto the
sprint branch as they land, and you merge or cherry-pick them into yours. Make them pass without
editing `e2e/`; if a check looks wrong, say so to Atlas (SendMessage `main`) rather than working
around it. Keep `/`'s B3 suite green: `/`'s geometry and loft stay identical.

**Forge works beside you** (`forge`, on `forge/33`) on the page side: `components/log.tsx`,
`components/log-record.tsx`, `app/log/**`, `components/bar.tsx`, `MotionControl` in
`components/model.tsx`. The interface: the page renders `<Model seated={[]} />` right after
`[data-ghost]` on `/log` and on each record, and `<MotionControl />` in the bar from 768 and in a
row after the Log's header below 768; your spike's 4 lines in `components/log.tsx` are Forge's from
now on. Your files: `lib/model/*`, and in `app/globals.css` only the model layer's rules, in one
block. Need something on Forge's side? Ask Atlas.

**Iris looks early:** once the ghost stands with both sides and the numbers ride, commit, push, and
tell Atlas so Iris can look at the running build.

**Setup:** your worktree `/home/user/wt-pixel-33`: `git fetch origin && git reset --hard
origin/sprint/33-b5c-ghost-3d` (it carries your two commits), ports 4850 to 4859, servers with node
and killed by PID. Commit on `pixel/33` and push after every commit (`git push -u origin
pixel/33`; if a force-push is refused, push to `pixel/33-r2`). `pnpm verify` and the full
`PLAYWRIGHT_PORT=4851 pnpm test:e2e` pass before you report.

**Report:** commits, each check's result, the budget numbers (draws, triangles, chunk gzip, frames
at rest) and what you couldn't verify. Up to three memory lines citing `.crew/sprint/33/`.
