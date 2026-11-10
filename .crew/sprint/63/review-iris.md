# Sprint 63 review (Iris): Ta, the trials page, PR #130

Verdict: changes. 7.8/10. One must and one should, each a single CSS value in `app/globals.css`. Both
are cheap enough to take now. Ship once they land; nothing else blocks.

Reviewed: `sprint/63-any-window` at 0ba8bd2 (93f8f5e's code plus decision 9), built in my own
worktree and served with `next start`. Main (c4afc92, production's code) was built beside it.
Everything was measured in the repo's `@playwright/test` Chromium (the 156 headless shell, decision
6), scripts off unless noted, light and dark. I used Forge's screenshots as the starting point.

## Against production: better

- Production has no `/trials`. The sprint adds the page and leaves the rest alone. I diffed main's
  build against this one pixel by pixel, full page, scripts off, light and dark:
  - `/` at 390 × 844, 1024 × 768 and 1440 × 900, and `/crew` at 1440 × 900: identical.
  - `/log`: it differs only by sprint 62's merge record (production shows "Undated", this build
    "Tue 10 Nov · 1 revision"). That is the expected state, not a regression.
- The page is the first plank of direction A, and it holds the canvas's idea. The real first page is
  drawn at the window with its dimensions, the waterline is at the window's foot, the freeboard sits
  beside it, and the crew's record is cited. The build is quieter than the canvas: no card, no boxed
  numbers, no copper. That suits this site.

## Hard gates: all pass

| Gate | Result |
|---|---|
| Placeholders | None added. |
| axe (serious or critical) | None on `/trials`, `/trials/320x568` or `/trials/320x460`, at 390 and 1440, light and dark. In emulated forced colours axe flags "Try it" at 1.14:1. That is an artefact: the button renders black on white with its ink border (`detail/forced-_trials.png`). /ask's `.ask-submit` uses the same pattern and escapes only because it is `aria-disabled` at load. No action. |
| Detector | Nothing at error level. One warning, `side-tab`, at `globals.css:4517`. That line is `.flow-stage`'s arrowhead, already on main: a false positive the sprint didn't add. |
| Reduced motion | Nothing animates (`document.getAnimations()` is 0). The page has no motion. |
| Reflow at 320 | No sideways scroll from 320 to 1440 in 8 px steps, on `/trials`, `/trials/320x568`, `/trials/320x460` and `/trials/1920x1100`. |
| Phone budget | LCP is text in main, outside the frame: 164 to 220 ms at 4x CPU (1440 × 900, 390 × 844, 320 × 568). CLS is 0 through rest plus 2 s. |

The ring is the site's (2 px ink at 2 px out) on every control. Tab never enters the frame. In forced
colours the waterline, the frame and both dimensions draw in CanvasText.

## Forge's asks

1. **The lead: leave it at 1.55, and leave the floor at 280.**
   - 1.55 is the site's `--text-step-base--line-height`. `.keel-lead`, `.read-text`,
     `.ask-answer` and this page's own answer all use it.
   - My table was measured with a 1.5 lead. That was my error, not Forge's.
   - At 390 × 664 the tallest frame's waterline is at 660.4, inside the screen, and T7 pins it in
     CI's Chromium. Cutting the floor to 276 would take 4 px off every tall window's frame and show
     nothing new: the sea and the `Waterline` label stay below the fold either way.
   - The real risk is a re-wrap of the lead in another engine, which costs a 24.8 px line. No floor
     covers that (see Tb, item 5).
   - Correction to `placement.md` section 5: below the lead, read every number +2.6 px at 1440,
     +2.4 at 390 and +3.2 at 320. The 390 × 664 pin is "660.4 at the most", not 658.
2. **Keep 456 × 465 as a named window, and let it answer Sunk at −0.1.**
   - The page never says the named windows are near misses. The contract's word came from
     production's sweep on 10 Nov, where it read 0.0. On the build it is 0.1 px under, and showing
     that is what the page is for.
   - Its answer is the best line on the page: "You sank them. The contact links end 0.1 px under the
     waterline … they hold the links up in 80 others."
   - Three named near misses remain: 792 × 575 (+0.1), 1160 × 635 (+0.2) and 1366 × 595 (+0.7,
     T5's). Swapping 456 × 465 for another window would cost a re-sweep and an oracle edit and give
     the visitor nothing.
   - Atlas: one line in `decisions.md` saying so.
3. **−0.1 for a barely sinking window: confirmed.**
   - The sign and the kind agree. "−0.0 px" reads as a typo, and the 0.05 px overstatement is inside
     T3's 0.5.
   - `words.md` section 2's example ("under by 0.04 px reads −0.0 px") is superseded: it reads
     −0.1 px.
   - A near miss under 0.05 px reads "+0.0 px … less than a pixel", which is true as it stands.

## Take now (both in `app/globals.css`)

1. **Must. Below 1024, `.trials-drawing` `--gr: 56px` → `--gr: 68px`.** Keep `80px` from `64rem`.
   - The problem: below 1024, on every window that sinks more than about 8 px as drawn, the
     freeboard dimension's line (frame edge +10) strikes through `Waterline`, which is set at +9 to
     +56. Examples: 320 × 460 (−114.2) and 1920 × 460 (−137.8) at 320, 390, 768 and 1023 wide.
   - Why it matters: that is the dare's payoff, on a phone, drawn wrong on a page whose subject is
     drawing precision.
   - With 68 the label sits at +21 to +68, 7 px clear of the tick. Measured at 320, 390, 768, 1023
     and 1024 on four windows, nothing crosses (`detail/sink-390-built.png` against
     `sink-390-fixed.png`).
   - Cost: landscape windows draw 12 px narrower below 1024 (282 → 270 at 390). Every T7 box stays
     in or moves up. `/trials` at 390 × 664: waterline 556.6 → 549.1, answer's first line 654.6 →
     647.1. Tall windows are height-bound and don't change (660.4).
   - No check pins the labels or `--gr`.
2. **Should. Add `text-wrap: pretty` to `.trials-figure figcaption`, `.trials-note`,
   `.trials-answer` and `.trials-rule-link`,** as `.trials-lead` already has it.
   - The problem: the caption ends on "window." alone at every window from 768 to 1920. The form's
     hint ends on "height." alone at 390, and on "test." at 360. Rule links end on "page.", "name."
     or "doing." at several widths.
   - With the change, I found no one-word last line on `/trials`, `/trials/320x568`,
     `/trials/1366x595` or `/trials/1024x768` at 320, 360, 390, 430, 768, 1024, 1440 and 1920.
   - No line count changes, and every first-screen box stays where it was.

## Can wait for Tb

1. **Phone windows on a laptop.** At 1440 a 320 × 568 window is drawn 1:1 at the column's left, so
   about 530 px of empty field sits between the drawing (to x 468) and the readout (x 1004).
   - Don't centre it now. Tb's corner drag needs the drawing anchored top left, and that field is
     the room the corner drags into.
   - Tb's placement must make it read as that field.
2. **Deep sinks.** On a sinking window the freeboard dimension runs down into empty paper. The links
   it measures to are clipped under the waterline and never drawn, so the dare's success is the
   weakest picture on the page.
   - Tb or Tc should show what is under the waterline: the page continued below the line under the
     sea's hatching, with the links ghosted, or at least a hidden (dashed) line at the links' foot.
   - This needs a second, taller render or script, so it isn't Ta's.
3. **The run's links** are centred in their 44 px boxes, so the column of widths starts 4 to 7 px
   inside the edge everything else aligns to. Fix with `.trials-run .trials-window {
   justify-content: flex-start; }`. Nit.
4. **Forced-colours axe on "Try it".** If T8 ever runs axe in forced colours, expect the artefact
   above.
5. **Other engines.** Below 1024 the lead's wrap sets the frame's top, and `tan(atan2())` is plan risk
   7. Check Safari and Firefox at 390 × 664 in Tb, where a fourth lead line would put a tall
   window's waterline below the fold.

## Scores

| Criterion | Score | Why |
|---|---|---|
| Design quality ×2 | 7.5 | One coherent drawing sheet: the real page drawn as a part with its dimensions, the waterline, the hatched sea, ink only, and the display face on the h1 and readings. At 1440 × 900 the default window reads at once. The phone-window field and the deep-sink void hold it back. |
| Originality ×2 | 8 | Framing the real first page at any window and measuring the contact links against its foot, with the crew's checks as the citations, is new for a portfolio and true to the site's record. The toy itself, dragging the window to sink them, is Tb's. |
| Craft ×1 | 7 | Measures match the sweep. Dark matches light to 0.05 px, there's no sideways scroll, CLS is 0, and the labels never meet above the line. The strike-through below 1024 and the one-word last lines cost it; with both changes taken it is an 8. |
| Functionality ×1 | 8.5 | It works with no script, every window is an address and the form snaps. Targets are 44 px below 1024, the Tab order is clean, nothing in the frame is reachable, and LCP is about 200 ms. |

Weighted: (2 × 7.5 + 2 × 8 + 7 + 8.5) / 6 = **7.8/10**. The sprint owns the layout, so the bar is 7:
it passes on score. It's held only by the must above.

## Evidence (scratchpad, `/tmp/claude-0/-home-user-theseus-portfolio/1fd380f1-9cb4-5f32-a6c6-0b0c1d52de50/scratchpad/iris/`)

- `look.mjs` → `shots/`: first screens and full pages, plus `geometry.json` (42 cases × 2 schemes).
- `labels.mjs` and `labels-fix.mjs`: where the labels sit against the dimension's line.
- `gates.mjs`: axe, LCP, CLS and reflow. `diff.mjs`: main against the build.
- `t7fix.mjs`: first-screen boxes before and after the two changes.
- `more.mjs` and `more2.mjs`: one-word last lines. `focus.mjs` → `detail/focus-*`: the rings.

## Not verified

- Real Chrome, Safari and Firefox: only the headless shell is installed, so type was judged in it at
  2x.
- The full e2e suite: that is Probe's.
- Production's live `/`: compared through main's build, with no feed, instead.
