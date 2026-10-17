Verdict: changes 7.2/10 (DQ 7, Orig 7, Craft 7, Func 8). The same as production at the rubric's sizes, but a hard gate fails: axe finds a serious contrast issue at load at common window heights. The fix is to delete the section fade and keep the heading rise.

# Sprint 5: Iris's review of the section reveal

I reviewed head **8d87127** (fix round 1), as Atlas asked. I'd started on cd26f19. Where the two
differ I say so. Everything was measured against my own builds in the scratchpad: the head on :3374
and `origin/main` d1ed6b2 on :3375. Production is still a proxy 403, so the main build stands in for
it. I used agent-browser `--session iris5` with real wheel input (40 px notches, down and back up)
at 1440 x 900 and 390 x 844 in both schemes, plus Playwright for the frame strips, axe and diffs.
Screenshots are in the scratchpad only.

## First verdict: compared with production

**The same** at 390 x 844 and 1440 x 900. At rest it is pixel-identical: 0 differing pixels at the
top, the bottom and back at the top, in both schemes. The motion is below what a visitor notices
(see Pixel's question 1). At 1024 x 768 the top-of-page frame differs from main by a hair, because
Projects loads 52 px into its range: opacity 0.993 and the heading 0.12 px low. Nobody will see
that. It is not worse at any rubric size. It **is** worse at the heights in the next section until
the visitor scrolls.

## Hard gates

| Gate | Result |
|---|---|
| No new placeholder | Pass. The stand-ins already on prod ("Company name", "What you built…") are unchanged and not made more prominent. |
| axe serious/critical | **Fail at realistic heights.** It finds 0 at 1440 x 900, 1440 x 789, 1024 x 768, 390 x 844 and 320 x 640, in both schemes. It finds `color-contrast` serious on `#projects` (the PROJECTS eyebrow, then the card title) at load at **390 x 758–788, 1440 x 746–774 and 1024 x 740–746** in light, and at 390 x 758–778 and 1440 x 746–766 in dark. At worst the ratio is 1.17:1. I scanned in 2 px steps: 114 failing loads. |
| Detector errors | Pass. `impeccable detect` on `app/globals.css` and `components/` gives `[]`, and on the running URL gives `[]`. |
| Reduced motion | Pass. `getAnimations()` is 0 at the top and at the bottom, and no element under `main` is below opacity 1 (1440 and 390). |
| 320 px reflow | Pass. `scrollWidth` is 320 at the top and at the bottom, with motion allowed. |
| Phone budget | Pass. At 390 x 844, DPR 3 and 4x CPU, LCP is 152 ms (main 120 ms) and CLS is 0 after wheeling down and back up. |

**Why the axe failure is real, not a test artifact.** Any viewport whose bottom edge falls 1–30 px
below a section's top loads with that section partway through its fade, and it stays there until the
visitor scrolls. Projects' top is at about 745–757 px, so that band sits on ordinary windows. A
1440 x 900 MacBook running Chrome with the bookmarks bar shown is about 1440 x 764. Common Android
phones in Chrome are about 390–412 x 760–800. Pixel's notes and the contract accept "partly
revealed at load". Decision 2 says such a section "must not fail contrast", and the suite's
heights happen to miss the band. Fix round 1 didn't change this, because the fade is still on the
whole section.

I tried narrowing the band rather than removing it, by injecting CSS over the head and scanning the
same heights:

| Variant (on 8d87127) | Failing loads |
|---|---|
| As built (fade over `entry 0% entry 64px`) | 114 |
| Fade over `entry 0% entry 24px` | 43 |
| Fade over `entry 0% entry 16px` | 28 (390 x 758–764 and 1440 x 746–752 in both schemes) |
| An opacity floor of 0.8 or 0.85 (tried on cd26f19) | Worse: axe then counts the waiting sections below the fold. |
| **No section fade: the heading rise only** | **0** |

Every fade leaves a band. Only removing it clears the gate.

## The change I'm asking for (one rule, no new risk)

In `app/globals.css`, inside the existing `@supports` / `@media` gate:

1. Delete `@keyframes section-fade`. On `main > section`, delete the `animation`, `animation-timeline`
   and `animation-range` lines. **Keep** `view-timeline: --section block`, because the heading needs
   it, and keep the `main > section > h2` rule exactly as it is.
2. `will-change: contents` on the section can go too. I measured the rise-only variant at rest
   against main, with and without the hint on the section or the `h2`. It was 0 differing pixels in
   all 8 shots (light and dark, 1440 and 390, top and bottom) each way. Pixel should confirm this
   with his own 28-shot diff, because the composited-layer behavior he found was caused by the
   opacity animation.
3. Correct the comment header: the section no longer fades, only its heading surfaces.

C1 still passes on this variant. Its "not at rest" test accepts an animation target (the `h2`) with
a non-identity translate. C4, C5, C6 and C8 are unaffected. The contract's outcome says "a short rise
and fade". **Needs decision (Quill):** amend it to "a short rise of each section's heading" for
this sprint. A fade belongs with item 7, or with the time a page long enough to scroll can carry it
without the band (see below).

## Pixel's questions

**1. Is 16 px over 64 px the right weight? Yes. Keep both numbers, and keep the ease-out.**

- **16 px is less than one body line** (about 29 px at 1440). It reads as the label surfacing, not
  sliding in. 24 px, the contract's ceiling, starts to look like the stock fade-up-on-scroll
  template. 8 px would disappear entirely.
- **64 px is boxed in on both sides.** Projects loads 86 px into its range at 390 x 844, and Contact
  ends only about 150 px in at the bottom of the page. Anything longer catches a section mid-reveal
  at the suite's sizes.
- **The ease-out is right for a scroll-linked range.** I compared linear, ease-out sine and
  `ease-out` frame by frame (strips in the scratchpad). Linear makes the links visibly settle as
  they enter, which I liked at first. But it widens the at-load band: Projects at 1440 x 776 would
  sit at about 0.48 instead of 0.86. The front-loaded curve is what keeps a section caught at load
  looking finished.
- **Be clear about what a visitor sees today.** With real wheel input, Contact's whole reveal
  happens in about one 100 px wheel notch (scroll 135–199 at 1440 x 900, 193–257 at 390 x 844). It
  plays entirely in the bottom 64 px of the screen. The GitHub and LinkedIn links come into view at
  +44 px, when the reveal is already 97% done, so they are never seen moving. The only motion anyone
  can see is the CONTACT eyebrow surfacing at the bottom edge. On a page with only 288–343 px of
  scroll, that is the right register: quiet, and on the hull's "surfacing" idea. **Don't make it
  louder to make up for the short page.** Revisit the range when the owner's real content makes the
  sections tall enough to sit below the fold.

**2. Is the heading-only rise right? Yes, and it's better than moving the whole section.**

- **Never move a target.** Pixel's root cause (a stale timeline frame after a jump scroll moved the
  card 16 px between measure and click) is a real-user bug, not just a test bug. Fragment links and
  `scrollIntoView` do the same thing to people.
- **The label leading its content is the right order to read in.** It's a one-element stagger
  without the stagger the contract ruled out.
- **The trade-off is invisible today.** While the heading is low, the gap between it and its list
  closes from 24 to 8 px. In every frame I captured, the list is still below the fold while that
  happens. If a later sprint lengthens the range so the rise plays mid-screen, that closed gap
  would show. Then raise the heading and the list's first line together, never the cards.

## Scroll back up

When you scroll back up, each section fades out and drops as its top goes back under the bottom
edge. With wheel input at 1440 x 900, Contact read 0.99 with its top 33 px above the fold, then 0.35 and 0
once its top was below it, so nothing visible un-reveals. Scrolling down again replays the reveal. That's acceptable for
a CSS-only reveal and invisible in practice. The rise-only fix doesn't change it.

## Scores (head 8d87127)

| Criterion | Score | Why |
|---|---|---|
| Design quality ×2 | 7 | Unchanged at rest. The motion neither adds to the mood nor hurts it. |
| Originality ×2 | 7 | Scroll-linked and heading-led, not the template's fade-up on intersect. But almost nobody will see it, so it doesn't move the needle. |
| Craft ×1 | 7 (was 8) | The engineering is careful: the double gate, `backwards`-only fill, no clickable movement, and pixel identity at rest. But a section left half-faded at load on ordinary windows is a craft miss. |
| Functionality ×1 | 8 (was 9) | Reduced motion, keyboard (C8) and JS-off are all right. The at-load contrast band costs a point. |

Weighted: (2×7 + 2×7 + 7 + 8) / 6 = **7.2**. Every criterion is at least 6 and the score clears
7.0, so the gate is the only thing holding this. With the rise-only fix I expect Craft 8 and
Functionality 9, **7.5**, and `ship`.

## Noted, not part of this sprint

- The " · Company name" break at 390 (the dot starts line 2) has been open since sprint 1. The fix
  is a nbsp before the separator.
- Calibration: `design/calibration/` still has only its README, so this verdict is advice.

## Not verified

- Safari 26 and Firefox: no WebKit or Gecko here. The `@supports` gate means they get either the
  static page or the same CSS.
- Real touch fling on a phone: I emulated with wheel steps. The reveal is shorter than one fling.
- The full e2e suite on the rise-only variant: I ran C1's logic by reading the spec, not by running
  it. Probe should run `reveal.spec.ts` after the fix.
