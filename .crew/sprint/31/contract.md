# B4a contract: `/crew` from the feed, and the Crew link

Quill, 2026-10-24, during sprint 31, for the run that builds it. B4's first build sprint, the plan's
B4.1 (`.crew/sprint/28/b4-plan.md`), to the owner-approved frames `crew-1440.webp`,
`crew-390.webp` and `rest-390.webp` (`.crew/sprint/17/design/`) and the feed contract the owner
approved by merging #75 (`.crew/sprint/28/feed-contract.md`, its seven recommendations standing).
It neither repeats nor builds on #77 (B5a, `/log`): `/crew` reads the feed and the retros, nothing
of `/log`. Every number below was measured on today's branch (`43c19d9`, main's `7d23043` plus the
sprint's notes) or on production, as cited.

## Outcome

A hiring executive who follows Crew from the bar lands on `/crew` and sees in one glance whether
the crew that rebuilds this site is working right now, who is working on what, who approves the
work, and the rules it runs under. An engineer gets the activity with UTC times, the pull request
and the run's full page on the Studio. When the feed is down, or the crew is resting, the page says
so plainly and shows the record instead of pretending. All of it is server-rendered, reads without
JavaScript, and adds no client code; the bar gains Crew on every page.

## The calls I made

- **Four states, decided at render from one read** (the plan's table). `/` is not edited by the
  feed in this sprint: its live layer is B4b's.
- **The drawing on `/crew` is `/`'s 2D lines plan as it is**, seated from the retros, with no
  pencil plank and no copper. The frame's hatched 17 and its copper tip are B4b's pencil (one
  component, drawn once on both pages) and B4d's marks. Copper in B4a is only on Working and the
  live now line, so the drawing can't contradict the panel.
- **The rows follow the frame's order, not the feed's.** `crew-1440.webp` lists Atlas, Iris
  (Working), Quill, Lens (Waiting), Forge, Pixel, Probe (not on this sprint): by state, roster
  order within a state. That puts the working names first, which is the glance test. In the down
  state there are no states, so roster order.
- **The resting label says when the sprint merged, not "last plank seated".** On this branch the
  retros' newest is sprint 29, but #75 (sprint 28) merged after #76 (sprint 29) (`git log` on
  main: `7d23043` follows `55139a5`), so "the last plank seated" by seat order and the last merge
  by time can name different sprints. The feed's `last` is the newest merge; the label states that
  fact and no seat. B4b settles the rest line on `/` with this in hand.
- **The run's link on the Studio is checked against the feed's own origin**, not a hard-coded
  host: the owner may deploy the Studio under another name (feed contract, decision 1).
- **The bar on `/crew` is the Log's pattern from #77:** the wordmark links home, Work and Contact
  point at `/`'s sections, Crew is current, and there is no motion control (no model until B4d;
  sprint 22's rule: a control that changes nothing is a stand-in).

## Data rules (the page and Probe's oracle implement these word for word)

**The read.** One server function reads `CREW_FEED_URL` (`GET`, no headers beyond the default,
`AbortSignal.timeout(2000)`) inside `"use cache"` with `cacheLife({ stale: 30, revalidate: 30,
expire: 300 })`. The answer is **down** when any of these hold:
- `CREW_FEED_URL` is unset or empty;
- the status isn't 200, the read takes over 2,000 ms, or the body isn't JSON;
- the shape doesn't check: `version !== 1`; `asOf` not a parseable ISO time; `current` and `last`
  each neither `null` nor an object with `live` a boolean, `roles` and `moments` arrays, and
  `health` an object whose `state` is a string;
- `asOf` is more than 10 minutes (600,000 ms) before the server's clock when the feed is read
  (inside the cached read, so at most every 30 s; see "Build notes").

Within an answer that checks, bad parts are dropped, never fatal:
- a `roles` entry whose `role` isn't one of the seven keys, or whose `state` isn't one of
  `working`, `waiting`, `done`, `not-called`, is dropped; the first entry for a key wins;
- a moment whose `kind` isn't one of `kickoff`, `ticket`, `contract`, `decision`, `report`,
  `verdict`, `gate`, `pr`, `merge`, `end`, or whose `at` doesn't parse, or whose `text` isn't a
  non-empty string, is dropped; a `who` that isn't a roster key becomes `null` and the moment
  stays (B4a doesn't show `who`);
- a string field that isn't a string reads as `null`.

**The state** (`[data-crew-state]` on the panel):
| State | When | Told from |
|---|---|---|
| `live` | `current` is set and `current.live` is `true` | `current` |
| `open` | `current` is set and `current.live` is `false` | `current` |
| `resting` | `current` is `null` and `last` is set | `last` |
| `down` | the read is down, or `current` and `last` are both `null` | the record |

"The record" is `readSprintLog()`'s first entry (the highest-numbered merged retro in the build;
today sprint 29, "B5's plan, and B5a's contract: /log, the ghost hull and a record per revision",
PR 76). The feed never seats a plank: the drawing's seats come from the retros in every state.

**The crew.** Seven rows, always, from the portfolio's roster, not the feed's:
| Key | Name | Role word |
|---|---|---|
| `lead` | Atlas | Lead |
| `product-owner` | Quill | Roadmap |
| `engineer` | Forge | Code |
| `creative-engineer` | Pixel | Motion |
| `code-reviewer` | Lens | Review |
| `qa-engineer` | Probe | Tests |
| `design-director` | Iris | Design |

The roster order is the table's order above. Each row's state word, from the told run's entry for
that key:
| Feed state | `live` | `open` | `resting` |
|---|---|---|---|
| `working` | **Working** (copper) | Waiting | Done |
| `waiting` | Waiting | Waiting | Done |
| `done` | Done | Done | Done |
| `not-called`, or no entry | Not on this sprint | Not on this sprint | Not on this sprint |

In `down` the state cell is empty and there is no line. Otherwise the line is the entry's `line`,
whole, or nothing when it is `null`. Rows are ordered Working, Waiting, Done, Not on this sprint,
roster order within each (in `down`, roster order). Every row is in the HTML at every width; below
768 the "Not on this sprint" rows may fold into one sentence, `p[data-absent]` "{names, joined
with commas and a final 'and'} are not on this sprint." (or "{name} is not on this sprint."), as
`crew-390.webp` draws it: whether they fold, and how, is Iris's.

**The heading and the chip.** `h1#crew` "Crew". `[data-chip]`: the sprint number (the told run's
`sprint`; the record's in `down`), then the goal (the told run's `goal` whole; in `down` the
record's goal as `presentGoal` gives it). A `null` number leaves the number out; a `null` goal
leaves the goal out; both `null`, no chip.

**The status line,** `[data-status]`, one per page, exact copy:
- `live`: "Live".
- `open`, `health.state` `"waiting"`: "Waiting on the owner".
- `open`, any other `health.state`: "Paused" (a run that stopped without handing over; Iris may
  reword it).
- `resting`: "Crew resting. Sprint {last.sprint} merged {d Mon}, {HH:MM} UTC." When `mergedAt` is
  `null` or doesn't parse: "Crew resting. Sprint {last.sprint} merged." When `last.sprint` is
  `null`: "Crew resting."
- `down`: "The live feed isn't answering. Here is the latest revision on record."

**The now line,** `p[data-now]`, only in `live` and only when `current.now` is a non-empty string:
the word "now", then the text. When `current.health.quote` is `true` and `now` equals
`health.line`, the text is Atlas's own words: "now Atlas: " then the text inside a `q` element,
so it shows in quotation marks (feed contract, decision 4). The whole line is copper.

**The activity.** When the told run has at least one moment (never in `down`): `h2` "Activity, {d
Mon} (UTC)", the date of the newest moment shown, then `ol[data-moments]`, one `li[data-kind]` per
moment, newest first by `at` (ties keep the feed's order), at most 10. Each `li` holds
`time[datetime]` (the moment's `at` as `toISOString()`) showing `HH:MM`, or `{d Mon} HH:MM` when
its UTC day isn't the heading's, then the `text` whole. `[data-now]` sits under the heading, before
the list. The moment's kind is not shown in words in B4a: the text is the Studio's (needs
decision, Iris, below).

**Evidence,** `[data-evidence]`:
- the run's page: a link "This run on the Studio" to the told run's `url`, only when it is
  `https:`, its origin equals `CREW_FEED_URL`'s, and its path starts `/studio/runs/`; otherwise
  nothing. Never in `down`.
- the pull request: "Pull request #{n}", linked only when `pr.url` matches
  `^https://github\.com/nycruslan/theseus-portfolio/pull/(\d+)$` and that number equals
  `pr.number`; otherwise the same words as text. In `down`, the record's `pr`, linked to
  `https://github.com/nycruslan/theseus-portfolio/pull/{pr}`. No PR, no pull request item.
- In `live` or `open` with no PR: "The pull request opens at the end of the sprint."

**Approval,** `[data-approval]`, `{owner}` being `profile.name`:
- `open` with "Waiting on the owner": "{owner}, on the pull request. Not given yet."
- `live`, and `open` "Paused": "Not given yet. The pull request merges only after the checks,
  Lens's review and {owner}'s rules pass; what his rules leave to him waits for him."
- `resting`, when the build's retros hold `last.sprint`, and `down` (the record): "{owner}, on the
  pull request." when that retro's `ownersCall` is true, else "Merged behind the checks, Lens's
  review and {owner}'s rules."
- `resting`, when the build's retros don't hold `last.sprint` (a preview behind main, or the minutes
  before a merge deploys): "Merged."

**Rules,** `[data-rules]`, in every state, exact copy (needs owner decision, feed contract,
decision 5): "Only real events from the crew's sessions, as they happen. Its briefs and words are
public; credentials are masked before anything is stored. Visitors watch: they can't start or
steer the crew." (The frame's "filtered at the source: who, what kind, which folder" and "Never
prompts" are false of the Studio, which publishes briefs.)

**Copper** (`--accent`, as text, dot, border or fill) appears only on a Working row's dot and word
and on `[data-now]`, in `live`. In `open`, `resting` and `down`, and everywhere else on `/crew`,
nothing resolves to `--accent`, at rest, hovered or focused.

**Text.** Every string from the feed is rendered as text (React's escaping; no
`dangerouslySetInnerHTML`, no Markdown): a moment `"<b>bold</b> &amp; more"` shows those 22
characters, and the panel holds no `b` element. Nothing from the feed is cut or ellipsed.

**Times.** Every time on `/crew` is UTC: `HH:MM` is 24-hour, zero-padded; `{d Mon}` is the day
without a leading zero and the English three-letter month ("4 Oct", "24 Oct").

**The bar,** a `header` before `main`, `nav[aria-label="Main"]` with these links in this order:
| Label | `href` on `/` | `href` elsewhere |
|---|---|---|
| Work | `#work` | `/#work` |
| Crew | `/crew` | `/crew` |
| Log | `/sprints` (`/log` once #77 merges) | the same |
| Contact | `#contact` | `/#contact` |
| Read as page | `/read` | `/read` |
- On `/` the wordmark stays plain text and the control stays in the bar's slot (#77's slot, taken
  verbatim). On `/crew` the wordmark is `a[href="/"]`, Crew has `aria-current="page"`, and the
  header holds no `button` and no `[data-motion]`.
- From 1024 px Read as page is the right-most link, before the control on `/`.
- From 768 to 1023 px the five links and, on `/`, the control are on one line inside the bar.
- Below 768 px the bar holds Work, Crew, Log, Contact; Read as page is not shown in it. On `/` it is
  in `main` at the drawing's foot, at the left of the control's row, underlined, a 44 px target, as
  `rest-390.webp` draws it (the moved assertion, for the owner). On `/crew` its place below 768 is
  Iris's (placeholder: the drawing's foot, alone), and it must be reachable and shown.
- Targets: at least 24 × 24 from 1024 px, 44 px tall below it.

**The page.** `/crew` answers 200, scripts on and off: the skip link first, then the bar, then one
`main#main[tabindex="-1"]` holding `[data-plan]` (the drawing, `aria-hidden` as on `/`) and
`section[aria-labelledby="crew"]` (the panel, with `[data-crew-state]`). In the panel, in DOM
order: `h1#crew`, `a[data-close][href="/"]` named "Close" (the frame's ×), `[data-chip]`,
`[data-status]`, the crew `table` (`th[scope="row"]` the name, then the role word, then
`td[data-state]` with the state word, then the line), the activity, then a `dl` with Evidence,
Approval and Rules. Metadata: title "Crew — {profile.name}", a description ("A crew of AI agents
rebuilds this site in public. This page shows who is working on it now, and who approves the
work."), canonical and `og:url` `/crew`; and since it sets `openGraph`, it re-exports the site's
card as `app/read/opengraph-image.tsx` does, so it carries exactly one `og:image` and one
`twitter:image` (`app/layout.tsx`'s note: a route that sets its own `openGraph` loses the root's
image). The sitemap gains `/crew`.

## The bar's fit, measured

On production (`https://theseus-portfolio.vercel.app/`, today's four links), with a fifth link
"Crew" cloned after Work in the page (same classes), box edges in CSS px:

| Width | Today | With Crew | Verdict |
|---|---|---|---|
| 320 | links 87 to 310, wordmark ends 73 | links 73 to 337, the bar 17 px wider than the viewport | five don't fit |
| 390 | links 120 to 380, wordmark ends 78 | links 78 to 387: Work's target starts on the wordmark's edge (0 px) and Read as page ends 3 px from the viewport's | five don't fit with any air |
| 768 | links 283 to 548, control 566 to 752, wordmark ends 83 | links 234 to 548, control 566 to 752, no overflow | **fits, 151 px clear of the wordmark** |
| 1024 | links 151 to 332, Read as page 722 to 818, control 842 to 984 | Crew 216 to 253, the rest as today | fits |
| 1440 | links 156 to 339, Read as page 1136 to 1234, control 1258 to 1400 | Crew 222 to 260 | fits |

Below 768 the bar holds four links. From the widths measured above (Work 49, Crew 49, Log 37,
Contact 70 at 390; 41, 41, 33, 60 at 320), Work, Crew, Log, Contact span 175 to 380 at 390 (97 px
clear of the wordmark) and 135 to 310 at 320 (62 px clear). At the drawing's foot on `/` the
control's group is at 191 to 374 at 390 and 145 to 304 at 320 (production), so Read as page (104
px at 390, 89 at the small step) fits at its left with 71 and 40 px to spare.

**So the nav's DOM keeps all five links at every width** (Read as page `display: none` in the bar
below 768), and below 768 `/` adds a second `a[href="/read"]` "Read as page" in `main`, before the
control's slot in DOM order and in its row, shown only below 768. That keeps the Tab order "Read
as page, then Full, Calm, Off" at 390 (B3.22 runs unedited), and only one Read as page is ever
shown or focusable.

## Checks

Probe writes these first, in `e2e/crew.spec.ts` (and `e2e/crew-bar.spec.ts` if it grows), from
an oracle that implements the data rules over the fixture files; each title carries its number.
"Fixture" checks run on the harness below; the rest on the default server, which has no
`CREW_FEED_URL` and so is the down state.

**B4.1 The route.** `/crew` is 200 with scripts on and off: the skip link is the first `a` and lands
on `main#main[tabindex="-1"]`; one `main`, one `h1` "Crew"; `[data-plan]` is `aria-hidden` and its
`path[data-plank]` ids and `data-sprint`s equal `/`'s `[data-plan]`'s, and nothing in it is hatched
(the chip may be: it is the pencil swatch); `/crew` has no `canvas`, `[data-model]` or `[data-motion]`; the panel is
`section[aria-labelledby="crew"]` with `[data-crew-state]`, its parts in the data rules' DOM order.
Title, description, canonical and `og:url` as the data rules say, one `og:image` and one
`twitter:image`, each fetched 200 as `image/png`; the sitemap lists `/crew`.

**B4.2 Down, honestly.** On the default server, and on the harness while the fixture server
answers 503, answers 200 with `asOf` 11 minutes old, answers `version: 2`, answers a body that
isn't JSON, and answers after 2,500 ms: `[data-crew-state]` is `down`; `[data-status]` reads "The
live feed isn't answering. Here is the latest revision on record."; the chip is the record's number
and goal (the oracle's newest `MERGED` entry: today 29 and its goal); seven rows in roster order,
each name and role word as the table says, every `td[data-state]` empty and no line; no activity
heading, no `ol[data-moments]`, no `[data-now]`, no Studio link; Evidence's "Pull request #{pr}"
links the record's PR on this repository; Approval and Rules read as the data rules say.

**B4.3 Live, from the live fixture.** `[data-crew-state]` `live`, `[data-status]` "Live"; the chip,
the seven rows (order, names, role words, state words, lines), `[data-now]` ("now" and the text),
the activity heading and each `li`'s `time[datetime]`, shown time and text, Evidence and Approval
equal the oracle's. With the fixture switched to `health.quote: true` (and `now` equal to
`health.line`), `[data-now]` holds "Atlas:" and one `q` with the text. On the same server `/` is
the sheet as on the default server: no `[data-crew-state]`, none of the fixture's strings, nothing
resolving to `--accent`.

**B4.4 Open, from the open fixture.** `[data-crew-state]` `open`, `[data-status]` "Waiting on the
owner", no `[data-now]`, a role the fixture marks `working` reads Waiting, Approval "{owner}, on the
pull request. Not given yet."; with the fixture's `health.state` switched to `quiet`,
`[data-status]` reads "Paused" and Approval the live sentence.

**B4.5 Resting, from the resting fixture.** `[data-crew-state]` `resting`; `[data-status]` "Crew
resting. Sprint {n} merged {d Mon}, {HH:MM} UTC." from `last`; every called role reads Done; the
chip, rows, activity and Evidence are `last`'s. With `last.sprint` a merged retro's number (the
fixture uses 29), Approval follows that retro's `ownersCall`; switched to a number with no retro
(999), Approval reads "Merged."; switched to `mergedAt: null`, the status drops the time.

**B4.6 State words and copper.** In each of the four states, in both schemes, at rest, with each
link hovered and with each link focused: every element whose text colour, border, outline,
background, fill, stroke or text decoration resolves to `--accent` is a Working row's dot or word,
or `[data-now]` or inside it. In `live` at least one Working word and `[data-now]` are copper; in
`open`, `resting` and `down` nothing is. The state words are exactly Working, Waiting, Done, "Not on
this sprint" (or empty in `down`). Copper text meets 4.5:1 on the background in both schemes.

**B4.7 UTC.** The harness's `next start` runs with `TZ=Pacific/Kiritimati` (UTC+14) and the browser
with `timezoneId: "America/Los_Angeles"`: every shown time equals the oracle's UTC `HH:MM`, the
heading's day is the newest moment's UTC day, and the fixture's moment from the previous UTC day
shows "{d Mon} HH:MM". Each `time[datetime]` parses to the fixture's instant.

**B4.8 The feed's text is only text.** In the live fixture: the moment whose text is `<b>bold</b>
&amp; more` shows exactly that string as its text, and the panel has no `b` element and no element
the fixture's strings could have made; the unknown-kind moment is absent and the list counts only
valid moments; the unknown-role entry adds no row (still seven); the moment with an unknown `who`
is present; the PR on another repository (`https://github.com/someone/else/pull/76`) shows "Pull
request #76" as text with no link; a run `url` on another origin isn't linked. No `href` on
`/crew` but the site's own, `https://github.com/nycruslan/theseus-portfolio/pull/<n>`, and the
fixture server's own origin's `/studio/runs/…`.

**B4.9 The bar on `/crew`.** At 320, 390, 768, 1024 and 1440: the wordmark is `a[href="/"]`; the
nav holds Work `/#work`, Crew `/crew` with `aria-current="page"`, Log, Contact `/#contact`, Read
as page `/read`, in that order, and no other `aria-current`; no `button` or `[data-motion]` in the
header; the shown links are each a target inside the viewport (24 × 24 from 1024, 44 px tall
below), on one line (tops within 0.5 px), with no overflow of the bar or the page; from 768 all
five are shown, below it four, and Read as page is shown and reachable somewhere on the page (its
place is Iris's). At 390 and 1440 each lands: Work and Contact on `/` with `#work` and `#contact`
in view and clear of the bar, Crew on `/crew`'s `h1`, Log on its page's `h1`, Read as page on
`/read`'s.

**B4.10 The bar on `/` from 768 to 1023.** At 768 and 1023 the five links and the control's three
buttons are shown in the bar on one line (tops within 0.5 px of their row's), inside the viewport,
with no overflow; Read as page is the right-most link and the control right of it.

**B4.11 Close and Back.** At 390 × 844 and 1440 × 900: from `/`, Crew lands on `/crew` with its
`h1` in view; Close (`a[data-close]`, named "Close", a 44 px target below 1024 and 24 from it)
lands on `/` with the owner's name in view; from `/` again, Crew then the browser's Back lands on
`/` with the owner's name in view.

**B4.12 The first screen.** On the live fixture at 1440 × 900: the `h1`, `[data-status]`, all seven
rows and `[data-now]` start inside the viewport; at 390 × 844: the `h1`, `[data-status]` and the
first row do. Both schemes.

**B4.13 The route sweeps on `/crew`.** `ROUTES` gains `/crew` (200), so every sweep that loops over
it runs here with the same assertions and a title that names it: tokens for every text colour and
size and body text at least 16 px; axe with the strict tags, with and without the skip link
showing, in both schemes; with scripts off the first paint has the scheme's background;
nothing overflows at 320; every link at least 24 × 24 on a phone; one `main`, each section a
region named by its heading, no skipped level; nothing animates at load, 2 s later, or after a
scroll to the bottom and back; no `TODO(owner)` value renders; in forced colours each focused link
shows exactly one ring (keyboard's B2.9). Also on `/crew`, which the contrast test (`meetsContrast`,
`/` only) doesn't visit: text meets its contrast thresholds in both schemes; with scripts off the HTML holds the
panel's state, rows and Rules as with them on; Tab visits the skip link, the wordmark, the shown
bar links, Close, then Evidence's links, in DOM order, each with one ring of 2 px ink 2 px out in
both schemes. And on the live fixture, in both schemes: axe (strict tags), the token sweep and
contrast, so the copper text is held to them too.

**B4.14 Text first, the framework's script alone.** On `/crew` (default server) at 1440 × 900 and
390 × 844, at 4× CPU, the last largest-contentful-paint candidate is text in `main`, outside
`[data-plan]`, with no `url`, within 2,500 ms. `/crew` requests exactly the 404's script files (by
path) and the same decoded bytes; B2.10's list gains `/crew`, within 2,048 B of `/sprints'` (`/log`'s
once #77 merges) by B2.10's method (decoded bodies, fresh context). `/crew` loads two woff2 within
86,016 B.

## The harness

Forge measured the read (`lib/crew-feed.ts`, `"use cache"` with `cacheLife({ stale: 30,
revalidate: 30, expire: 300 })`) on a production build, as relayed by Atlas:
- the build stays static under `ensureStatic` (the route table prints `○ /crew 30s 5m`), and built
  with no `CREW_FEED_URL` its HTML holds `data-crew-state="down"`;
- a `next start` with the variable set, on a build without it, serves the build's down page until
  the prerender is 30 s old, counted from the build, not the start; the first request past that is
  stale and regenerates in the background, reading the feed once; the next request shows the
  fixture's state (measured: requests 1 to 5 down, request 6 live);
- a fixture that changes its answer is followed on the request after the next stale one: about
  30 s at worst, and every regeneration reads the feed afresh;
- two `next start`s on one `.next` share the route cache on disk (last writer wins), so one
  server's first answer can show the other's state;
- built with the variable set, the state is in the HTML.

**The mechanism.** Probe's spec starts a fixture server (`e2e/crew-feed.ts`, node `http`, no
dependency) on one of her ports, and its own `next start` (`node node_modules/next/dist/bin/next
start`) on a scratch copy of the prebuilt `.next` (without `.next/cache`, `node_modules` linked),
with `CREW_FEED_URL` pointed at the fixture server and `TZ=Pacific/Kiritimati` (B4.7). The copy
means the two servers never share a route cache. The PID is killed in teardown. No second
`webServer` goes in `playwright.config.ts` (an owner path). The spec runs serially.

**The polling rule.** After every switch of the fixture server's answer, the spec requests `/crew`
until `[data-crew-state]` is the expected state, and the expected strings for the variant are on
the page, with a deadline of 40 s named in the test. It fails with the last state seen. No check
asserts on a first response. The route sweeps (B4.13), B4.1, B4.11, B4.14 and the down check on
the default server run on the default server, which reads no feed and shows `down`. If the copied
`.next` proves fragile, the fallback is one `.next` with polling everywhere, the down check
included. Probe says which one ran.

**The fixture server must:**
- serve `GET /api/crew` with the feed contract's headers;
- switch while running between the live, open and resting fixtures and their variants (quote,
  `quiet`, `last.sprint` 999, `mergedAt` null), 503, a stale `asOf`, `version: 2`, a non-JSON body
  and a 2,500 ms delay;
- **stamp `asOf` with its own clock on every answer** (except the stale variant). Otherwise every
  fixture turns down 10 minutes after it was written.

## Build notes (Forge)

- **Where `asOf` is judged.** The 10-minute rule reads the clock inside the `"use cache"` scope, so
  staleness is judged when the feed is read, at most every 30 s while visitors come. The data
  rules' "render" means that read. On production, after 5 minutes without a request, the page is
  regenerated on the request, bounded by the read's 2 s timeout.
- **A first response is the build's, not the feed's.** A server started with the variable on a
  build without it serves `down` until the prerender is 30 s old, and shows the feed one request
  after that. Nothing in the page or its checks may assume the first response reflects the feed.
- **Two servers on one `.next` share `/crew`'s cached HTML.** Never run a check against a server
  whose `.next` another server is writing.
- **The bar.** Take #77's slot change to `components/bar.tsx` and `app/page.tsx` verbatim first
  (`.crew/sprint/31/decisions.md`, 4), then add Crew and the second Read as page at the foot.

## The live checks: keep, rewrite, retire

`expect(` counts are `.crew/scope.mjs`'s (its regex, comment lines dropped) on this branch today;
a rewrite ends each file with at least as many. Nothing retires.

| File (`expect(` today) | Test | Disposition |
|---|---|---|
| sheet.spec.ts (46) | B2.3 "the labelled bar" | **rewrite**, same assertions over five links: `LINKS` gains Crew `/crew` after Work; from 768 the shown controls are the five links then Full, Calm, Off; at 320 and 390 the shown bar links are Work, Crew, Log, Contact, and Read as page's "in the bar" becomes "in `main` at the drawing's foot, before the control's slot, a 44 px target inside the viewport" (**the moved assertion, for the owner**); Read as page right-most at 1440; Crew lands on `/crew`'s `h1` at 390 and 1440, Read as page lands from the bar at 1440 and from the foot at 390; `targets` reads the shown links only, as `controls` already does (the hidden Read as page's box is 0 × 0) |
| sheet.spec.ts | B2.3 "the bar stays above the facts" | **rewrite**: `LANDINGS` gains `Crew: "/crew"`; the rest unchanged |
| keyboard.spec.ts (39) | B2.3 "Contact's first link is the 15th Tab stop" | **rewrite**: the 16th, with `/crew` after `#work`; `tabUntil`'s default bound rises from 15 to 16 (a harness change: the project-link and Contact `tabUntil`s each gain one stop) |
| keyboard.spec.ts | B2.9 forced colours on `/read` and the 404 | **rewrite**: adds `/crew` (200), the title names it |
| helpers.ts (0) | `ROUTES`, `STATUS` | **rewrite**: `/crew` with 200 |
| invariants.spec.ts (27) | the seven tests that loop over `ROUTES` (ten runs: tokens, axe and the first paint in each scheme; overflow at 320; targets; regions; nothing animates) | **rewrite**: titles name `/crew`; assertions unchanged |
| content.spec.ts (2) | "no TODO(owner) value renders" | **rewrite**: the title names `/crew` |
| read.spec.ts (39) | B2.10 | **rewrite**: the list gains `/crew`; the title names it |
| read.spec.ts | B2.11 | **keep**: `toContain` holds with `/crew` in the sitemap |
| motion.spec.ts (22) | B3.16 "the control" | **rewrite**: the bar's links are Work, Crew, Log, Contact, Read as page (in the DOM at every width) |
| motion.spec.ts | B3.23 "the fallback face" | **rewrite**: at 320 and 390 the bar's *shown* links are Work, Crew, Log, Contact, on one row, each label on one line (a hidden link's box is all zeros, so it must be filtered as B2.3 filters) |
| model-teardown.spec.ts (10) | B3.8 "it cleans up" | **rewrite**: at 390 it follows the shown Read as page (`a[href="/read"]:visible`), at the drawing's foot; at 1440 the bar's |
| motion.spec.ts | B3.22 forced colours and the keyboard | **keep**: at 390 the foot's Read as page precedes Full, Calm, Off in DOM order, so "Tab reaches Read as page, then the three buttons" holds |
| sheet.spec.ts | B1.6 nothing is copper | **keep** on its four routes; `/crew` gets B4.6 instead, since copper is allowed there in `live` |
| every other spec | B1.1 to B1.11, the B2 and B3 suites, `not-found`, `smoke`, `sprints*` | **keep**, unedited: the default server reads no feed, `/` changes only by the bar |

`motion.spec.ts` and `model-teardown.spec.ts` weren't in the brief's list, but they read the bar's
links and click Read as page in the bar at 390, so without their rewrites B3.16, B3.23 and B3.8
go red the moment the bar changes.

## Budgets

| Measure | Budget | Check | Today |
|---|---|---|---|
| Script on `/crew` | the 404's files exactly; within 2,048 B of `/sprints'` | B4.14 | production: `/sprints` and the 404 each 5 files, 459,340 B decoded; `/read` 6 files, 460,072 B |
| LCP on `/crew` | text in `main`, outside the drawing, within 2,500 ms at 4× CPU | B4.14 | `/`'s B1.9 holds the same |
| Fonts | two woff2 within 86,016 B | B4.14 | B1.10 on `/` |
| Feed read | 2,000 ms, then down; held at most 30 s | B4.2 (the 2,500 ms answer) | none yet |
| Staleness | `asOf` over 10 minutes is down | B4.2 | none yet |
| Targets | 24 × 24 from 1024; 44 px tall below | B4.9, B4.11, B4.13 | B2.9 |
| Overflow | 0 from 320 to 1440 | B4.9, B4.13 | B2.9 |
| `/`'s script | unchanged: 2,048 B of `/sprints'` (10 B left, sprint 27) | B2.10 | the bar's slot from #77 removes no byte and adds none |

## Out of scope

- `/` reading the feed: the pencil plank, copper, the rest line and the legend's swatches (B4b).
- Live updates in the browser, `/api/crew`, Pause updates and the `aria-live` now line (B4c).
- The 3D and the motion control on `/crew`, and one mark per moment (B4d); Replay (B4e).
- `/crew`'s own share card (a follow-up): the route re-exports the site's card, so it keeps one
  `og:image`, as `/read` does.
- Kind labels on moments, `who` shown separately, setbacks, guards, meetings and objections.
- Any change to `content/` or an owner path.

## Riders

| Rider | Disposition |
|---|---|
| The roadmap's "B4's contract re-lays the phone bar" | **Rides**: this contract does it |
| Lens's nit on #74 (`components/model.tsx`, about 3 B) | **Doesn't ride**: B4a doesn't touch the model; B4b or B4d |
| The facts, fonts and model riders | **Don't ride**: B4a declares no font and touches no fact or model |

## Needs decision (Iris), before the look is fixed

1. The panel's layout at 390, 768, 1024 and 1440 (the frames), and whether "Not on this sprint"
   rows fold into `p[data-absent]` below 768.
2. Read as page's place on `/crew` below 768 (no control there until B4d).
3. The moments' words for a non-engineer: the feed's text is the Studio's own ("Roll call: GO ·
   5/5" means nothing to a board member). B4a shows it verbatim and no kind label; Iris says
   whether a kind label per moment, or leaving some kinds out of the panel, is worth a later
   sprint.
4. The words I wrote that a designer may tighten without changing the facts: "Paused", "This run
   on the Studio", "The pull request opens at the close-out.", the down line's second sentence, and
   the live Approval sentence. Atlas relays any change to Probe and Forge together.

## Needs owner decision, on this PR

1. **Read as page moves below 768** from the bar to the drawing's foot on `/`, as `rest-390.webp`
   draws it (the B2.3 rewrite's moved assertion).
2. **`CREW_FEED_URL`** set on the portfolio's Vercel project, server-side, for Preview and
   Production, to the feed's URL. Until it is set, `/crew` shows the down state.
3. **The now line's quotes**, shown and marked (feed contract, decision 4): seen on the preview
   when only Atlas is working.
4. **The Rules copy** in the data rules (decision 5), in place of the frame's untrue line.
5. **The link to the run's page on the Studio** in Evidence (decision 7).
6. **This PR merges only once the real feed answers on its preview**, `/crew` showing `live` or
   `open` for this sprint's own run.
