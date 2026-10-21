# Iris: design review of PR #12 (sprint 2, dark mode) at 2a33b48

Verdict: changes 6.8/10

Advisory: `design/calibration/` still holds only its README, so these scores aren't calibrated and
don't bind anyone. Nothing in this diff needs to change. The verdict is `changes` for two reasons,
and neither one is the builder's to fix:

1. **The placeholder hard gate fails.** That's owner content in `content/profile.ts`, the same as on
   main. This sprint can't change it (`decisions.md` item 4). Only the owner can fix or waive it.
2. **The weighted score is 6.8, under the 7.0 pass bar.** Originality holds at 6 because the layout
   is out of scope until item 3. That's the sprint 1 owner question that's still open: does the
   absolute 7.0 bar apply to a scoped sprint that can't touch layout?

If the owner waives the gate and says scoped sprints are judged on their scope, this is a ship. The
dark theme does what I set out in `direction.md`, and light is pixel-identical to main.

## First verdict: better than production

Production can't be reached from this sandbox (the proxy refuses it), so `origin/main` at `03cff89`
stands in for it. I built it from a `git archive` export in my scratchpad, and built this head
(`2a33b48`) in my own worktree. I served both with `next start` (ports 3461 and 3462) and rendered
them in Chromium 1194 at 320, 390, 1024 and 1440, in light and dark. These are my own captures, not
the builder's.

**Better.** In dark, three things improve on main and nothing gets worse:
- The accent is copper and no longer apricot: `#eb8a64` against main's `#e79d73`.
- Selection reads as verdigris and no longer as a grey band.
- Native chrome follows the theme. Main draws a white scrollbar track (`252,252,252`) on the dark
  hull. This head draws a dark one (`44,44,44`).

In light the two are the same page, down to the pixel.

| Width | Light: differing pixels, head vs main | Dark: differing pixels (where) |
|---|---|---|
| 320 | **0** | 1359 (rows 829 to 1066: Theseus, GitHub, LinkedIn glyphs and underlines) |
| 390 | **0** | 1354 (rows 808 to 1045, same) |
| 1024 | **0** | 1617 (rows 767 to 987, same) |
| 1440 | **0** | 1766 (rows 797 to 1022, same) |

These are full-page captures at DPR 1, compared channel by channel on a canvas. **C7's visual half
holds:** there's no light change at any width, so I have no finding. In dark, only the copper moved,
and the page height is identical at every width.

Captures:
- `shots/iris-review-{head,main}-{390,1440}-{light,dark}.png`. I kept the 320 and 1024 captures in
  my scratchpad.
- `shots/iris-review-390-dark-accent-head-vs-main.png` (DPR 2, head on the left).
- `shots/iris-review-390-dark-selection-head-vs-main.png` (head on the left).
- `shots/iris-review-head-1440-{dark,light}-scrollbar.png`.

## Hard gates

| Gate | Result | Evidence |
|---|---|---|
| No placeholder renders | **fail (pre-existing, owner content)** | The served HTML of both head and main contains "Company name", "Previous company" and, twice, "What you built, owned and improved.". LinkedIn points at `https://www.linkedin.com/`. The `TODO(owner)` markers are source comments and don't render. |
| axe: no serious or critical | pass | `@axe-core/playwright` on `/` found **0 violations of any impact**, in light and in dark. |
| impeccable detector: no errors | pass | `impeccable detect --json app/globals.css app/layout.tsx app/page.tsx components/section.tsx` printed `[]`. The live URL scan of `http://localhost:3461/` (Chromium through a `--no-sandbox` wrapper) also printed `[]` and exited 0. |
| Reduced motion | pass | With `reducedMotion: 'reduce'`, `document.getAnimations()` returns 0 and no element has a transition. |
| Reflows at 320 px | pass | `scrollWidth - clientWidth` = 0 in light and dark. |
| Phone budget | pass (approximate) | 390x844 at DPR 3, CPU 4x slower, about 1.6 Mbps with 150 ms latency, against local `next start`: LCP 392 ms (light) and 376 ms (dark), CLS 0. The theme is all CSS and adds no script. |

## Scores (head)

| Criterion | Score | Why |
|---|---|---|
| Design quality ×2 | 7 | Both schemes now carry the same mood: verdigris ground and one copper part. The dark is a real hull now, not copied values. Still one typeset column with no imagery, so 7, not 8. |
| Originality ×2 | 6 | Unchanged from sprint 1. The palette story is the subject's own, but the layout is a résumé template until item 3. |
| Craft ×1 | 7 | The tokens are precise: dark fg 15.30, muted 7.60, accent 7.45, selection 8.39, all measured in the browser. The theme-color metas equal `--background` exactly, and `colorScheme` is `light dark` on `:root`. Two flaws hold it at 7. One is carried from sprint 1: at 390 the break falls before " · Company name", so the dot starts line 2. The other is the dark scrollbar, which is a neutral grey that doesn't belong to the green hull (finding 2). |
| Functionality ×1 | 8 | Native controls follow the scheme: a reverted `<input>` is `rgb(59,59,59)` in dark and white in light. The address-bar colors match per scheme. There's no flash, since the switch is CSS only. Keyboard focus stays the browser default (item 6). |

**Weighted: (2×7 + 2×6 + 7 + 8) / 6 = 6.83, reported as 6.8/10.** That's the same as sprint 1. This
sprint improved dark, which main renders badly, but it couldn't move the criteria that hold the
score down.

## Checked against my direction

- **The accent reads as copper at 16 px:** yes. At the links it's clearly a metal orange and not
  main's peach. At the 20 to 24 px project title ("Theseus") it leans a little coral (finding 1).
- **Selection shows across a link:** yes. Across "Theseus" through "LinkedIn", the `#2d4543` band reads
  as verdigris. The selected links turn foreground on it, as intended, and the underline stays visible.
  Main's band reads as grey.
- **The scrollbar is dark:** yes (see above). I launched Chromium without `--hide-scrollbars` so the
  bar would be drawn.
- **Light shows no pixel change:** yes, 0 pixels at all four widths. The light tokens resolve to
  `#e6f3f1`, `#0f2220`, `#455e5a`, `#944126` and `#c5d5d2`.
- **The address bar:** I can't emulate it in headless Chromium. The served head has
  `theme-color #e6f3f1` for `(prefers-color-scheme: light)`, `#091413` for dark, and
  `color-scheme light dark`, which equal each scheme's resolved `--background`.
- **Comments:** the dark block's comment no longer says "parity only", each value keeps its oklch
  intent beside it, and the `@source` housekeeping line is there.

## Findings (none blocks this PR, and none is in this sprint's scope)

1. **Dark accent at display size (watch in item 3).** `#eb8a64` reads copper at link size. On the
   project title at `step-lg`, the larger area of glyph makes it lean coral. Item 3's project cards
   will put the accent on more and larger titles. When they do, judge it at card-title size. If it
   reads coral there, give titles `--foreground` with a copper underline, and keep the full accent
   for link text. Don't change the token: it holds 7.45:1 with the least margin of any pair.
2. **The dark scrollbar is a neutral grey, not part of the hull.** The track is `rgb(44,44,44)` and
   the thumb `rgb(159,159,159)`, on `#091413`. It's correct (it's dark), but it's the one surface that
   isn't green-tinted. A one-line fix in the base rule would use existing tokens, add no colors, keep
   C5 and C6 green, and fit item 6's polish: `scrollbar-color: var(--muted) var(--background)`.
3. **Carried from sprint 1 (my miss):** at 320 and 390 the role titles still break before " · ", so
   the dot reads as a bullet. A no-break space before the separator in `app/page.tsx` fixes it. That's
   presentation, not content. It belongs to item 3's layout work, or to any sprint that edits that
   line.
4. **For later:** a native `<input>` in dark is a neutral `rgb(59,59,59)`. The page has none today. If
   a contact form comes, style it from the tokens.

## Needs owner decision

- **The placeholder gate:** fix `content/profile.ts` or waive the gate. Until then, every one of my
  verdicts is `changes`, whatever the work.
- **The 7.0 bar for scoped sprints:** this is the second sprint in a row at 6.8 for work that met its
  own brief. Originality can't pass 6 until the layout is in scope.

## What I couldn't verify

- Production itself (the proxy blocks it). `origin/main` stood in.
- The mobile address-bar color on a real device. Only the meta values are checked.
- Windows and macOS overlay scrollbars. I saw only headless Linux Chromium's classic bar.
