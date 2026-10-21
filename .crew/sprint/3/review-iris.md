# Iris: design review of PR #16 (sprint 3, project cards) at 57999ec

Verdict: ship 7.3/10

Advisory: `design/calibration/` still holds only its README, so these scores aren't calibrated and
don't hold the merge. Every hard gate passes, the change is **better** than production, and the
weighted score clears the 7.0 bar for the first time (DQ 7, Originality 7, Craft 8, Functionality 8).
Both of Pixel's deviations from my direction are accepted: each one fixes a miss in my own spec. I'm
not asking for any code change. Three small follow-ups are listed below, and none of them blocks.

## First verdict: better than production

Production can't be reached from this sandbox (`CONNECT tunnel failed, response 403`), so
`origin/main` at `b748d4d` stands in for it. I built it from a `git archive` export in my scratchpad
and built `57999ec` in my own worktree. I served both with `next start` (head on 3357, main on 3358)
and rendered them in Playwright Chromium 1194 at 320, 390, 1024 and 1440, in light and dark. These are
my own captures, not the builder's.

**Better.** Above Projects the two pages are the same. Projects is where they differ:
- **Main:** a coral title floating in the column, the same shape as an Experience entry. The only
  link signal is its colour, and its target is one line of text.
- **Head:** a single framed plank. It's the one built object on a page that's otherwise all type, and
  that contrast is the point of the direction. The ink title with its permanent copper underline
  closes sprint 2's finding 1 (the dark accent leaned coral at `step-lg`). The muted up-right arrow
  says "opens elsewhere" without adding any words. On phones the plank becomes a strake: two rules
  run edge to edge and the text stays on the column's edge.

Nothing gets worse. The page grows by 66 px at 1440 and 42 px at 390, which is the frame's padding.

## Hard gates

| Gate | Result | Evidence |
|---|---|---|
| No placeholder added or made more prominent | pass | The sprint adds no text (C2). "Company name", "Previous company" and the "What you built…" summaries are on main too, as the owner's pending content (owner's call, 2026-10-14), and they're no more prominent here. No URL is printed. See owner note 1 about the `href`. |
| axe: no serious or critical | pass | `@axe-core/playwright` at 390 with reduced motion: **0 violations of any impact** in light and in dark, on both head and main. |
| impeccable detector: no errors | pass | `impeccable detect --json components/project-card.tsx app/page.tsx app/globals.css app/layout.tsx components/section.tsx` printed `[]` and exited 0. The live scan of `http://localhost:3357/` (Chromium through a `--no-sandbox` wrapper) also printed `[]` and exited 0. |
| Reduced motion | pass | With `reducedMotion: 'reduce'`, `document.getAnimations()` returns 0 and no element has a non-zero `transition-duration`. Hover is colour only and has no transition at any setting. |
| Reflows at 320 px | pass | `scrollWidth - clientWidth` is 0 at 320, 390, 1024 and 1440, in both schemes. The strake runs 0 to 320 exactly. |
| Phone budget | pass | At 390×844, DPR 3, with 4× CPU throttling, 150 ms latency and 1.6 Mb/s: head LCP **604 ms**, main 628 ms. CLS is **0** on both. |

## The direction, as built

Measured with `getBoundingClientRect` and text ranges, in both schemes (light and dark match):

| Width | Column edges | `PROJECTS` label | Title text left | Description left | Arrow right | Frame |
|---|---|---|---|---|---|---|
| 320 | 24 / 296 | 24 | 24 | 24 | 296 | 0 to 320, `border-y` |
| 390 | 24 / 366 | 24 | 24 | 24 | 366 | 0 to 390, `border-y` |
| 1024 | 200 / 824 | 200 | 200 | 200 | 824 | 168 to 856, 1 px all round |
| 1440 | 408 / 1032 | 408 | 408 | 408 | 1032 | 376 to 1064, 1 px all round |

- **One left edge:** the label, the title, the description and the Experience `h3`s line up exactly
  at every width. The arrow ends on the column's right edge.
- **Seams:** I cloned the card twice in the browser (stand-ins I made up, not content). Neighbours
  overlap by exactly **1 px** at 320, 390 and 1440, so a stack reads as one frame divided by rules.
- **Arrow on a wrapped title:** the arrow's centre sits within 0.4 px of the first line's centre at
  320 and 390 (3 and 2 lines) and within 0.9 px at 1440. One-line titles are the same.
- **Whole card is the target:** `elementFromPoint` at the centre and at each corner inset by 8 px
  returns the link, at all four widths, in both schemes.
- **Hover:** a 1 px copper frame on all four sides of the middle plank, painted over both shared
  seams, with the arrow turning copper. The title doesn't change.
- **Focus:** Tab gives a 2 px solid copper outline at −2 px, all four sides. At 320 and 390 it stays
  inside the viewport (0 to 320, 0 to 390). In forced colours a system-colour ring is drawn on the
  card, and the link's own ring comes back too, as `outline-hidden` intends.
- **Colours from tokens:** the light rule is `rgb(197,213,210)` and dark is `rgb(45,69,67)`. The title
  is the foreground colour, the underline is the accent (`148,65,38` light, `235,138,100` dark) and
  the arrow is muted at rest.

## Pixel's two deviations: both accepted

1. **`has-[a:focus-visible]:z-10`: accept.** My direction lifted the hovered plank with `z-10` but
   forgot the focused one. Every `li` is `relative`, so later siblings paint over earlier ones, and
   the next plank's top rule (the shared seam, `-mt-px`) covers the outer pixel of the focus ring's
   bottom edge. I removed the `z-10` from a focused middle plank in the browser and compared the
   captures:
   - 1440 dark: 2,752 device pixels differ, all on one CSS row at the bottom edge. Copper
     `235,138,100` becomes rule `45,69,67`.
   - 320 light: 1,280 pixels differ in the same place.

   Without it the ring is 2 px on three sides and 1 px on the fourth. It's the same reasoning as
   `hover:z-10`, and it moves nothing. With today's single project there's no next sibling, so it
   matters as soon as the owner adds a second project.
2. **`md:px-[calc(--spacing(8)-1px)]`: accept.** I'd call this geometry rather than optics. My rule
   was "the padding equals the hang". Below `md` that holds, because the strake has no side borders.
   From `md` the frame adds a 1 px side rule, and my sum left it out. With `md:p-8` the text would
   sit at 409 and 201, one pixel off the label. As built it sits at 408 and 200, exactly on the label,
   and the arrow ends on the column edge. This keeps the "keep those values matched" invariant my
   direction asked for. The comment in `components/project-card.tsx` says why. Vertical padding stays
   32 px plus the rule, which is right, because nothing aligns vertically against it.

## Scores (advisory, uncalibrated)

| Criterion | Score | Why |
|---|---|---|
| Design quality ×2 | 7 | The page now has one deliberate object, and its colour story is resolved: copper means "touch this", ink means content. The rest of the page is still a quiet single column with no imagery, so this isn't an 8 yet. |
| Originality ×2 | 7 | Up from 6. Shared-seam planks, a full-bleed strake on phones and a frame hung outside the column are not a template's rounded card. Honest limit: a bordered row with a ↗ is a common portfolio idiom. The seams and the hang are what make it ours, and they'll show more once there's a second project. |
| Craft ×1 | 8 | Exact edges at every width, 1 px seams, an arrow centred within a pixel on wrapped titles, a ring that keeps 2 px on all four sides, and forced colours handled. |
| Functionality ×1 | 8 | A thumb can't miss the target. Keyboard focus outlines the whole card, nothing moves, and it reflows at 320. You can't select the description's text (an accepted cost). The arrow doesn't respond to focus (follow-up 1). |

Weighted: (2×7 + 2×7 + 8 + 8) / 6 = **7.3**. Every criterion is at least 6, so it passes the bar,
which this sprint needs since it owns the layout.

## Follow-ups (none blocks this PR)

1. **Light the arrow on keyboard focus too** (Pixel, item 6's accessibility pass). Hover turns the
   arrow copper but focus doesn't, so the two states disagree. Add
   `group-has-[a:focus-visible]:text-accent` to the arrow's `span`. It's one class, colour only. I
   left it out of the direction.
2. **Rule contrast is quiet by design.** `--rule` on `--background` is a hairline in both schemes, and
   it's decorative: the underline and the arrow are what say "link". Don't raise it to meet 3:1 later.
   That would turn the plank into a box.
3. **Pre-existing, out of scope:** the " · Company name" break at 390 is still there (sprint 2
   finding 3). It needs a browser trial before any fix.

## Owner notes

1. **The Theseus link goes to `https://github.com/nycruslan`, which `content/profile.ts` marks
   `TODO(owner): replace`.** The card now makes that link the biggest target in Projects, and the
   arrow promises a destination. It isn't placeholder text, and no URL is printed, so it doesn't fail
   the gate. Still, pointing it at the repository, or at a write-up, would make the promise true.
   Needs decision (owner): the project URL.
2. Calibration: my verdicts stay advisory until `design/calibration/` holds your scored examples.

## Method and limits

- Running impeccable's critique as two separate sub-agents wasn't possible, because I have no
  sub-agent tool. So this is a single-context review: I made the design judgement before reading the
  detector output, and both detector runs came back clean. I skipped the critique's closing
  questions, since this is a gate review with no one to answer them.
- Production itself is unverified (proxy 403). `origin/main` stands in for it.
- I didn't test a real touch device or a screen reader. The link's accessible name comes from source
  and axe ("Theseus" only, with the arrow `aria-hidden`).
- Captures are in my scratchpad, not git, as asked. The folder is
  `/tmp/claude-0/-home-user-theseus-portfolio/b4f6afe9-c9d0-5491-b5dd-da4bd3b5f4c7/scratchpad/review/shots/`:
  - `{head,main}-{320,390,1024,1440}-{light,dark}-full.png`
  - `head-*-projects.png` and `head-*-hover.png`
  - `stack-{320,390,1440}-{light,dark}-{rest,hover-middle,focus-middle,focus-middle-noz}.png`
  - `head-390-forced-focus.png`

  The script is `review.mjs` beside them, and its raw numbers are in `results.json`.
