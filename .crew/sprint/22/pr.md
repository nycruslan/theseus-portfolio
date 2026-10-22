# Sprint 22: B1, the sheet in 2D

**Goal (from the roadmap):** the home page becomes the drawing sheet from the approved direction
(sprint 17's canvas). The sheet has the labelled bar, the lines plan with every merged sprint's plank
drawn, the title block, and the revision block built from the retros. Every current fact stays below
the sheet. This is the redesign's first demo: look at the Vercel preview at 1440 and on a phone.

**Size:** M.
- Contract: `.crew/sprint/22/contract.md` (Quill).
- Build notes from the canvas: `.crew/sprint/22/notes-iris.md` (Iris).
- Decisions: `.crew/sprint/22/decisions.md` (Atlas).
- Iris's review: `.crew/sprint/22/review-iris.md`.
- Fix round 2, from Lens's review: `.crew/sprint/22/fix-round-2.md`.

## What a visitor sees

- **A labelled bar.** The wordmark, then Work, Log (`/sprints`) and Contact. The skip link is still
  the first stop.
- **The lines plan, as server-rendered inline SVG.** It has three views (profile, half-breadth plan,
  body plan) from 768 px, and the profile and half-breadth plan below that.
  - The 22 planks are drawn in the shipwright's order. Each merged sprint seats one plank and labels
    it with its number. A plank too small to letter (5.0, sprint 20) takes a leader.
  - Unseated planks are a shade greyer, as originals.
- **The title block.** The name is the largest paint (104 px), with the role, the bio's first two
  sentences verbatim, and the contact links.
- **The revision block.** It shows the five newest retros: Rev, Description, Drawn, Checked, Tested
  and Approved.
  - Approved reads Owner or Gate, which was the owner's call 3. Today's data gives Owner for exactly
    sprints 1, 2, 7, 9, 10, 12 and 15.
  - The block links to all N revisions in the Log.
- **Sofia Sans and Sofia Sans Extra Condensed** replace Geist. They're self-hosted through
  `next/font`, and the display face is preloaded.
- **Ink links, and no copper on the page.** Copper now means "live now", the owner's call 2, and B1
  has nothing live.
- **Nothing moves.** The sprint 5 section reveal is removed.
- **The WebGL hero is removed.** B3 brings the new 3D.

## Results

- `pnpm verify` passes.
- `pnpm test:e2e`: 124 passed, 0 failed, after fix round 2. B1.4's leader branch was proven
  against a mutant whose leader ends outside its plank, and the new B1.3 check (the bar stays above
  a hovered card) was red on the card as Lens found it and green on the fix.
- The checks: B1.1 to B1.11 are in `e2e/sheet.spec.ts` and `e2e/plan.spec.ts`, with the oracle in
  `e2e/retros.ts`. They were written before the build, and all 17 tests were red on main.
- The suite on main had 107 tests. Of these, 70 are kept unedited, 12 are rewritten with the same
  assertions, and 25 retire (below).
- Measured on a production build at 4× CPU (Forge, confirmed by Iris):

  | Measure | Result | Budget |
  |---|---|---|
  | LCP | text: the h1 at 1440 (~200 ms), the bio at 1024 and 390 (~165–236 ms); ~1.6 s at 400 kbps | ≤ 2,500 ms, text |
  | CLS | 0, fonts included | 0 |
  | Drawing markup | 22,099 B | ≤ 32,768 B |
  | Fonts | 2 woff2, 80,856 B | ≤ 86,016 B |
  | JS on `/` | the same as `/sprints` | within 2,048 B |

- axe is clean at 1440 and 390 in both schemes and on `/sprints`. Nothing animates, and nothing
  overflows at 320.
- Iris's verdict was `changes`, with a score of 8.0 against production's 6.5. Her three musts and one
  cheap change are done in fix round 1:
  - plank 5.0's leader;
  - 11 px plank numbers below 1024;
  - the 320 px revision fold;
  - a lighter night card.
- Lens reviewed aa9fcd9 once #63 gave it the turns a page replacement needs: `changes`, with one
  Important finding and two nits, all taken in fix round 2:
  - A hovered or focused project card shared the sticky bar's z-index and, coming later in the DOM,
    painted over the bar and took the clicks meant for Work, Log and Contact. The card now lifts by
    `z-[1]`, enough to clear its neighbours' seam and stay under the bar. Probe's new B1.3 check
    pins it, and Forge's screenshots (`.crew/screenshots/sprint-22-fix-2/`, not in git) show the
    hovered and the focused card under the bar at 1024, before and after.
  - On phones the card's focus ring fell off both sides of the screen. Below 768 px it is now drawn
    just inside the card, a closed box (`after-focus-390.png`).
  - The notes that called Lens's turn cap a blocker are brought up to date.
- `origin/main` is merged in (31c4a63), which brings the owner's #63 and #60 to the branch.
- Lens on 9ea4fe7, the fix round's head: **ship**, with four nits and nothing Important. The stale
  PR body and retro are corrected in this close-out; the forced-colours plank fills, the folded
  table's label fallback on older Safari and Firefox, and the Open Graph comment are in the retro's
  follow-ups, to ride along with the sprints that touch that code.

## Needs owner decision

1. **Approve the retired checks.** B1 can't replace the page without them. They're in three batches:
   - **(A)** All 7 tests in `hero-3d.spec.ts`, and `hero.spec.ts` C1, C2, C3, C7 and C8. These
     describe the old WebGL and SVG hull, which is gone. Hero C6's byte budget for the drawing rises
     from 8,192 B to 32,768 B, for the full lines plan.
   - **(B)** `reveal.spec.ts` C1 to C8. The direction says nothing the visitor reads moves, so the
     section reveal goes. The new B1.8 checks that nothing animates.
   - **(C)** `sprints-entry.spec.ts` C14.3 to C14.6, and `sprints.spec.ts` C1.3. The home page's
     build-log line and the old column layout are gone. B1.1, B1.3, B1.5 and the keyboard order cover
     what they guarded.
2. **The Date column (optional).** No retro records a date, so the revision block ships without one.
   To add it later, either the sprint skill's close-out writes `mergedAt` into `retro.json` (an owner
   path), or the build asks GitHub for merge times.
3. **For the demo, not blocking.** The Full/Calm/Off control waits for B3, because with no 3D, Full
   and Calm would look exactly like Off. Crew and "Read as page" wait for their routes (B4, B2). Say
   so if you'd rather see them stubbed now.

## Decisions made in the sprint

- Where Iris's notes and the contract differed (12 places), the contract won, as recorded in
  `decisions.md`. The main ones:
  - no pencil plank or in-progress row in B1;
  - plain-text wordmark;
  - the same revision rows at every width.
- Forge's departures, all accepted by Iris:
  - The type scale collapsed to six step tokens.
  - The dark plank fills are retuned for 4.5:1.
  - The bar is sticky above the frame.
  - The legend is shortened.
  - The fonts use `display: optional` with fitted fallbacks.

## Not verified

- Safari, Firefox and a physical iPad.
- The Vercel preview, from the crew's sessions: its host is outside the cloud proxy. The same commit
  was built and checked locally instead.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01MrECEaqMQ4AzvvTB4L8Xf2
