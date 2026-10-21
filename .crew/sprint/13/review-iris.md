Verdict: ship (7.7/10, better than production; advisory, calibration folder still has no owner examples)

# Sprint 13: Iris's review of `/sprints` (PR #39)

Reviewed at cb48516 on a local `pnpm build && pnpm start -p 3361`. Production is unreachable from the
sandbox (CONNECT 403), so a build of `origin/main` (c2acb08) in a scratchpad worktree, served on 3362,
stands in for it. Browser: agent-browser `--session iris` for the captures, plus Playwright scripts for the
measurements. Widths were 320, 390, 768, 1024 and 1440, in light and dark.

## Against production

**Better.** `/` is pixel-identical to main at 390, 1024 and 1440: the full-page PNGs are byte-identical,
`main` is 17587 characters on both and the titles match. `/sprints` is new. It's the ledger the
direction asked for, in the home page's own language, and none of §7's fail-on-sight list shows up
anywhere on it.

## Hard gates: all pass

- **Placeholder:** none added. The back link renders `profile.name`. Sprint 1's third item quotes
  'Company name' inside a sentence, which is retro text and not a stand-in.
- **axe:** zero violations at all five widths in both schemes.
- **Detector:** URL scan of `/sprints` shows only `overused-font` (Geist) at warning level, the same
  as main's `/`. Nothing at error level.
- **Reduced motion:** the h2 `section-rise` is `none` under `reduce` (opacity 1, transform none).
  It's rise-only, so there's no contrast band at load.
- **320 reflow:** `scrollWidth - innerWidth = 0` at every width.
- **Phone budget:** at 390×844 with 4× CPU and slow 3G, LCP is the lede `p` at 580 ms and CLS is 0.

## Direction §3 to §7, measured

- **Hang from 768:** the number's right edge is 16 px off the goal at 768, 1024 and 1440 (for example
  363–392 to 408 at 1440). 12, 10, 9 and 1 right-align on one edge, and the number's top equals the
  h3's top, so the two share a baseline.
- **Forge's real space below 768:**
  - The gap from number to goal measures 5 px at 320 and 390, the same as the `0.5ch` it replaced.
  - From 768 the goal's left equals the column's left, so the space collapses and nothing indents.
  - Accepted.
- **Dots:** `left: -12px`, centred on the first line (top 11.3 px at 320, 12.9 at 1440). Each item's
  left equals the column's at every width.
- **Meta line:**
  - The PR links are 24 px tall everywhere.
  - At 320 two meta lines wrap, each after "Owner's call ·", with the link whole on line two.
  - No line starts with a dot.
- **§7:**
  - No element in the log has a background or a radius (count 0).
  - No svg or canvas.
  - Copper only on links.
  - Dark needs no override and reads the same as light.
- **Title:** "Build log — Ruslan Shulga" uses the same em-dash form as the home page's title. Accepted.

## Scores

| Criterion | Score | Why |
|---|---|---|
| Design quality ×2 | 8 | One page, one column, one voice with `/`. The hung numbers give the ruled log its margin, and it reads calm in both schemes. |
| Originality ×2 | 7 | The gutter numbers and the drawn dot are this site's own marks, not a timeline template. It's restrained by design, so there's no single memorable moment. |
| Craft ×1 | 8 | Every measured value lands on spec. The one miss is finding 1. |
| Functionality ×1 | 8 | Tab order runs skip link, back link, then the PRs in order, with the shared 2 px ring. The targets are 24 px, and the numbers are the scan anchor. |

Weighted: (16 + 14 + 8 + 8) / 6 = **7.7/10**.

## Findings

1. **The PR link's focus ring touches the dot before it (cheap; advisory, not blocking).**
   - The meta separator is NBSP, then `·`, then a space. The space measures 3.3–3.4 px from the dot's
     glyph box to the link, but the shared ring sits 4 px outside the link (2 px offset plus 2 px
     width). On focus, the ring's left side runs into the dot at every width.
   - See `focus-pr-1440.png` and `focus-pr-zoom.png`.
   - Fix: wrap each separator's dot in its own `span` with `mx-1`. That gives about 7.4 px on both
     sides, so it stays symmetric, and the ring then clears the dot by about 3 px.
   - Leave the shared ring alone. `textContent` is unchanged, so C4.2's " · " join should hold, but
     Probe confirms that.
   - A slightly airier meta line also reads better at 13.5 px than the current tight join.
2. **A short goal balances into a narrow two-line block (no change).**
   - At 1024 and 1440, sprint 12's goal is just over one line long. `text-balance` splits it into
     two lines about 330–350 px wide in a 624 px column.
   - It's the same rule the Experience h3s use, and it's my own spec. I accept it as the house's
     behaviour.
3. **Straight apostrophes and quotes (no change in this PR).** The site uses straight `'`
   everywhere: the owner's `content/`, the lede, and the retros, which are published verbatim by the
   owner's decision. A curly-quote pass would be a site-wide typography item for the owner, not this
   route's.
4. **Length (expensive; for Quill, later).**
   - The page is 5922 px tall at 1440 and 8268 px at 320 with 12 entries. Each entry adds about
     600–700 px on a phone, and the chain can add six a day.
   - The direction rules out filters and pagination, and that's still right at this size.
   - Past about 30 entries, I'd want a quiet grouping (a rule-and-label per roadmap item or per month,
     in the Section-label style) before anything interactive. I'll take a position when it gets there.

## Screenshots

All in `/tmp/claude-0/-home-user-theseus-portfolio/690e0f39-49b7-5e7f-9425-9dd8785677e2/scratchpad/shots/`:
- `sprints-{320,390,768,1024,1440}-{light,dark}.png`: the first viewport at each width and scheme.
- `sprints-{320,390,768,1024,1440}-{light,dark}-full.png`: the full page at each width and scheme.
- `crop-320-dark-a.png`: the meta line wrapping at 320.
- `crop-1440-light-end.png`: the page's end.
- `focus-pr-1440.png`, `focus-pr-zoom.png` and `focus-back-1440.png`: the focus rings.
- `home-{390,1024,1440}-{3361,3362}.png`: `/` on the PR and on main, byte-identical.

## Not verified

- Production itself, since main stood in for it.
- Hover colour, beyond confirming the classes match `/`'s links.
- Print.
