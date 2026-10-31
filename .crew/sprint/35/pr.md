## Sprint 35: `/crew` live in the browser (B4c)

**Goal (roadmap):** B4c, the third build sprint of B4, as sprint 28 planned it
(`.crew/sprint/28/b4-plan.md`, B4.3): a visitor who stays on `/crew` sees it move.

**Size:** M. Contract: `.crew/sprint/35/contract.md` (Quill, B4.25 to B4.32). Decisions:
`.crew/sprint/35/decisions.md`. Iris's calls: `notes-iris.md`; her review: `review-iris.md`.

### What a visitor gets

- **`/crew` follows the feed while they watch:** one poll right after load, then every 30 s while a
  run is live and 60 s otherwise, through the portfolio's own `/api/crew` (the browser never calls
  the Studio). A run that ends turns into the rest state in one poll. Updates replace content in
  place: no motion, no "updated" stamp, and an unchanged answer changes nothing in the DOM.
- **"Pause updates"** (WCAG 2.2.2), a button in a new status row right-aligned with Close,
  `aria-pressed`, hidden until the poller starts (so no dead control with scripts off). Nothing
  polls while it's pressed or the tab is hidden; un-pausing or showing polls at once.
- **A screen reader hears who started or stopped working,** in one polite region, and nothing else.
- **A failed poll keeps the last good panel** for 10 minutes from the last good answer, then shows
  B4a's down panel.
- The open state's "Paused" reads "Between sessions" (Iris: next to "Pause updates" it read as the
  visitor's own pause).
- **`/` is unchanged:** 0 B of new script and no `/api/crew` request. A blank feed goal now reads as
  no goal everywhere (Lens's nit on #87, fixed once in `readCrew()`).

### `/api/crew`

`ƒ` (dynamic through `connection()`, so it never answers the build's state), 200 in all four states
with `{version: 1, state, run}`, `Cache-Control: public, max-age=0, s-maxage=30`, only the feed
contract's fields, and never the feed's address. POST is 405.

### The checks

B4.25 to B4.32 (`e2e/crew-live.spec.ts`, oracle and clock harness in `e2e/crew-live.ts`; B4.32 in
`e2e/live-layer.spec.ts` on B4.16's quiet site). Red before the build: the new spec 8 of 8 failed,
the full suite 219 passed and 11 failed (the new checks and the edited kept ones), all for the
missing feature. Proven against three mutants of a scratch poller (`<` for `≤` in the 10-minute
rule, announcing from down, moments keyed by index), each caught. Green after: crew-live 8 of 8
(1.0 min) and 103 of 103 of the crew, live-layer, read, invariants, keyboard, crew-bar, sheet,
motion, not-found and smoke specs on Forge's build; `pnpm verify` green on the integrated head.
The model and log specs were not run locally; CI runs everything.

**Kept checks edited, nothing retires:**
- **B4.14 loosens, for Lens to accept:** `/crew`'s scripts go from "exactly the 404's" to "every
  file the 404 loads, plus at most 16,384 B". The plan the owner merged in #75 says B4.3 sets
  `/crew`'s own budget from a measurement; it measures 13,659 B over (one chunk), 2,725 B under.
  Same number of `expect(`s.
- **B2.10** drops `/crew` from its route list (it has its own budget now, above); every other
  route keeps every assertion, and `/` still meets 2,048 B.
- **B4.4** expects "Between sessions"; **B4.13**'s Tab order gains Pause after Close.
- Lens's test nits on 415b4c0: copper scans match `.swatch-tip`, B4.15's title, `crew-feed.ts`'s
  site-count comment.

### Iris

Ship, 8.1/10, no musts: every call built to the pixel (Pause shares Close's right edge at all four
widths, 0 px centring error), axe 0 at 1440 and 390 in both themes, pressed and not. Her two calls,
taken as follow-ups (`decisions.md` 8): the first visit after a quiet spell gets a stale prerender
the first poll corrects with a layout shift (a later sprint lengthens `/crew`'s cache `expire`), and
the Studio's long role lines reflow the table on about half the polls (a short line is the Studio's).

### Not verified

- The preview's CDN behaviour for `/api/crew` (`x-vercel-cache` MISS then HIT within 30 s): this
  session's proxy refuses preview hosts. `next start` passes the header through unchanged.
- A real screen reader hearing the region (checked in the DOM and accessibility tree), Safari, a
  real phone. CI's full-suite time against its 25-minute cap: the new spec adds about 1 min.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvZVVwBcuLab27sfcqt
