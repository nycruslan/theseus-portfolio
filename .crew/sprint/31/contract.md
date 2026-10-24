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
- `asOf` is more than 10 minutes (600,000 ms) before the render's clock.

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
- In `live` or `open` with no PR: "The pull request opens at the close-out."

**Approval,** `[data-approval]`, `{owner}` being `profile.name`:
- `open` with "Waiting on the owner": "{owner}, on the pull request. Not given yet."
- `live`, and `open` "Paused": "Not given yet. The pull request merges only after the checks,
  Lens's review and {owner}'s rules pass; anything they reserve waits for him."
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
