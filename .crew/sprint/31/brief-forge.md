# Sprint 31 brief for Forge: `/crew` from the feed, and the Crew link (Atlas)

## What this sprint is for, and for whom

B4a (the plan's B4.1). A hiring executive who follows Crew from the bar gets `/crew`, as the
owner-approved frames `.crew/sprint/17/design/crew-1440.webp` and `crew-390.webp` draw it: the
drawing at the left, the panel at the right: "Crew", a Close link back to `/`, the sprint chip
and goal, the crew table (seven rows: name, role word, state, one line), the now line, the moments
with UTC times, and Evidence, Approval and Rules. In one glance: is the crew live, who is working
on what, who approves, and the rules ("Visitors watch; nobody can start or steer the crew"). An
engineer gets the activity with times, the pull request and the run's page on the Studio. The
page is server-rendered from the feed and has no client code; it shows four states
(`.crew/sprint/28/b4-plan.md`, "The four states, and the honest rest": read the whole plan's B4.1
section too): live, open and not live, resting, and feed down. The bar gains Crew on every page,
and below 768 px Read as page moves to the drawing's foot on `/` beside the control, as
`rest-390.webp` draws it. The feed's shape is `.crew/sprint/28/feed-contract.md`, approved by the
owner today (#75 merged); it isn't deployed yet, nothing in the cloud can reach it, so you build
against Probe's fixtures (`e2e/fixtures/crew/*.json`, hers to write, yours to read) and only the
owner sees the real feed on the preview. Quill's contract, `.crew/sprint/31/contract.md`, lands
within about ninety minutes with the copy word for word and the checks; Iris's notes (the panel's
layout at each width, the states' look, Read as page's place on `/crew` below 768, the words)
come within the hour. Atlas relays both. Until then build to the plan, the frames and the
placeholders below, in a shape where her numbers are a CSS change.

## What you build, in this order

1. **The measurement, within the hour, before the page.** Write `lib/crew-feed.ts`: the feed's
   types from the contract (no `any`; the shape checked field by field, unknown moment kinds and
   roles dropped, a wrong `version` or a bad shape as down), one `"use cache"` read with
   `cacheLife({ stale: 30, revalidate: 30, expire: 300 })` of `process.env.CREW_FEED_URL`
   (unset: down; not 200, over 2,000 ms by `AbortSignal.timeout`, bad JSON: down; a failed read
   held at most 30 s), and the state derived at render: `asOf` older than 10 minutes is down;
   `current.live` is live; `current` set is open; `current` null is resting. Then measure, with a
   scratch fixture server of your own (a few lines of node `http` in your scratchpad serving the
   contract's example) and a stub `/crew` page that prints the state: (a) `pnpm build` stays
   static under `app/layout.tsx`'s `ensureStatic` with the read in the page (the cacheLife doc:
   `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cacheLife.md`, "Prerendering
   behavior", and `.../03-file-conventions/02-route-segment-config/ensureStatic.md`); (b) after a
   build with no `CREW_FEED_URL`, a `next start` with it set: what the first request shows, and
   after how many seconds or requests the fixture state shows; (c) the fixture changes its answer:
   when the page follows; (d) two `next start` on one `.next` with different `CREW_FEED_URL`: do
   they see their own feed or share a cache; (e) the production build with the variable set at
   build: the state is in the HTML. Report the five answers to Atlas the moment you have them
   (SendMessage): Probe's harness and Quill's contract are waiting on them. If the read can't stay
   static, say so with the error before changing the cache life.
2. **The bar.** First take #77's change to `components/bar.tsx` and `app/page.tsx` verbatim
   (`git show origin/sprint/30-b5a-log -- components/bar.tsx app/page.tsx`: the motion control
   becomes a slot the sheet passes in, so its client chunk never reaches a page without the
   model; keep `/sprints` as Log's `href` on main, which #77 changes to `/log`), so the two PRs
   merge without a conflict in that hunk (`.crew/sprint/31/decisions.md`, 4). Then: the links
   Work, Crew (`/crew`), Log, Contact, Read as page; Crew `aria-current="page"` on `/crew`; from
   1024 Read as page right-most before the control; from 768 to 1023 five links and the control
   on one line (measure at 768 and say the number); below 768 four links in the bar, and on `/`
   Read as page in `main` at the drawing's foot beside the control, as `rest-390.webp` draws it:
   the link at the left, underlined, a 44 px target, the group at the right, in the control's row
   from sprint 27 (`app/globals.css`, "The drawing's foot"). The bar's comment says Crew joins
   with its route: it does now. On `/crew` the bar has no control (B4d's), and Read as page's
   place below 768 is Iris's call: placeholder the drawing's foot alone.
3. **The route.** `app/crew/page.tsx` and `components/crew.tsx` (and `crew-*.tsx` as it grows):
   the bar, then `main#main` with `[data-plan]` (the sheet's `LinesPlan` with today's seats, as
   `app/page.tsx` seats them; no pencil plank, no model) and `section[aria-labelledby="crew"]`
   with `h1#crew` "Crew", `a[data-close]` to `/` ("Close", the frame's ×), `[data-chip]` with the
   sprint number and the goal, the `table` of the seven roster roles in roster order (`th[scope="row"]`
   the crew's names Atlas, Quill, Forge, Pixel, Lens, Probe, Iris from the role keys, the frames'
   role words Lead, Roadmap, Code, Motion, Review, Tests, Design, `td[data-state]` with Working,
   Waiting, Done or "Not on this sprint" and the line), `[data-now]` the now line, "Activity,
   {d Mon} (UTC)" over `ol[data-moments]` with one `li` per moment, newest first, each a
   `time[datetime]` showing `HH:MM` UTC and the text; then `[data-evidence]` (the run's page on
   the Studio as a link, the PR as a link only when `pr.url` is `https://github.com/nycruslan/
   theseus-portfolio/pull/<n>`), `[data-approval]` ("{profile.name}, on the pull request. Not given
   yet." while open; the merge time at rest) and `[data-rules]` (the contract's true copy; Quill
   writes it: placeholder "Only real events, filtered at the source: who, what kind, which folder.
   Never secrets: credentials are masked before anything is stored. Visitors watch; nobody can
   start or steer the crew."). `[data-crew-state]` on the panel: `live`, `open`, `resting`,
   `down`. Copper (`--accent`) only on Working rows' dot and word and on the live now line;
   nothing else, in any state. The feed's text rendered as text (React escapes; never
   `dangerouslySetInnerHTML`). Resting: `last` told the same way, labelled with its `mergedAt`;
   down: "The live feed isn't answering", the newest `readSprintLog()` entry's number and goal,
   the seven roles with no state words. Metadata: title "Crew — {profile.name}", a description,
   canonical and `og:url`, one `og:image` (re-export the site's card as `app/read/` does, and
   check the built HTML). `app/sitemap.ts` gains `/crew`. No client code: `/crew`'s script files
   must be the 404's, within 2,048 B of `/sprints'` by B2.10's method.
4. **The look.** The frames, then Iris's numbers when Atlas relays them. Placeholder: from 1024
   the drawing 4fr and the panel 3fr with a left rule, as the sheet's grid; below, the drawing
   above the panel; the panel 24 px in; "Crew" in the display face at the sheet's `h1` step; the
   table's rules in `--rule`; the chip hatched in graphite as the pencil swatch; the not-called
   roles folded into one sentence below 768 as `crew-390.webp` draws it. New CSS in a "The crew"
   section of `app/globals.css`, tokens only.
5. **Iris's calls**, when Atlas relays them. Serve your build on one of your ports with
   `CREW_FEED_URL` at Probe's fixture server (or your scratch one) and tell Atlas the URL and the
   state it shows as soon as `/crew` renders, so Iris can look early.

Nothing else: no change to `content/`, no edit to `e2e/`, no new dependency, nothing on `/` beyond
the bar's slot, Crew and Read as page's move, nothing in `lib/model/`, no pencil plank, rest line
or copper on `/` (B4b's), no polling (B4c's).

## Files you own

`app/crew/**` (new), `components/crew*.tsx` (new), `lib/crew-feed.ts` (new),
`components/bar.tsx`, `app/page.tsx`, `app/sitemap.ts`, `app/globals.css` (the new section and
the drawing's foot), and `app/layout.tsx` only if the metadata needs it. Work in your own
worktree from `sprint/31-b4a-crew`: `git worktree add -b forge/31 /home/user/wt-forge-31
sprint/31-b4a-crew`, then `pnpm install --frozen-lockfile` there. Your ports: 4730 to 4739; start
servers with `node node_modules/next/dist/bin/next start --port <n> &`, note the PID, check the
port after `kill` and kill the `next-server` child by its PID if it survives (`.crew/STATE.md`).
Commit on `forge/31` in small commits and **push the branch to origin after every commit**
(`git push -u origin forge/31`): Atlas cherry-picks from `origin/forge/31` as commits land.

Prove it: `pnpm verify` green; the five measurements; `/crew` in each of the four states on your
served build (curl the HTML for the state and the copper, a browser for the look); the script
files `/crew` requests against the 404's and `/sprints'` (B2.10's method, decoded bodies); the bar
at 320, 390, 768, 1024 and 1440 on `/` and `/crew`; `e2e/sheet.spec.ts`, `e2e/keyboard.spec.ts`,
`e2e/invariants.spec.ts`, `e2e/read.spec.ts` and `e2e/smoke.spec.ts` against your served build
with `PLAYWRIGHT_BASE_URL`, saying what's red and why (the rewrites land from Probe's
`origin/probe/31`; cherry-pick them once Atlas says they're pushed, and run `e2e/crew*.spec.ts`
as they land). See it in a real browser: `/crew` in each state and `/` at 320, 390, 768, 1024 and
1440 in both schemes, scripts off, forced colours (Playwright for that), and Back from `/crew`.

## Report

Outcome first. Then what's built, the commit shas in order (the feed reader's first), the five
measurements, the script-bytes numbers, the bar's fit at 768, the checks run and their results
(red ones with the assertion and the number), what you did differently from the contract and why,
the URL of your served build, and what you couldn't verify. Then at most three memory lines in
`.claude/agent-memory/engineer/MEMORY.md` citing `.crew/sprint/31/`, committed in the worktree,
and the commit's sha.
