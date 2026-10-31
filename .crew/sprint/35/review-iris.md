# Sprint 35 (B4c) review: `/crew` live in the browser (Iris)

**Verdict: ship, 8.1/10, on 4be5941.** It's **better** than production. Every hard gate passes, with
the reading of "nothing shifts after load" set out under Hard gates. I have no musts. Every one of
my calls (`notes-iris.md`) was built to the pixel, and every behaviour measured as called. Two
follow-ups need a decision from Atlas: the first visit after a quiet spell, and the role lines'
reflow. Both are measured below.

## How I looked

- **The build.** I built 4be5941 (product code identical to ab65494) in `/home/user/iris35` and
  served it on port 3391. Its `CREW_FEED_URL` was the real Studio feed, so the panel showed sprint
  35 at work: our own lines, including mine. The Vercel preview's host is refused by this session's
  proxy. chrome-devtools can't launch Chrome as root here, so I used Playwright's headless shell.
- **The runs.**
  - The real feed: 1440, 1024, 390 and 320 in light and dark, plus forced colours at 1440 and 390.
    Each load held the first poll 2.5 s, so I saw the server's paint and then the swap.
  - Every state from `page.route` answers on `/api/crew`: live, open waiting, open quiet, resting
    and down, at the four widths, in light, dark and forced colours.
  - Updates on Playwright's clock: an unchanged answer, a new moment, focus held, a role line that
    reflows, live to rest, Pause, and a failed poll.
  - Ten minutes of watching the real feed at 1440 and 390 (21 polls).
  - The phone profile (390, 4× CPU, 400 kbps, 150 ms).
  - The build's own prerendered page (`.next/server/app/crew.html`) served for `/crew`, to stand
    in for Vercel's PRERENDER.
  - Scripts off, axe, and impeccable's detector.
- **Production,** side by side at 390, 1024 and 1440 while both were live.
- **Shots** are in `.crew/screenshots/35-iris/`, which git ignores:
  - `real/`: the real feed, with `first-*` before the first poll, and `live-*`, `pressed-*` and
    `focus-*` after it;
  - `fixtures/`: the states (`state-*`), the updates (`upd-*`), the quiet spell (`quiet-*`) and
    the hover (`hover-1440.png`);
  - `prod/`: production;
  - `proto/`: the call-round prototypes.

## Hard gates

| Gate | Result |
|---|---|
| Placeholders | None added. |
| axe | 0 violations at 1440 and 390, light and dark, Pause pressed and not. Tags: wcag2a, 2aa, 21a, 21aa, 22aa and best-practice. |
| impeccable | 0 anti-patterns. One advisory, the chip's pencil hatch, which is deliberate and predates this sprint. |
| Reduced motion | Nothing moves in any state or update: `document.getAnimations()` is 0 after a new moment, a role change and live to rest. |
| 320 | Overflow 0 in every state, in both schemes and in forced colours. |
| Phone budget | Steady case (the poll confirms the page, as on any cache HIT): LCP 1,732 ms (a `td.crew-line`, text) and CLS 0.0000. Swap at load (the poll's answer differs from the page): see "The first visit after a quiet spell". |

**My reading of "nothing shifts after load".** Live updates move content by nature, and the owner
approved them in the plan (#75, B4.3), so I hold the gate to the page's own load. That load is
still: CLS is 0 when the first poll confirms the page, B4.30 records 0 mutations at hydration, and
the status row's box is the same with scripts on and off (849,191 551 × 32 at 1440; 16,460
358 × 44 at 390). The quiet-spell swap below is a live update that happens to land at load. Read by
the letter, it fails the gate at 1440. I don't make it a must, for the reasons there.

## Compared with production: better

At 390, 1024 and 1440, with both live (`prod/prod-*` against `real/live-*`), the panel is
identical except for the status row: "Pause updates" at the right end, which costs 7 px at 1440 and
20 px at 390. The difference a visitor feels is that it moves. In ten minutes my own row changed
from "Wait for the server, then read its crew page and API" to "Read the real-feed watch log", and
the moment "06:38 Forge: Finished" arrived. Production's panel never moves after load. On
production right now, the first visitor after a quiet spell gets "Here is the latest revision on
record." while the crew is live, and keeps it. The build tells them within one poll.

## The calls, as built

- **Place (call 1.2): exact at every width.**

  | Width | Button | Close | First line's centre against the button's |
  |---|---|---|---|
  | 1440 | 1290 to 1400 × 191 to 223 | 1356 to 1400 | 206.9 / 206.9 |
  | 1024 | 874 to 984 × 185 to 217 | 940 to 984 | 201 / 201 |
  | 390 | 235 to 374 × 460 to 504 | 330 to 374 | 482 / 482 |
  | 320 | 165 to 304 × 425 to 469 | 260 to 304 | 447.3 / 447.3 |

  - The button never moved across live, open, resting and down. Only its row grew under a wrapped
    status.
  - At 390, resting wraps to 2 lines and down to 3. At 320, resting takes 3 and down 4. At 320 the
    down status runs 4 lines in a 133 px column beside the button. That's the rarest state at the
    rarest width, so I accept it.
- **Words (1.1 and 1.7):** "Pause updates" pressed and not. "Between sessions" on the quiet open
  run, beside the button, now reads as the run's state.
- **Look (1.3):**
  - Unpressed, it's ink on film in a 1 px ink frame.
  - Pressed, it's an ink fill (`pressed-1440-light`), and in dark a film fill (`pressed-390-dark`).
    That's the same grammar as the motion control.
  - Hover is `rgb(191, 202, 199)`, the `--rule` tint.
  - Never copper.
- **Focus (1.4):** one 2 px ring, 2 px out, clear of the chip and of the table's first row at 1440
  and 390. In forced colours it's one ring in the system colour (`focus-*`). I walked Tab at 1440 and
  390: skip link, Theseus, Work, Crew, Log, Contact, Read as page, Close, Pause updates, This run on
  the Studio, then the pull request.
- **Forced colours (1.5):** pressed is a Highlight fill with HighlightText (`pressed-1440-forced`),
  where my prototype without the rule showed pressed and unpressed identical.
- **Scripts off (1.6):** the button isn't visible and isn't a Tab stop. The stops run skip link,
  Theseus, Work, Crew, Log, Contact, Read as page, Close, then the Evidence links, and the row's box
  is the same as with scripts on.
- **Arrival (section 2), on the clock at 1440 and 390:**
  - An unchanged answer: 1 poll and 0 mutations.
  - A new moment: 2 mutations, one `li` in and one out. The 9 kept `li`s keep their nodes.
  - Focus held on the PR link and on Pause through a role change and a moment.
  - The announcement read "Lens started working." and then "Lens stopped working."
  - Live to rest in one poll, with no Working row and no now line left. The announcement read
    "Atlas stopped working. Forge stopped working. Lens stopped working. Probe stopped working.
    Iris stopped working."
  - 0 animations throughout.
- **Paused and failed (section 3):**
  - 180 s paused: 0 polls, and the only mutation is `aria-pressed`.
  - Un-pressing polls once at once and catches up ("PR #90 merged." arrives).
  - A 500: 0 mutations, no error words, and the status kept.

## Follow-ups (Needs decision, Atlas)

### 1. The first visit after a quiet spell

**What happens.** Production serves `/crew`'s build page to the first visitor after `expire` (300 s).
I read it at 06:35 UTC:
- `x-vercel-cache: PRERENDER`, status "Here is the latest revision on record.", while the crew was
  live;
- the next two reads were `HIT` with "Live".

With B4c, that visitor's poll at hydration swaps the roster panel for the live one. I served the
build's page for `/crew`:

| Case | Swap | CLS | LCP |
|---|---|---|---|
| 1440, rest answer | At 239 ms | 0.115 (`crew-table`, `crew-facts`) | |
| 1440, live answer | At 305 ms | 0.128 | |
| Phone profile, rest answer | At 5.2 s | 0.074 | Re-reported at 5,240 ms |
| Phone profile, live answer | At 5.4 s | 0.041 | Re-reported at 5,392 ms |

On the phone the largest text is a role line that only the swap paints.

**Why it isn't a must.**
- The cause is #88's PRERENDER page, not B4c.
- Without the poll at hydration, that visitor would see nothing of the crew for a minute.
  `PRODUCT.md` asks for the opposite.
- I found no fix inside B4c that holds: a per-request panel moves the cost to LCP on a cold Studio
  read (2 s timeout).

**Options for a follow-up sprint.**
- (a) A long `expire` for `/crew` alone, since its poll now corrects a stale page within a poll. At
  rest, which is most of the day, the stale page is still true, so nothing swaps. During a run a
  stale "Live" lasts at most until the first poll. `/` can't take this, because it never polls.
- (b) Leave it, as the honest trade.

I recommend (a), measured in its own sprint.

### 2. Role lines reflow the panel about once a minute

On the real feed, over ten minutes:
- at 1440 the table's height changed on 10 of 20 polls, by 23 px each time, and the now line and
  newest moment moved with it;
- at 390 they moved by 21 to 65 px on 7 polls.

On the fixtures, Atlas's line going from 4 lines to 1 moved the now line up 69 px at 1440 and 87 px
at 390.

The cause is that the Studio's role lines run up to about 140 characters (4 to 5 lines), where
`crew-1440.webp` draws one short line per role. Each move is instant and small, but the copper now
line, the thing a watcher reads, keeps hopping.

The cure isn't B4c's:
- (a) clamp the line to 2 lines from 768 and 3 below. That changes B4a's "the line whole" and hides
  the feed's words.
- (b) a short "doing" line from the Studio, as the frame has it. That's the owner's, since the crew
  doesn't work on the Studio.

I'd put (b) to the owner first.

## Nits (no action needed)

- On live to rest, the announcement names all five roles who stopped. That follows the contract. A
  single "Crew resting." would say the same more briefly.

## Scores

Design quality ×2, Originality ×2, Craft ×1, Functionality ×1.

| | Score |
|---|---|
| Design quality | **8.** The pause sits in the panel's grammar: Close and Pause share the right edge, and the site has one pressed look. The panel updates with no motion at all, which suits a drawing sheet. |
| Originality | **8.** An AI crew's working record, told as a title block that rewrites itself while you watch. Seeing my own line change on the page is the proof `PRODUCT.md` asks for. The pause is plain by design. |
| Craft | **8.** Every specified pixel lands, to 0.0 px on the centring. The role lines' jitter and the quiet-spell swap keep it off 9. |
| Functionality | **8.5.** A WCAG 2.2.2 pause, one polite region that says who started and stopped, focus kept, 0 mutations on an unchanged poll, no dead control without scripts, and failures that change nothing. |
| **Weighted** | **8.1** |

## What I couldn't verify

- The PR's Vercel preview: its host is refused by this session's proxy.
- Safari's `1lh` and scroll anchoring.
- A real phone or a GPU.
- My `down` shots at 390 and 320 through the routed build page painted the fallback face (the
  button measured 147 px against 139). The down line counts above come from the prototype, with the
  font loaded.
