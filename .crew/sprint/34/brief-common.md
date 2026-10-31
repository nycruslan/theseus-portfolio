# Sprint 34 (B4b): what every role reads first (Atlas)

**What it's for.** A hiring executive lands on `/` and has seconds. B4b adds one fact to the sheet
they already read: this site is being rebuilt right now, or was recently, by a crew, and the owner
signs each plank off (`PRODUCT.md`, belief 2). Nothing on `/` says so today.

**The outcome** (the plan, `.crew/sprint/28/b4-plan.md`, "B4.2 (M): the live layer on `/`", and its
four-state table near the top): on `/`, from the same feed `/crew` reads (`lib/crew-feed.ts`):
- in progress (`live` or `open`): the next seat in the shipwright's order is a pencil plank (hatch
  fill, graphite dashed edge, the sprint's number) on the 2D drawing and on the 3D hull, and its
  row leads the revision block, linking to `/crew`; the revision block stays five rows;
- `live` only: the plank has a copper tip and the row says "drawing now" in copper;
- `open`: no copper; the row's Approved says the run waits for the owner;
- `resting`: the rest line names the last plank seated and its merge time;
- the legend gains the pencil and copper swatches only while they're on the drawing;
- `down` (no feed, bad or stale answer): `/` is today's sheet exactly.
`/` loads no new client code. Replay (B4e) and `/crew` live in the browser (B4c) are out of scope.

**Read:** `.crew/sprint/34/decisions.md` (the Forge/Pixel interface is item 4: the pencil plank is
the drawing's `path[data-plank]` with `data-pencil`, `data-sprint` = the in-progress sprint, and
`data-live` while live); `.crew/sprint/31/contract.md` (B4a's data rules and four states, which B4b
reuses word for word, and its fixture harness); `.crew/sprint/28/feed-contract.md`; the direction
`.crew/sprint/17/direction-iris.md` and the frames `main.webp`, `rest-1440.webp`, `rest-390.webp`,
`crew-1440.webp` in `.crew/sprint/17/design/`; `.crew/STATE.md`; your own memory.

**Facts measured by Atlas this run:** production's `/crew` reads the real feed, now resting ("Crew
resting. Sprint 31 merged 31 Oct, 01:50 UTC."). B2.10 on `/` has 9 B of script headroom. The
contract's checks are numbered from B4.15 (B4a used B4.1 to B4.14).

**Working:** your own worktree and port range (decisions item 5), commit and push your branch after
every commit, and tell Atlas (SendMessage to `main`) the commit when something lands that another
role needs. Bash descriptions say what a command does, never the command. Finish with the report
`CLAUDE.md` asks for.
