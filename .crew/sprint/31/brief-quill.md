# Sprint 31 brief for Quill: B4a's contract (Atlas)

## What this sprint is for

B4a (your plan's B4.1; B4's sprints now take letters, B4a to B4e, as B5's do, so its checks are
B4.1, B4.2… without naming a sprint). The owner merged #75 with no comment: your feed contract is
approved as written, with its seven recommendations standing, and B4a starts today against its
fixtures (`.crew/sprint/28/b4-plan.md`, "Before the feed"; `.crew/sprint/28/decisions.md`, 7).
Its PR waits for the owner anyway (`CREW_FEED_URL` on Vercel, Read as page moving on phones) and
merges only once the real feed answers on its preview. #77 (B5a, `/log`) waits for the owner too;
B4a neither repeats nor builds on it, and `.crew/sprint/31/decisions.md` (4) says how the two
PRs' shared files are kept cheap to merge.

Your job: `.crew/sprint/31/contract.md`, one page in the shape of
`.crew/sprint/29/b5-first-contract.md`, within about ninety minutes. Iris, Probe and Forge are
already at work from your plan's B4.1 section, the feed contract and the frames, so write the
rules first and the checks second, and message Atlas as each half lands; a late contract reworks
three people. Read first: your plan's B4.1 section and its four-states table whole, the feed
contract (you wrote both), `.crew/sprint/17/design/crew-1440.webp`, `crew-390.webp` and
`rest-390.webp`, `components/bar.tsx`, `app/page.tsx`, `e2e/sheet.spec.ts`'s two B2.3 tests,
`e2e/keyboard.spec.ts`'s "15th Tab stop" test and `tabUntil`, `e2e/helpers.ts`'s `ROUTES`,
`e2e/read.spec.ts`'s B2.10, `e2e/invariants.spec.ts`'s loops over `ROUTES`, `lib/sprint-log.ts`
(what the retros give the down and resting states), and your memory.

## What the contract settles

1. **The outcome** in a sentence or two, for the executive and the engineer.
2. **The data rules, word for word** (the page and Probe's oracle both implement them): the four
   states from the feed (`live`, `open`, `resting`, `down`), what each shows on `/crew` and the
   exact copy for each (the down line "The live feed isn't answering", the open label "Waiting on
   the owner", the resting label with its merge time, the live now line), which fields render
   where (the chip and the goal, the seven crew rows with the frames' role words Lead, Design,
   Roadmap, Review, Code, Motion, Tests, the state words Working, Waiting, Done, "Not on this
   sprint", the moments with `HH:MM` UTC and the heading "Activity, {d Mon} (UTC)", Evidence,
   Approval, Rules), copper only on Working and the live now line, the quotes shown and marked
   (feed contract, decision 4), the Rules copy that is true (decision 5: write it), the Studio link
   in Evidence (decision 7), the PR link only when its URL is a GitHub PR page of this repository,
   text shown escaped, unknown kinds and roles dropped, `asOf` older than 10 minutes as down, and
   what the down and resting states take from the retros (`readSprintLog()`'s newest entry).
   `/` stays unedited by the feed in this sprint (B4b's). Where the frame's words are an
   engineer's, say the visitor's words and leave the wording of moment kinds to Iris (mark it
   "Needs decision (Iris)").
3. **The bar, everywhere it changes:** Work, Crew, Log, Contact, Read as page; Crew
   `aria-current="page"` on `/crew`; from 1024 Read as page right-most before the control; from
   768 to 1023 five links and the control on one line; below 768 four links in the bar and Read
   as page at the drawing's foot on `/` beside the control, as `rest-390.webp` draws it (the moved
   assertion the owner approves); on `/crew` below 768 Read as page's place is Iris's. Measure
   production at 768, 390 and 320 for the fit (your plan has the four links' spans; the fifth is
   the question), and say the number.
4. **The checks, numbered B4.1 to B4.n,** each one a visitor would notice, grounded in a
   measurement or the current page: the three fixture states, the down state on the default
   server, the state words and copper, UTC times, escaping, unknowns ignored, the non-GitHub URL
   not linked, the bar at every width and the Close link and Back returning to `/`, the route
   sweeps on `/crew` (axe, tokens, targets, overflow 0 at 320, one `main` with named regions, a
   paint without JavaScript, one ring in forced colours), LCP text within 2,500 ms at 4× CPU, and
   script within 2,048 B of `/sprints'` (B2.10's method, decoded bodies; on main `/sprints` is
   the baseline; if #77 merges first it becomes `/log`).
5. **The disposition of live checks:** B2.3's two tests rewritten with the same assertions over
   five links; keyboard's 15th stop becomes the 16th (`tabUntil`'s bound rises, a harness change);
   `ROUTES` gains `/crew` (status 200) with the same assertions; B2.10's list gains `/crew`;
   B2.11's `toContain` needs no edit; nothing retires. Count the `expect(` per file as
   `.crew/scope.mjs` does, so a rewrite never reads as weakened.
6. **The harness** the checks run on: Forge is measuring how a fixture state reaches a server
   built without `CREW_FEED_URL` (`.crew/sprint/31/decisions.md`, 6); Atlas sends you the result,
   and the contract names the mechanism (a fixture server Probe's spec starts, a `next start`
   pointed at it, how a state change is seen and within how long). Until it comes, write the
   checks against the states, not the mechanism.
7. **Budgets, out of scope** (live updates B4c, the 3D and the control on `/crew` B4d, Replay
   B4e, `/crew`'s own share card a follow-up: say whether the route needs an `opengraph-image`
   re-export to keep one `og:image`, as `/read` does), **the riders** (none of the facts, fonts
   or model riders; Lens's nit on #74 rides B4b or B4d), and **"Needs owner decision"**: the moved
   Read as page, `CREW_FEED_URL` on Vercel for Preview and Production, the quotes, the Rules copy,
   the Studio link, and that the PR merges only once the feed answers on the preview.

Write it in this checkout at `.crew/sprint/31/contract.md`, don't commit (Atlas commits it), and
message Atlas when the rules are down and again when the checks are. If you measure in a browser,
work in your own worktree (`git worktree add -b quill/31 /home/user/wt-quill-31 sprint/31-b4a-crew`,
`pnpm install --frozen-lockfile`) on ports 4740 to 4749, or against production, which cloud
sessions reach. Don't touch `app/`, `components/`, `lib/` or `e2e/`.

## Report

Outcome first. Then the contract's path, each measurement with its number and where it was taken,
what you left to Iris or Atlas, what differs from your plan's B4.1 section and why, and what you
couldn't check. Then at most three memory lines in `.claude/agent-memory/product-owner/MEMORY.md`
citing `.crew/sprint/31/`, and the sha if you committed them in a worktree.
