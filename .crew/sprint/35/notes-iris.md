# Sprint 35 (B4c): Iris's calls for `/crew` live in the browser

Iris, 2026-10-31. The plan gives me "the toggle in B4.3" (`.crew/sprint/28/b4-plan.md`). I made these
calls against the approved direction (`.crew/sprint/17/direction-iris.md`, `crew-1440.webp`,
`crew-390.webp`) and production's `/crew`. I prototyped three placements by injecting the markup and
CSS into production's page while sprint 35 was live on it, with five status strings at 1440, 1024,
390 and 320, in light, dark and forced colours, pressed and not. The shots and the script are in
`.crew/screenshots/35-iris/proto/`, which git ignores. Quill has these calls for the contract.

## 1. "Pause updates"

1. **The label: "Pause updates", in both states.** The visible text and the accessible name stay the
   same. `aria-pressed` (`false`, `true`) carries the state, and the label never changes to "Resume".
   A label that flips while `aria-pressed` also flips reads as "Resume updates, pressed" in a screen
   reader, which means the opposite. The element is `button[type="button"][data-pause]`, with no icon
   and no glyph.
2. **Where: in the status row, at its right end.** A `div` holds `[data-status]` and then the button,
   in that DOM order, so Tab goes Close, Pause updates, then Evidence.
   - The row is a grid: `grid-template-columns: minmax(0, 1fr) auto`, `column-gap: 16px`,
     `align-items: start`, `margin-top: 8px`. The status's own 8 px margin moves to the row.
   - The button's right edge is the panel's content edge, the same edge as Close's. Its top is the
     row's top.
   - The status's first line is centred on the button: `padding-top: calc((32px - 1lh) / 2)` from
     1024 px, and `calc((44px - 1lh) / 2)` below.
   - A long status wraps in the left column. The button never moves when the status changes.
   - Measured (light, live):

     | Width | Button box | Close box | Effect on the panel |
     |---|---|---|---|
     | 1440 | 1290 to 1400 × 191 to 223 (110 × 32) | 1356 to 1400 | Table top 239 (+7 px) |
     | 1024 | 874 to 984 × 185 to 217 | 940 to 984 | Resting status in 2 lines |
     | 390 | 235 to 374 × 460 to 504 (139 × 44) | 330 to 374 | Status column 16 to 219, table top 518 (+20 px); resting 2 lines, down 3 |
     | 320 | 165 to 304 | | Resting 3 lines, down 4; overflow 0 |

   - It shows in every state (live, open, resting, down), because the page polls in all four.
3. **The look: the motion control's cell, alone, in ink.**
   - Base: a 1 px solid `var(--foreground)` border, no radius, a transparent ground, ink text at
     weight 600, `line-height: 1` and `white-space: nowrap`.
   - From 1024 px: 32 px tall, `padding: 0 12px`, `--step-sm`.
   - Below 1024 px: 44 px tall, `padding: 0 16px`, `--step-base`.
   - Pressed: an ink fill with film text, as `[data-motion] [aria-pressed="true"]`. One grammar for
     "pressed" across the site, which matters once B4d puts Full, Calm and Off in `/crew`'s bar.
   - Hover, under `(hover: hover)` and only while unpressed: `background: var(--rule)`.
   - It is never copper. There is no transition, and the cell changes state without animating.
4. **Focus:** the global ring, a 2 px `var(--foreground)` outline 2 px out. It clears the chip above
   (4 px at 1440) and the table below (12 px at 1440, 10 px at 390), and it stays inside the panel's
   padding at the right.
5. **Forced colours:** unpressed, the system's ButtonText border and label. Pressed, as the motion
   control: `forced-color-adjust: none`, `border-color: Highlight`, `background: Highlight`,
   `color: HighlightText` and `outline-color: Highlight`. Without these, Chromium drops the fill and
   pressed looks exactly like unpressed (seen in `A-live-1440-forced-pressed.png`).
6. **Scripts off, before hydration, and print:**
   - The server renders the button itself, with `visibility: hidden` until the poller runs (for
     example `[data-pause]:not([data-ready])`). Its box is then exact in every font state, so CLS
     is 0, and there's no visible, inert control: sprint 22's rule.
   - Hidden this way it isn't visible, isn't focusable and isn't in the accessibility tree.
   - When it's shown it simply appears, with no fade.
   - Print: `display: none`, like Close.
7. **The open state's word changes: "Paused" becomes "Between sessions".** This is the status for
   `open` when `health.state` isn't `"waiting"` (the Studio's `quiet` or `changes`). A run's
   "Paused" right beside a "Pause updates" button reads as the visitor's own pause, or as its
   cause. "Between sessions" is true of both health states: the sprint isn't over, and no session is
   live this minute. It has no full stop, like "Waiting on the owner". Approval for that state is
   unchanged. Sprint 31's contract left this word to me. The change rewrites B4.4's open-variant
   assertion and the oracle's word.

## 2. How an update arrives

1. **No motion, in every setting.** That covers Full, Calm, Off, reduced motion or not, and the
   first update or the hundredth. New content replaces the old in place: no fade, slide, highlight,
   flash, "new" mark, count badge or "Updated hh:mm" stamp. A cue on every 30 s poll would be the
   ambient motion the plan rules out ("Nothing pulses"). The moment's own UTC time and the copper now
   line already say what's new.
2. **Only what changed changes.** A poll whose answer renders the same panel makes no DOM mutation
   in `.crew`, and hydration makes none either. The button's own attributes are the one exception.
   Text, row order and row count are the only things that change. Nothing else moves: no class,
   colour or layout change outside the changed rows.
3. **Moments:** every moment already shown keeps its `li` node, because the key is stable. A new
   moment inserts one `li` at the top, and at 10 the oldest leaves from the bottom. The heading's
   date follows the newest moment.
4. **The crew table:** a changed state re-sorts the rows at once, with Working first, as the
   contract orders them. A changed line replaces its text. Rows keep their natural height.
5. **Live to rest,** in one poll and at once: the status becomes "Crew resting. Sprint N merged …",
   the chip turns from hatched to seated, Working rows become Done, the now line goes, and copper
   leaves with it. Copper leaving is the only signal, and that's enough.
6. **Focus and selection survive.** An update never replaces a node whose content didn't change, so
   a focused toggle, Close or Evidence link keeps focus, and a selection inside an unchanged row
   stays. Leave scroll anchoring on: no `overflow-anchor: none` in the panel.

## 3. Paused, and a failed poll

1. **Paused:** nothing runs and nothing changes, except the button's pressed look. The panel keeps
   the last good answer, and copper and "Live" included. The visitor froze it, and the pressed
   button says so. There is no banner, no "paused at" line, and the status word doesn't change.
2. **Un-pressed:** I recommend one poll at once, so the panel catches up. Its answer arrives by the
   rules in section 2. Pause isn't persisted, so a reload starts unpaused: a returning visitor never
   lands on a page frozen without knowing it.
3. **A failed poll** (a status other than 200, an abort, or a body that isn't JSON) changes
   nothing. There are no error words, no change of state and no change to the button. The next poll
   runs at the normal cadence.
   - **Superseded by the contract (a7b033a), which is right:** a failed poll and a `down` answer are
     treated alike. The panel is kept while the last told answer is at most 10 minutes old, and past
     that it turns to B4a's down panel.
   - This is better than what I first wrote. A cold serverless instance answers `down` while the
     feed is only slow, so a `down` answer shouldn't change the panel at once.
   - Copper also never outlives its own 10-minute window unless the visitor paused.
4. **The live region** (`[data-announce]`, Quill's words): render it empty in the server's HTML, so
   a screen reader registers it before its first words. It announces nothing at hydration or while
   paused.

## What I steered away from

- **The toggle inline after the status text** ("Live [Pause updates]"): it pairs best with "Live",
  but it jumps about 350 px at 1440 when "Live" becomes the resting sentence, and it drops a line at
  390 and 1024. A control mustn't move when the content updates.
- **The toggle beside Close in the head:** it's stable, but it turns the frame's head (h1 and ×)
  into a toolbar that competes with the h1, and it sits two rows away from the Live label the plan
  ties it to.
- **A pause or play glyph, a checkbox square, or a label that flips:** each adds a second grammar
  for "on".
- **A fade or highlight on new rows,** and an "Updated" stamp: ambient motion, or text that changes
  on every poll.

## For my review of the running build

- The Studio's role lines run 4 to 5 lines at 1440 (about 200 characters), where `crew-1440.webp`
  draws one line each. Each report reflows the rows below it. I'll watch how often that happens on a
  real run before asking for anything. Clamping the lines would change B4a's "the line whole", so
  it's not B4c's.
- Checks I'll run on the preview, besides the contract's:
  - 0 mutations across an unchanged poll;
  - node identity of the moments across an added one;
  - focus kept across an update;
  - the forced-colours pressed cell;
  - the box with scripts off equal to the box with them on, at 1440 and 390;
  - overflow 0 at 320.
