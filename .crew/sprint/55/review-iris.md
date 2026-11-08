# Sprint 55 review (Iris): the press in 3D

Verdict: changes, 8.2/10.

Compared with production, this is **better**: the best page the yard has had. It needs two small
fixes before it ships:

1. In Full, Hobbes's question shifts the page when it lands. That fails the "nothing shifts after
   load" gate.
2. In dark, the Theseus's numbers fall to 2.1:1 on its lit card.

Both trace back to my own calls in `press-iris.md`.

I reviewed a production build of `sprint/55-the-press` at 87fce76 (`pnpm build`, then `next start`
on :3361, since stopped). I drove it with the worktree's `@playwright/test` (Chromium, SwiftShader)
and held every motion on Playwright's clock. Production is https://theseus-portfolio.vercel.app.

## Compared with production

On production, `/log` and `/log/n` draw the Theseus flat over a 3D ghost. Here both ships are
models in one world: the Theseus in lit card, the ghost in vellum, the same turn, seat over seat. I
compared the two in Full, settled, at 1440 light and dark, 1024 and 390.

- **Frame 1** registers both hulls on their drawings, and the two loft together.
- **Off is unchanged.** On `/log/13` the drawings' band matches production with 0 pixels differing:
  0 of 1,692,000 at 1440, and none in the band at 390. What does differ is data (the lines count,
  the commit, the table's dates). There's no canvas, and Next navigates, so history grows from 2 to
  3, as Off should.

## Hard gates

| Gate | Result |
|---|---|
| No placeholder | Pass. The sprint adds no copy but the live region's server-side `<p>`, which is empty. |
| axe, serious or critical | Pass: 0 in five cases. Full light 1440 /log/13; Full dark 1440 /log/13; Full light 390 after 22 → 23; Full dark 390 after 40 → 41; Calm light 1440 after 23 → 24. axe can't read text over the canvas, which is how must 2 got through. |
| impeccable detector | Pass for this sprint. One `side-tab` finding at `app/globals.css:4367`: `.flow-stage`'s CSS arrowhead, the same rule as main's line 4317. It's a false positive and predates the sprint. |
| Reduced motion | Pass. With reduced motion and no stored mode, 40 → 41 is a `fade` that lands at 255 ms of clock; nothing flies. Calm is the same fade. |
| 320 px reflow | Pass: `/log/23` in Full, scrollWidth 320. |
| Phone budget | **Fail**, see must 1. At load it's fine: LCP is the record's h2 at 224 ms (390, 4x CPU, cold), with no load shifts. A Full press that brings the question then shifts the page. |

## Scores

| Criterion | Score | Why |
|---|---|---|
| Design quality | 8 | Two ships, one turn, one light. The solid Theseus over its vellum ghost reads as the yard at a glance in both schemes. The dark numbers hold it under 9. |
| Originality | 9 | A press moves the real merge's plank between two real ships. The grey original turns to vellum on its way down; from 24 a crew plank lifts and fades with nowhere to go. Nothing on the award sites does this, and it's honest by construction. |
| Craft | 7 | The craft is precise: registration, twins at one length, the shadowed hole showing the far side's seams, numbers hidden under the passing plank, and marks and numbers landing on the knock frame. It's held down by the two musts. |
| Functionality | 8 | ← and → step; focus stays on the pressed link; the URL is replaced with history fixed at 2; the polite live region is empty in flight and names the step on landing; the title follows. Calm, reduced motion and Off all play. |

Weighted: (2 × 8 + 2 × 9 + 7 + 8) / 6 = **8.2**. With both musts fixed I'd expect craft at 8, for
8.3.

## Musts

**1. Hobbes's question shifts the page when it lands (CLS 0.025 at 390, 0.009 at 1440).**
- **Measured.** In a real-time Full press from `/log/22` to 23 at 390, one `layout-shift` of
  0.0253 has `hadRecentInput: false`. Its sources are `SECTION.record` and `P.log-lines`: the
  question arrives with the knock, about 760 ms after the input, which is past Chrome's 500 ms
  exclusion. At 1440 (on the clock) it's 0.0091.
- **Not affected.** Calm lands at 240 ms, inside the window. 23 → 24 removes the question at
  press start, also inside it.
- **Cause.** My call to land the payoff with the knock.
- **Fix (Forge).** Put the question's block in at press start, hidden (`visibility: hidden`), so
  its space is taken inside the input window. Reveal it on the knock frame, or fade it in over the
  site's 240 ms linear from there.
- **Check.** Probe adds "no layout shift without recent input during a Full press" to Y16's
  22 → 23. The contract's CLS budget is 0.

**2. In dark, the Theseus's numbers sit on its lit card at 2.1 to 3.3:1.**
- **Measured** on `/log/13`, Full, dark, 1440, DPR 2: each number's light ink (Y 0.809) against
  the plank around it.

  | Number | 6 | 12 | 3 | 2 | 9 | 13 |
  |---|---|---|---|---|---|---|
  | Contrast | 2.09 | 2.14 | 2.45 | 3.31 | 4.71 | 6.30 |

  In light the same six read 6.4 to 14.9:1, and production's dark 2D card holds them.
- **Cause.** My call 2 kept `/`'s × 4 dark gain so the Theseus "looks like itself". But `/`'s
  model carries no numbers; the Log's does. Sprint 33 found the same thing for the ghost and gave
  it 1.6.
- **Fix (Pixel).** In dark, set the Log's Theseus lit term (gain and lit mix) by its numbers:
  every numbered plank's ground at or under Y 0.14 where its number sits, which is 4.5:1 against
  the light ink. Keep enough modelling that the lowest strakes stay above the ground.
  - Check at 1440 and 1024 (numbers show from 768) on `/log/13`, `/log/23` and `/log/40`. Steps
    23 and up are all card, the brightest case.
  - `/` keeps × 4, since it carries no numbers.
- **Check.** Probe extends the ghost's number-contrast read to `[data-theseus]`'s numbers in dark.

## Coulds (not blocking)

- **The hitch at the top of the lift.** From about 140 to 260 ms the plank barely moves: the
  lift's ease-out meets the carry's cubic in-out. I asked for the hitch; SwiftShader frames can't
  say whether it reads as a beat or a stall. On a real GPU, if it stalls, start the carry 40 ms
  before the lift ends, or ease the carry on a sine in-out.
- **Marks on the first frame.** The record's ink marks are still on the first frame of a press and
  leave on the next.

## Evidence

The frames, JSON logs and scripts are in
`/tmp/claude-0/-home-user-theseus-portfolio/554648f4-a923-5d81-a396-c02c60d2dd1a/scratchpad/iris55/`:
`review.mjs`, `contrast.mjs`, `diff.mjs`, and `rev/*.png` and `rev/*.json`.

- **Full light, 1440:**
  - 13 → 14 at 0 to 760 ms: lift, shadowed gap, carry swaying toward the bow, grey-to-vellum
    morph, knock, then 14 and both marks.
  - 14 → 13 is the same press reversed.
  - 22 → 23 → 24: the question lands at 23 and leaves at 24.
  - 40 → 41: the 19 plank lifts with its number, the 25 and 21 under it are hidden while it
    passes, it fades in place, and the ghost's 19 stays put.
- **Full dark, 1440:** 13 → 14 and 40 → 41.
- **Full, 390:** 13 → 14 → 13 in light; 22 → 23 → 24 in light; 40 → 41 in dark.
- **Calm:** 13 → 14 → 13 at 1440 light, and 22 → 23 → 24 at 390 dark. Both fade in place in 240
  ms.
- **Every press:** `history.length` stays 2, the URL is the step's, the live region is empty in
  flight and named on landing, and there are no console errors.

## What I couldn't verify

- **Motion feel.** That needs a GPU, so the hitch call waits for a real device.
- **The Vercel preview.** Atlas couldn't read its URL, so I used a local production build.
- **Draws, triangles and frames at rest.** I didn't count them; that's Probe's Y13 and Y18 (my
  build ran `pnpm build` only, not the e2e suite).
- **Chrome.** These are Chromium headless shell frames, so type texture isn't judged here.
