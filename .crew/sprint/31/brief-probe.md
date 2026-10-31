# Sprint 31 brief for Probe: the crew page's checks, failing first (Atlas)

## What this sprint is for

B4a (the plan's B4.1): `/crew`, the crew at work, from the Studio's feed, server-rendered with no
client code; the Crew link in the bar on every page; below 768 px Read as page moves from the bar
to the drawing's foot on `/`. Four states from the feed: live, open (not live), resting, and down
(`.crew/sprint/28/b4-plan.md`, "The four states, and the honest rest", and its B4.1 section,
"Checks it adds" and "Live checks it must keep or rewrite": read both whole). The feed's shape is
`.crew/sprint/28/feed-contract.md`, approved by the owner today; nothing in the cloud can reach the
real feed (the proxy allows the Studio's `/api/ingest` and nothing else), so every check runs on
fixtures of that shape, and the down state on the default test server, which has no
`CREW_FEED_URL`. Quill's contract, `.crew/sprint/31/contract.md`, lands within about ninety
minutes with the checks numbered B4.1 to B4.n and the copy word for word; Forge builds in
parallel from the first minute, so your fixtures, harness and first checks come first and fail on
today's site (`/crew` is a 404 there).

Read before you write: the plan's B4.1 section and the feed contract; `e2e/helpers.ts` (`ROUTES`,
`STATUS`, `measureLcp`), `e2e/sheet.spec.ts`'s two B2.3 tests, `e2e/keyboard.spec.ts`'s "15th Tab
stop" test and `tabUntil`, `e2e/read.spec.ts`'s B2.10, `e2e/invariants.spec.ts` and
`e2e/content.spec.ts` where they loop over `ROUTES`, `e2e/smoke.spec.ts`'s B2.11 (the sitemap),
`playwright.config.ts` (one `webServer`; a second is an owner path, so your spec starts its own),
`.crew/scope.mjs` (a rewrite ends with at least as many `expect(` per file), and your memory. Also
#77's versions of the tests you rewrite (`git show origin/sprint/30-b5a-log -- e2e/sheet.spec.ts
e2e/keyboard.spec.ts e2e/helpers.ts e2e/read.spec.ts e2e/invariants.spec.ts e2e/content.spec.ts`):
#77 (B5a, `/log`) waits for the owner and will merge before or after this PR, so keep your edits
additive (new entries, new tests, the same assertions) and know the merge target
(`.crew/sprint/31/decisions.md`, 4).

## The work, in this order

1. **The fixtures and the server, pushed first.** `e2e/fixtures/crew/live.json`, `open.json`
   (`current.live` false, `health.state` "waiting") and `resting.json` (`current` null) in the
   contract's shape, with its seven roles on `current` and `last`, moments of every kind the
   contract allows, and inside the live fixture the edge cases the checks need: a moment whose
   `text` carries markup (`<b>` and an entity), an unknown moment kind and an unknown role (to be
   dropped), and a `pr.url` that is not a GitHub PR page of this repository in one of the
   fixtures (not linked). A small fixture server (`e2e/crew-feed.ts`, node's `http`, no
   dependency) that serves a chosen fixture as `GET /api/crew` with the contract's headers, can
   switch state while running (a control endpoint or a file it re-reads), can answer 503 and can
   answer with a stale `asOf`. Then the harness: your spec starts the fixture server and its own
   `next start` on a free port with `CREW_FEED_URL` pointed at it (`node
   node_modules/next/dist/bin/next start --port <n>`, the PID kept and killed in teardown; in CI
   `.next` is prebuilt without the variable, so the state reaches the page only as the read's
   cache revalidates: Forge is measuring exactly how and Atlas sends you the result; until then
   assume a poll of up to about 40 s until the expected state shows, and name the wait in the
   test). Push a check of the harness itself first (the live fixture reaches `/crew`), as your
   memory's lesson says for browser-sensitive work.
2. **The rewrites with the same assertions:** B2.3's two tests over five links (Work, Crew, Log,
   Contact, Read as page; Crew lands on `/crew`'s `h1`; Read as page right-most at 1440; below
   768 Read as page is in `main` at the drawing's foot beside the control, as `rest-390.webp`
   draws it, a 44 px target; keep the C-numbers and B-numbers in the titles); keyboard's Contact
   test becomes the 16th stop with Crew after Work and `tabUntil`'s bound 16; `ROUTES` gains
   `/crew` at 200 with the loops' titles naming it; B2.10's list gains `/crew` (within 2,048 B of
   `/sprints'`, decoded bodies). Say which of these could pass on main by accident.
3. **The new checks, B4.1 to B4.n** as the contract numbers them, in `e2e/crew.spec.ts` (the
   fixture states, the harness) and, if it grows past about 1,200 lines, `e2e/crew-bar.spec.ts`
   for the bar: the three fixture states and what each shows; the down state on the default
   server (and from the fixture server answering 503 and a stale `asOf`); the four state words
   and copper only on Working rows and the live now line (read the computed colour against
   `--accent`); times in UTC as `HH:MM`; the markup shown as text; unknown kinds and roles
   absent; the non-GitHub URL not linked; Close and Back returning to `/`; at 768 five links and
   the control on one line; the route sweeps on `/crew` with the same assertions the `ROUTES`
   loops make; LCP text within 2,500 ms at 4× CPU; the script bytes.
4. **The hooks you may rely on**, and no other, until the contract says more: `header` with
   `nav[aria-label="Main"]` and its five links; `main#main` with `[data-plan]` (the drawing) and
   `section[aria-labelledby="crew"]` (the panel, `h1#crew` "Crew"); `[data-crew-state]` on the
   panel with `live`, `open`, `resting` or `down`; `a[data-close]` to `/`; `[data-chip]` and the
   goal; `table` with seven `tr` in roster order, each `th[scope="row"]` the name and
   `td[data-state]`; `[data-now]` the now line; `ol[data-moments] li` with `time[datetime]`;
   `[data-evidence]`, `[data-approval]`, `[data-rules]`. Atlas sends you the contract's final
   hooks and Iris's words as they land.
5. **Which checks are red on main.** Every B4 check should be red on today's site. Say which of
   the rewrites could pass by accident, and which assertion is red where it isn't. A check that
   can pass without the change needs a mutant once the build exists, and only then.

## Files you own

`e2e/**` only. Work in your own worktree from `sprint/31-b4a-crew`:
`git worktree add -b probe/31 /home/user/wt-probe-31 sprint/31-b4a-crew`, then
`pnpm install --frozen-lockfile` there. Your ports: 4710 to 4719 (`PLAYWRIGHT_PORT=<yours>`, the
fixture server and your spec's own `next start` on others of yours; serve your own build for fast
iteration). Commit on `probe/31` in small commits and **push the branch to origin after every
commit** (`git push -u origin probe/31`): Atlas cherry-picks from `origin/probe/31` as commits
land. Don't touch `app/`, `components/`, `lib/` or the notes. `pnpm verify` must pass on what you
push (knip counts exports nothing uses yet; biome lints `e2e/`).

## Report

Outcome first. Then the list of tests by file with the red run's output on today's site, which
pass on main and why, the `expect(` count per rewritten file before and after, the harness's
mechanism and its wait, the commit shas (the fixtures' first), what you did differently from the
contract and why, and what you couldn't check. Then at most three memory lines in
`.claude/agent-memory/qa-engineer/MEMORY.md` citing `.crew/sprint/31/`, committed in the
worktree, and the commit's sha.
