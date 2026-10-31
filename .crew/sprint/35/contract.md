# B4c contract: `/crew` live in the browser

Quill, 2026-10-31, during sprint 35, for the run that builds it (PR #90). The plan's B4.3
(`.crew/sprint/28/b4-plan.md`, with its "Live in the browser, and WCAG 2.2.2" section). It reuses
B4a's read, states, panel and harness (`.crew/sprint/31/contract.md`) and B4b's layer
(`.crew/sprint/34/contract.md`) by reference. Numbers were measured on this branch (`0ba725d`), on
a scratch build of it with a sketch of the poller and the route (not committed; "Measured", below),
or on production (`https://theseus-portfolio.vercel.app`, 2026-10-31), as cited. Iris's calls
(her message to Quill this sprint; `notes-iris.md` when it lands) are written in where they apply.

## Outcome

A visitor who stays on `/crew` sees the crew working while they watch: the crew table, the now line
and the moments follow the feed within about a minute; a run that ends turns into the rest line in
front of them; "Pause updates", beside the status, stops it; and a screen reader hears who started
or stopped working, nothing else. The page still arrives server-rendered and whole, and hydrating
it changes nothing a visitor can see. The browser only ever talks to the portfolio's own
`/api/crew`. `/` doesn't change and loads no new byte.

## The calls I made

- **The route is dynamic, not prerendered.** Measured on the scratch build: a `GET` handler that
  calls `readCrew()` is prerendered under `cacheComponents` (`○ /api/crew-static 30s 5m`) and
  answered the build's `down` with `x-nextjs-cache: HIT` while the feed was live; the same handler
  after `await connection()` (`ƒ /api/crew`) answered `live` on its first request. A prerendered
  route is also what Vercel serves after a quiet spell (`.crew/STATE.md`, "What a page reads at
  build"), which is exactly when a poll is meant to correct the page. `readCrew()`'s own 30 s cache
  and the CDN's 30 s keep the Studio at about two reads a minute however many watch.
- **One poll at hydration, then the schedule.** The first paint can be up to about 5 minutes old,
  or the build's "Here is the latest revision on record." after a quiet spell (production `/crew`
  read `age: 44`, `x-vercel-cache: STALE`, "Live", at this sprint's start). Polling at once lets the
  page catch up within a second instead of a minute. When the answer matches the page, React
  changes nothing.
- **A failed or `down` poll keeps the panel for 10 minutes.** The server already keeps the last
  good answer for 10 minutes (B4a `decisions.md` 13), but serverless instances don't share it, so
  a cold one can answer `down` between two `live`s. The browser applies the same rule from its own
  side, so the panel doesn't flicker between Live and down. Past 10 minutes without a told answer
  it turns down and says so.
- **The live region is not the now line.** The plan made the now line `aria-live`, but it changes
  whenever the Studio's status line does, which is more often than who is working. One visually
  hidden region says only who started or stopped working (Iris agreed, call 5).
- **Tests drive time with `page.clock`, not a test-only interval.** Measured: with `page.clock`
  installed before `goto`, `page.route` answering `/api/crew` and a visibility shim, the scratch
  poller ran 10 minutes of polls, hidden, paused and resumed in 3.4 s of real time. The page has no
  test hook; it uses only `setTimeout`, `clearTimeout` and `Date.now()`, which `page.clock` fakes.
- **A blank goal is no goal, at the read.** Lens's #87 nit asks for `goal?.trim()` in `layerOf`;
  doing it in `readCrew()` fixes `/`, `/crew` and the route at once.
- **"Paused" changes words.** Iris: the open-not-waiting status "Paused" would sit beside a pressed
  "Pause updates" and read as the visitor's own pause. She proposes "Crew between sessions." (her
  final words in `notes-iris.md` govern; Atlas relays them to Forge and Probe together).

## Data rules (the page, the route and Probe's oracle implement these word for word)

**The read** is B4a's (`readCrew()`, `lib/crew-feed.ts`), with one change: a `goal` that isn't a
string, or is empty or only whitespace once trimmed, reads as `null` (otherwise the string whole,
untrimmed). So `/crew`'s chip leaves the goal out, `/`'s pencil row link reads "In progress", and
the route sends `null`.

**The route,** `app/api/crew/route.ts`, `GET` only. It awaits `connection()` (from `next/server`)
and then calls `readCrew()` once. It answers `200` in all four states, `application/json`, with
`Cache-Control: public, max-age=0, s-maxage=30`. That's the same in every state, `down` included:
the CDN holds an answer 30 s and the browser never reuses one. The body:

```ts
type CrewAnswer =
  | { version: 1; state: "down"; run: null }
  | { version: 1; state: "live" | "open" | "resting"; run: {
      sprint: number | null;
      goal: string | null;
      pr: { number: number; url: string | null } | null;
      health: { state: string; line: string | null; quote: boolean };
      now: string | null;
      roles: { role: RosterRole; state: AgentState; line: string | null }[];
      moments: { kind: MomentKind; at: string; text: string }[];
      url: string | null;      // readCrew's `studio`: the run's page, only when it passed B4a's test
      mergedAt: string | null;
    } };
```

Each field is `readCrew()`'s, under the feed contract's name (`url` for what `Run` calls
`studio`). Nothing else passes: no `asOf`, `live`, `health.label`, `startedAt`, `lastEventAt`,
`endedAt`, moment `who`, `replay` or `unread`. `state` is B4a's state; `version` is the route's own
shape version, so a tab left open across a deploy that changes the shape fails its polls instead
of misreading them. The feed's address (`CREW_FEED_URL`) never appears in the body or a header.
The only URLs in an answer are `run.url` (the Studio's public run page, already linked in
`/crew`'s HTML) and `run.pr.url`. Other methods get Next's `405`.

**The browser's check of an answer.** A poll *fails* when the request throws, the status isn't
200, the body isn't JSON, or the answer isn't one of these shapes: `version === 1`; `state` one of
the four; `run === null` exactly when `state` is `down`; otherwise `run` an object with `roles` and
`moments` arrays and `health` an object with a string `state`. Fields inside are rendered as the
route made them, under B4a's rules: text is text, the PR is linked only by `pullHref`, and `url` is
linked only when it is an `https:` URL whose path starts `/studio/runs/`. The fetch is
`fetch("/api/crew", { cache: "no-store" })`, same-origin. The page requests nothing from any other
origin.

**The panel in the browser** renders, for an answer telling state S with run R, exactly what the
server renders for `{ state: S, run: R }` with the same build's retros: B4a's data rules for the
chip, status, table, now line, activity, Evidence, Approval and Rules, B4b's dashed chip, and the
status words amended above. The server passes the client what it needs from the retros (the
record's sprint, goal and PR; each retro's sprint and `ownersCall`, for Approval at rest), not
`content/profile.ts` whole.

**The poll** (one in flight at most):
- **At hydration:** one poll at once, if the document is visible.
- **After each poll settles** (applied, kept or failed), the next one is scheduled with
  `setTimeout`: **30,000 ms** if the panel then shows `live`, else **60,000 ms** (`open`,
  `resting`, `down`).
- **Hidden:** when `document.visibilityState` isn't `"visible"` (read on `visibilitychange` on
  `document`), the timer is cleared and no poll starts. On becoming visible again, unless paused,
  one poll at once, then the schedule.
- **Paused:** pressing Pause clears the timer, and an answer already in flight is discarded, so the
  panel doesn't change while paused. Pressing it again polls at once, then the schedule. The pause
  lasts for the page view; a reload starts unpaused.

**Applying an answer.** Let T be the time (`Date.now()`) of the last *told* answer (live, open or
resting). It is set at hydration when the server rendered a told state.
- A told answer replaces the panel and sets T.
- A failed poll, or a `down` answer: if the panel is down, nothing changes. Otherwise, while
  `Date.now() − T ≤ 600,000` the panel is kept exactly as it is. Past that, the panel turns to B4a's
  down panel: "The live feed isn't answering. Here is the latest revision on record.", the
  record's chip, seven rows in roster order with no state or line, no activity, the record's PR.
- New rows, lines, the now line and moments replace the old in place, with no fade, highlight,
  scroll or animation of any kind, in every motion setting (Iris, call 4).

**The announcement.** One `[data-announce]`, `aria-live="polite"` and `aria-atomic="true"`, visually
hidden with the site's `sr-only`, the panel `section`'s last child, and empty in the server's HTML.
It is the only `[aria-live]` inside `main`; Next's `#__next-route-announcer__` sits outside it,
already on production's `/crew`. When a told answer replaces a told panel, let W be the roles whose
state word was Working before and W′ after (Working exists only in `live`). For each role in
roster order (Atlas, Quill, Forge, Pixel, Lens, Probe, Iris):
- in W′ and not in W: "{Name} started working.";
- in W and not in W′: "{Name} stopped working."

The region's text is those sentences joined by one space. When there are none, the text is left as
it was. Nothing is announced at hydration, on a change to or from `down`, on a kept panel, or while
paused. If the new text equals the old, Forge clears the region before setting it, so it's heard
again. The now line, the moments and the status carry no `aria-live`.

**Pause updates** (Iris, calls 1 to 3):
- `button[data-pause][aria-pressed]`, named and reading "Pause updates" whether pressed or not (the
  name never changes to "Resume").
- In every state, after `[data-status]` and before the table, in DOM order, beside the status.
- The server renders an empty slot at the button's exact size, and the button is rendered into it
  on hydration (the motion control's pattern, sprint 27). With scripts off there's no button, and
  the status row is as tall as with scripts on.
- Ink, never copper. 32 px tall from 1024 px (the motion control's cell), 44 px tall below 1024,
  and at least 24 px wide. The 2 px ink ring sits 2 px out.
- Pressed, it takes the motion control's pressed cell: ink fill, film text. In forced colours it
  is `Highlight`/`HighlightText` with `forced-color-adjust: none` and outline `Highlight`, as
  `[data-motion] [aria-pressed="true"]`.
- Paused shows no other change: "Live" stays "Live". Iris's `notes-iris.md` gives the place in px.

**The status words,** B4a's with one change (Iris): `open` with a `health.state` other than
`"waiting"` reads **"Crew between sessions."** where it read "Paused". Approval in that state keeps
B4a's live sentence.

**`/` doesn't change.** It renders no poller, requests no `/api/crew`, and its scripts are B4b's.

## Checks

Probe writes these first in `e2e/crew-live.spec.ts`. B4.25 and B4.32 run on B4a's harness, on the
worker's kept live, open and resting sites (no new `next start`; B4.32 folds into an existing
variant). B4.26 to B4.31 run on the default server, with `page.route` answering `/api/crew` with
the oracle's answer for a fixture (its `toAnswer(fixture)`, implementing "The route" above),
`page.clock.install()` before `goto`, and, where a check hides the page, an init-script shim that
defines `document.visibilityState` and `document.hidden` and dispatches `visibilitychange`. "A
poll" is a request Probe's route sees. No check waits in real time for a schedule. Each title
carries its number.

**B4.25 The route.**
- On the kept live, open and resting sites, the first `GET /api/crew` Probe makes (no polling rule)
  answers 200, `application/json`, `Cache-Control` exactly `public, max-age=0, s-maxage=30`.
- Its body deep-equals the oracle's `toAnswer`, with exactly the key sets above at every level.
- No string in the body or headers contains the fixture server's feed address, and the only URLs
  in it are `run.url` and `run.pr.url`. The body is at most 8,192 B.
- On the default server: `{"version":1,"state":"down","run":null}` with the same headers.
- `POST /api/crew` is 405.

**B4.26 It polls, and the panel follows.** At 1440 × 900:
- Hydration: one poll right after load, before the clock moves.
- Live: answering the live fixture, the next poll comes after 30 s and not before
  (`runFor(29_000)`: none; `runFor(1_000)`: one).
- At rest: answering open, resting or down, it comes after 60 s and not before 59 s.
- A run that ends: switched from live to resting, the panel shows resting after one 30 s poll.
- After a poll telling each fixture, the panel's text equals the server-rendered panel of the same
  fixture's kept site, apart from the Pause slot. The oracle's B4.3, B4.4 and B4.5 expectations
  (status, chip, rows' order and words and lines, now line, activity, Evidence, Approval) hold on
  it. On the open fixture switched to `quiet`, the status reads "Crew between sessions.".
- From the default server's `down` first paint, the hydration poll's live answer turns the panel
  live.
- The page makes no request to any origin but its own.

**B4.27 Hidden and paused, nothing polls.**
- Hidden by the shim for 10 minutes: no poll. Shown again: one poll at once.
- With Pause pressed (`aria-pressed="true"`), 10 minutes pass with no poll. An answer held in
  flight when Pause is pressed, then fulfilled with resting, leaves the live panel unchanged.
- Pressed again (`aria-pressed="false"`): one poll at once, then the 30 s schedule.
- After a reload, it's unpressed.

**B4.28 A failed poll keeps the panel.**
- With the panel live, each of: a 503, an aborted request, a body that isn't JSON, `version: 2`,
  `state: "live"` with `run: null`, and a 200 `down` answer leaves the panel's text unchanged, and
  the next poll still comes at 30 s.
- With failures continuing, the panel turns to B4.2's down panel at the first poll more than
  10 minutes after the last told answer, and not before. A told answer after that brings it back.
- An answer with `run.url` `javascript:alert(1)`, or `http://` with a `/studio/runs/` path, shows
  no "This run on the Studio" link.
- The feed's markup moment (B4.8's) is text, with no `b` element.

**B4.29 Who started or stopped working.**
- Exactly one `[aria-live]` in `main`: `[data-announce]`, polite, atomic, empty in the server's
  HTML and after hydration, clipped to the `sr-only` box yet not `display: none`.
- From the live fixture (Atlas, Forge and Probe `working`; Lens `waiting`) to the same with Lens
  `working` and Probe `waiting`: the text is "Lens started working. Probe stopped working.".
- Then a poll that changes only moments, the now line, a role's line, or a Waiting-to-Done word:
  the text is unchanged.
- From live to resting: "{each Working name} stopped working." in roster order, by the oracle.
  From resting to live: "… started working.".
- Live to down past 10 minutes, and down to live, change nothing. A held answer discarded under
  Pause changes nothing.
- `[data-now]` and `[data-status]` have no `aria-live`.

**B4.30 The first paint stays, and hydrating changes nothing.** On the kept live site and the
default server, at 1440 × 900 and 390 × 844, with `/api/crew` held (never fulfilled):
- A `MutationObserver` installed before navigation records, inside the panel, nothing up to 3 s
  after load but the button's insertion into the Pause slot.
- No `layout-shift` entry has a source inside the panel.
- The panel's text, scripts on, equals its text scripts off.
- With scripts off: no `button[data-pause]`, and `[data-status]`'s row is as tall as with scripts
  on.
- Then, with the route answering the kept site's own fixture, the first poll mutates nothing in
  the panel.

**B4.31 Pause, and the budget.**
- In each of the four states, both schemes, at 1440 and 390: `button[data-pause]` follows
  `[data-status]` in DOM order and precedes the `table`, and is named "Pause updates" pressed and
  not.
- Its box is 32 px tall from 1024 and 44 px below, at least 24 px wide, inside the viewport, and
  overflows nothing at 320.
- Space and Enter toggle `aria-pressed`. Focused, it shows one 2 px ink ring 2 px out.
- Pressed, its background resolves to `--foreground` and its text to `--background`. In forced
  colours, pressed, it paints `Highlight`.
- Nothing about it resolves to `--accent`, at rest, hovered, focused or pressed.
- Script: by B2.10's method (decoded bodies, a fresh context, 1.5 s), every script file the 404
  requests is among `/crew`'s, and `/crew`'s bytes exceed the 404's by at most **16,384 B**.
- `/`, loaded and run 5 minutes on the clock, requests no `/api/crew`.

**B4.32 A blank goal is no goal** (Lens's #87 rider). The live or open fixture patched with
`goal: "   "`, folded into an existing variant site whose assertions don't read the goal (for
example B4.16's `quiet`), with Probe naming it. On that site:
- `/api/crew`'s `run.goal` is `null`;
- `/crew`'s chip shows the number and no `.crew-goal`;
- `/`'s pencil row link reads "In progress" and is at least 24 px tall.

## The live checks: keep, rewrite, retire

The default e2e server has no feed, so its `/api/crew` answers `down` and its `/crew` stays `down`
after the hydration poll. On harness sites, the page and the route read the same `readCrew()` in
one process, so a poll after the page shows a state tells that state or a newer one.

| Check | Disposition |
|---|---|
| `crew.spec.ts` B4 harness, B4.1 to B4.3, B4.5 to B4.12 | **keep**, unedited. B4.1's parts and order hold, with the slot and `[data-announce]` inside the panel |
| `crew.spec.ts` B4.4 | **rewrite**, same assertions: "Paused" becomes "Crew between sessions." (Iris's final words) in the title, the check and `crew.ts`'s oracle |
| `crew.spec.ts` B4.13 | **rewrite**, same assertions: the Tab order gains `<button>` (Pause) after Close and before Evidence's links |
| `crew.spec.ts` B4.14 | **rewrite**, same `expect(`s: `crew.paths` `toEqual(missing.paths)` becomes "the 404's paths not among `/crew`'s" `toEqual([])`; `crew.bytes` `toBe(missing.bytes)` becomes `crew.bytes − missing.bytes` at most 16,384; the `/log` bound, LCP and fonts unchanged; the title says so |
| `read.spec.ts` B2.10 | **rewrite**: its route list drops `/crew`, which B4.14 and B4.31 now hold; `/`, `/log`, `/log/13` and `/read` keep every assertion and the 2,048 B; the title drops `/crew` |
| `live-layer.spec.ts` B4.15 to B4.24 | **keep**. Lens's test nits ride as code: B4.15's title says `--muted`, the copper scans match `.swatch-tip` not the legend's words, and the oracle's goal reads blank as `null` |
| `crew-feed.ts` | **keep**; its site-count comment corrected (Lens's nit) |
| `invariants`, `keyboard`, `crew-bar`, `sheet` (B1.6), `motion`, `model-*`, `log*`, `plan`, `content`, `facts`, `cards`, `smoke`, `not-found` | **keep**, unedited. The route sweeps hold `/crew` with the button in it (axe, tokens, targets, overflow, nothing animates) |

Nothing retires. The two loosened bounds are the plan's own: B4.3 "sets `/crew`'s own budget from
Forge's measurement" (#75, merged by the owner), and `/`'s stays where it is. Lens accepts them
with this reason in the PR.

## Budgets

| Measure | Budget | Check | Measured |
|---|---|---|---|
| `/crew`'s script beyond the 404's | 16,384 B decoded; the 404's files all included | B4.14, B4.31 | today 0 B (5 files, 458,882 B on this branch; 459,340 B on production, equal to its 404). Scratch poller with the panel as a client component: +12,874 B in one file. So 3,510 B (27%) of headroom |
| `/`'s script | B2.10 unchanged: 2,048 B beyond the 404's with WebGL refused; B4.23's same files and bytes | B2.10, B4.23, B4.31 | B4c adds 0 B |
| Poll rate | 1 at hydration; 2 a minute live and visible; 1 a minute otherwise; 0 hidden or paused | B4.26, B4.27 | scratch: 1, 30 s, 60 s, 0, 0 |
| Kept panel | at most 10 minutes past the last told answer | B4.28 | the server's own rule, B4a decision 13 |
| Answer | at most 8,192 B; `max-age=0, s-maxage=30` | B4.25 | 1,560 B for the live fixture (scratch) |
| Freshness | the visitor sees a feed change within about a minute | B4.26 (on fixtures) | Studio 15 s, `readCrew()` 30 s, CDN 30 s and poll 30 s each bound a step; typically under a minute while live |
| Hydration | no visible change before the first answer; CLS 0 in the panel | B4.30 | scratch: only the button's insertion |
| Targets, overflow | Pause 32 px from 1024 and 44 px below; 0 overflow from 320 | B4.31, sweeps | Iris |
| The new spec's time | at most 90 s at CI's worker count, reported by Probe; the suite under CI's 25-minute cap | the run | about 21 minutes for main's job (`.crew/STATE.md`) |

## Measured

The scratch build ran in a separate worktree off `0ba725d` and was thrown away. In it,
`components/crew.tsx` and `components/crew-table.tsx` were made client-safe (`ROSTER` and
`pullHref` moved to a module with no `next/cache`; the owner's name passed in, not
`content/profile.ts`), with a `"use client"` poller following the rules above. Two handlers ran on
one build: one with `connection()`, one without. Each ran under `next start` with a scratch feed
serving `e2e/fixtures/crew/live.json` with a fresh `asOf`. The scripts were read by B2.10's method,
and the poller was driven by a Playwright script using `page.clock`, `page.route` and the
visibility shim. On it, production's `/crew` lists one `[aria-live]`, Next's
`#__next-route-announcer__`, outside `main`.

## Build notes

- `lib/crew-feed.ts` imports `next/cache`, so the client must not import its values. Split what
  the browser needs (the roster, `pullHref`, the answer check) into a module of its own, and keep
  `readCrew()` server-only. Types can still be imported.
- The client gets the retros' facts as props, not `readSprintLog()` or `profile`. Pass only what
  the panel shows.
- Forge reads a preview's `/api/crew` twice within 30 s, reports `x-vercel-cache` (MISS, then HIT)
  and the header the browser sees, and pastes the route table line (`ƒ /api/crew`) in the PR.
- One function for the announcement's words, used by the page. Probe's oracle implements the rule
  independently.

## Riders

| Rider | Disposition |
|---|---|
| Lens's #78 nits: `lib/sprint-log.ts` and `next.config.ts` comments, `crew.spec.ts` serial, its 40 s deadline, skipping under `PLAYWRIGHT_BASE_URL` | **Already done on main.** `lib/sprint-log.ts` lines 9 to 11 and `next.config.ts`'s tracing comment name `/crew`'s request-time read. `crew.spec.ts` lines 56 to 65 run "default" with the reason and skip under `PLAYWRIGHT_BASE_URL`. `crew-feed.ts` names `STATE_WAIT = 40_000`. The roadmap line is stale: Atlas ticks it |
| Lens's empty-goal nit on #87 | **A check** (B4.32), built in `readCrew()` and the oracle |
| Lens's three test nits on 415b4c0 | **Code only** (Probe): `.swatch-tip`, B4.15's title, `crew-feed.ts`'s comment |

## Out of scope

- The hull and marks on `/crew`, and its motion control (B4d); Replay (B4e).
- Any change to `/`'s look or script. The roadmap's other #87 item, Iris's chip covering the copper
  dot on a short seat, isn't in the brief and stays with the next sprint that touches the layer.
- Kind labels on moments, `who`, motion on arrival, sound, notifications, and a remembered pause.
- Any change to `content/` or an owner path. The feed contract is unchanged: the route only narrows
  the feed.

## Needs decision

- **Iris:** final words for the open-not-waiting status (proposed "Crew between sessions.") and
  Pause's place in px, in `notes-iris.md`. Calls 1 to 5 are written in from her message.
- **Atlas:** whether the plan's loosened `/crew` script bound (0 B to 16,384 B beyond the 404's)
  needs an Owner's pick. My view: no. The owner merged the plan that sets it, and `/` is untouched.
- **Owner:** none to merge. On the preview, with the real feed, they see a live run move.
