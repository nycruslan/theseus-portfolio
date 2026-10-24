# Sprint 30 brief for Forge: `/log`, the ghost hull in 2D, and a record per revision (Atlas)

## What this sprint is for, and for whom

B5a. A hiring executive who follows Log, or an old `/sprints` link, lands on `/log` and sees in
the first screen what the crew has done: "Log", the ghost hull (the ship's 22 original planks in
vellum, each numbered by the first sprint that took it out; complete since sprint 23), the line
"All 22 original planks are out: the last went with sprint 23. Since then the crew has replaced
4 planks of its own.", and "Every revision" as a table of every merged sprint: who drew, checked,
tested and approved each. An engineer opens a revision's number and gets `/log/<n>`, the same
page with the record open: the pull request, the plank it seated and what it replaced, what went
wrong in the crew's words; Back or Close returns to the Log. All of it reads without JavaScript
or WebGL, and nothing moves or is copper.

The contract is `.crew/sprint/29/b5-first-contract.md`: its data rules are what you build word for
word (the record set, the seat, the ghost hull, the Log's header, Every revision, the record, the
plank's words, the bar, the site's links, the metadata), its build notes are for you, and Probe's
checks B5.1 to B5.11 are what it's judged by. The look is the owner-approved frames
`.crew/sprint/17/design/log-1440.webp` and `log-390.webp` and the sheet as shipped (`/` on
production); the plan behind the contract is `.crew/sprint/29/b5-plan.md`. Iris's three calls
(the ghost's composition and `--vellum`, the record's place, the lede and an Approved key) come
mid-build: Atlas relays them. Until then build to the placeholders below, in a shape where her
numbers are a CSS change.

## What you build, in this order

1. **The route pair and the redirect, within the hour.** `next.config.ts`: `redirects()` sending
   `/sprints` to `/log` permanently (308; Quill measured it in a scratch build of main).
   `app/log/page.tsx` and `app/log/[n]/page.tsx`, one shared page component (`components/log.tsx`
   or under `app/log/`) rendered with or without a record; `generateStaticParams` from
   `readSprintLog()`; an unknown `n` (`16`, `0`, `999`, `abc`, `013`, a folder with no retro)
   calls `notFound()` so the site's 404 answers (`dynamicParams` isn't available under
   `cacheComponents`; Quill's scratch build passed `ensureStatic` with the fallback calling
   `notFound()`). `app/sprints/` goes, with `components/sprint-entry.tsx` (knip would flag it).
   The metadata as the contract's "Metadata": `/log`'s title "Log — {profile.name}" and the given
   description, `/log/<n>`'s "Revision {n} — Log — {profile.name}" with the goal; canonical and
   `og:url`; `app/log/opengraph-image.tsx` re-exporting the site's card as `app/sprints/` did, and
   check in the built HTML that each record serves one `og:image` and one `twitter:image` too (a
   nested segment may need its own re-export). The sitemap lists `/`, `/read`, `/log` and each
   `/log/<n>`. Tell Atlas when `/log` answers.
2. **The bar.** `components/bar.tsx` gets a Log variant: the wordmark as `a[href="/"]`, Work
   `/#work`, Log `/log` with `aria-current="page"` on `/log` and `"true"` on a record, Contact
   `/#contact`, Read as page `/read`; no control, no button. **The control's client chunk must not
   reach `/log`:** today the bar imports `MotionControl` from `components/model.tsx`, so make the
   control a slot the sheet passes in (`control?: ReactNode` from `app/page.tsx`) or split the
   module; B5.10 wants `/log` and the records to request exactly the 404's script files and
   bytes. On `/` the bar is unchanged except Log's `href`. Targets as today: 44 px tall below
   1024, 24 from it; the wordmark link needs the same.
3. **The ghost hull.** In `lib/lines-plan.ts`, beside `seatPlanks` and without changing it or
   anything `/` draws (B1.4 runs unedited): `ghostPlanks(merged)`, each seat's **first** holder,
   and a ghost pass of `draw` producing a plan whose planks are only the seats with a holder,
   each `path[data-plank="<k.j>"][data-sprint="<first holder>"]` of class `plank-ghost` filled
   with `var(--vellum)`, and no path at a gap; the hull's outline drawn; lettering for each
   plank's number as the lines plan sets it (inside the plank or led out as 5.0 is), shown from
   768 px. Render it in `components/lines-plan.tsx` (a `view="ghost"`) inside `[data-ghost]`
   with `aria-hidden="true"` and `pointer-events: none`, as `[data-plan]` is; nothing in it
   focusable or hit; at most 32,768 B of HTML. **Placeholder until Iris rules:** the profile and
   the half-breadth plan (the `NARROW` layout, numbered, as `/read` draws) at every width, the
   drawing left and the header right from 1024 as the frame lays it out, stacked below.
   `--vellum` on `:root` in both schemes and in the forced-colours block: placeholder light
   `#cfdcdc` at 0.7 over the film (Iris's sprint 22 notes, section 5; composite it to a hex), a
   dark value you derive the same way from the dark `--card-old`, with the numbers' ink at 4.5:1
   over it in both schemes (B5.4 composites over `--background`). In forced colours each plank's
   edge must show (a stroke, not a fill). `data-current` on the ghost plank at n's seat on
   `/log/<n>` (none on `/log`): placeholder a 2 px ink edge.
4. **The Log's header, the table and the record.** In `main`, first the `h1` "Log", then
   `p[data-ghost-caption]` and `p[data-ghost-count]` with the contract's words (k ≥ 22 and the
   fixture-only k < 22 branch both). Then, on a record, `section[aria-labelledby="record"]`
   (first in the DOM after the header; its place by CSS is Iris's call: placeholder the frame's
   right column beside the table from 1024, and after the header before the drawing below it);
   then `section[aria-labelledby="every-revision"]` with the lede ("A crew of AI agents rebuilds
   this site one sprint at a time. {k} revisions, newest first: choose one to open its record.")
   and the table: thead Rev, Description, Drawn, Checked, Tested, Approved; one row per merged
   sprint, newest first; `th[scope="row"]` holding `a[href="/log/<n>"]` named "Revision {n}" with
   "Revision " visually hidden; the cells from `components/revisions.tsx`'s `signatures` (export
   and share it, so `/` and `/log` can't disagree); Description whole, never cut; row n's link
   `aria-current="page"` on its record. The record: `p` "Rev {n}", `h2#record` the goal, the `dl`
   in the contract's order (Drawn, Checked, Tested, Approved, Size, Pull request as a link to
   `https://github.com/nycruslan/theseus-portfolio/pull/{pr}` in `--foreground` at least 24 px
   tall, Plank), the `h3` "What went wrong, in the crew's words" with its `ul` only when there are
   items, and the links Close ("Close revision {n}", to `/log`), "Rev {previous}" and "Rev {next}"
   by merged order, each left out at its end. The plank's words exactly as the contract gives
   them (its three examples are the test). Below 1024 the table folds under its number as `/`'s
   `.rev` does (placeholder; Iris may change the fold). Heads in the display face as the frame
   draws "Log" and "Every revision"; everything else the text face; B5.10 wants exactly two
   woff2 files on `/log`. Headings: one `h1`, the record's `h2` and `h3`, then the `h2` "Every
   revision"; each section a region named by its heading.
5. **The site's links and the comments.** Every `href="/sprints"` becomes `/log`: the bar,
   `components/revisions.tsx`'s "All {k} revisions in the Log", `app/read/page.tsx`'s "the Log".
   The comments that name `/sprints` (`app/globals.css` line 1248, `app/fonts.ts`,
   `app/not-found.tsx`, `app/layout.tsx`, `components/model.tsx`) say `/log`; and Lens's nit on
   #67, the focus-ring comment in `app/globals.css` that cites the deleted card link, is fixed in
   passing (find it: `gh api repos/nycruslan/theseus-portfolio/pulls/67/comments`).
6. **Iris's calls**, when Atlas relays them: the ghost's views and scale per width, the vellum
   values and edge, the `data-current` style, the record's box and place, the lede and an
   Approved key, the fold. Serve your build on one of your ports and tell Atlas the URL as soon
   as `/log` and a record render, so Iris can look early.

Nothing else: no change to `content/` (the pages use `profile.name` and nothing else of it), no
edit to `e2e/`, no new dependency, nothing on `/` beyond the bar's slot and Log's `href`, nothing
in `lib/model/`.

## Files you own

`app/log/**` (new), `app/sprints/**` (deleted), `components/log*.tsx` (new),
`components/sprint-entry.tsx` (deleted), `components/bar.tsx`, `components/revisions.tsx`,
`components/lines-plan.tsx`, `lib/lines-plan.ts` (the ghost pass only), `lib/sprint-log.ts` (only
if the record needs a field the reader doesn't expose; the reader's rules C12 don't change),
`next.config.ts`, `app/sitemap.ts`, `app/page.tsx` (the control slot), `app/read/page.tsx` (the
link), `app/globals.css` (new sections "The ghost hull", "The log" and "The record", the
`--vellum` token, the comments), and the one-line comments in `app/fonts.ts`, `app/not-found.tsx`,
`app/layout.tsx` and `components/model.tsx`. Work in your own worktree from `sprint/30-b5a-log`:
`git worktree add -b forge/30 /home/user/wt-forge-30 sprint/30-b5a-log`, then `pnpm install
--frozen-lockfile` there. Your ports: 4730 to 4739; start servers with `node
node_modules/next/dist/bin/next start --port <n> &`, note the PID, check the port after `kill`
and kill the `next-server` child by its PID if it survives (`.crew/STATE.md`). Commit on
`forge/30` in small commits and **push the branch to origin after every commit** (`git push -u
origin forge/30`): Atlas cherry-picks from `origin/forge/30` as commits land.

Prove it: `pnpm verify` green; `/sprints` answering 308 with `Location: /log` (curl, no redirect
followed); `/log/16`, `/log/0`, `/log/999`, `/log/abc` and `/log/013` answering 404 with the
site's not-found page; the script files `/log`, `/log/13` and the newest record request against
the 404's (the method in `e2e/read.spec.ts`'s B2.10: decoded bodies); `e2e/sheet.spec.ts`,
`e2e/keyboard.spec.ts`, `e2e/invariants.spec.ts`, `e2e/read.spec.ts`, `e2e/plan.spec.ts` and the
model specs against your served build with `PLAYWRIGHT_BASE_URL`, saying what's red and why (the
rewrites land from Probe's `origin/probe/30`; cherry-pick them into your worktree once Atlas says
they're pushed, and run Probe's `e2e/log*.spec.ts` as they land). See it in a real browser: `/log`
and a record at 320, 390, 768, 1024 and 1440 in both schemes, scripts off, forced colours
(Playwright for that), and Back from a record.

## Report

Outcome first. Then what's built, the commit shas in order (the routes' first), the script-bytes
number against the 404's, the checks run and their results (red ones with the assertion and the
number), what you did differently from the contract and why, the URL of your served build, and
what you couldn't verify. Then at most three memory lines in
`.claude/agent-memory/engineer/MEMORY.md` citing `.crew/sprint/30/`, committed in the worktree,
and the commit's sha.
