## Goal

Redesign, direction step: an impressive portfolio on the owner's direction in `design/brief.md`,
measured against `design/calibration/`. The owner set this goal on 2026-10-20 and it is the roadmap's
top open item; the routine took it from the roadmap (no goal was typed for this run).

## Size

L, direction step. No product code and no `e2e/` change. The owner accepts the direction and the
contract by merging this PR. The build follows in M sprints B1–B5, the hero first, each leaving the
site shippable.

## What's here

- `.crew/sprint/15/brief.md`: the plan.
- `.crew/sprint/15/direction-iris.md`: Iris's direction, **"the log of the Theseus"**. The page is a
  ship's log, a ruled printed form with the career set as when / where / what entries. Its subject is
  the hull, which stands for the site: 22 planks, one replaced per sprint in a fixed order, each
  plank's tone showing its age (copper is the newest, bronze has been replaced, verdigris is original).
  Today's five colour tokens stay. Geist gives way to Besley (display) and Libre Franklin (text), both
  under the SIL OFL, 65.9 KB of fonts in total. The direction also covers the key screens, a motion
  storyboard (S0–S5, each scene with its reduced-motion and no-WebGL state), the budgets, the build
  order B1–B5, and the fails-on-sight list applied. Rejected, with reasons: the platform as a network
  (the AI category's default page, and it drops the site's name and the hull), a ship assembling from
  nothing (the hero would start empty), a lines plan, an exploded drawing, and a flight-strip board.
- `.crew/sprint/15/prototype/index.html` (with `fonts/` and their licences): a static prototype of the
  key screens with the real `content/profile.ts` facts. Open it in a browser. It's a design artifact
  only; nothing imports it.
- `.crew/sprint/15/contract.md`: Quill's contract. It gives the build split, the B1 (hero) checks 1–11
  for Probe to write red first, and what the redesign does to each existing spec. It also covers out of
  scope, risks and the owner's decisions.
- Memory: three lines each for Iris and Quill.

## Evidence

On the prototype (Iris, Playwright Chromium; screenshots stay out of git, in the session's
`.crew/screenshots/sprint-15/`):
- **axe:** 0 violations at 1440, 390 and 320 px, light and dark.
- **Reflow:** no horizontal scroll at 320 px.
- **impeccable's detector:** no errors. Its 7 `cramped-padding` warnings are text set on ruled lines, as
  the design intends.
- **LCP:** the element is text (the h1 at 1440, the bio at 390).
- **Hull SVG:** 2.6 KB gzipped.
- **Screenshots:**
  - `proto-{1440,390}-{light,dark}-fold`: the first viewport (name, title band, bio, hull).
  - `-experience`: the log entries.
  - `-ship-hover6`: the ship scene with one plank's legend lit.
  - `-full` and `proto-320-*-full`: whole pages.
  - `prod-*`: production at the same sizes, for comparison.
- **Newest plank on screen:** with the newest sprint set to each n from 15 to 36, the copper plank stays
  at least 82% on screen at 390×844 and 1440×900 (check 5 asks for 75%).
- **Copper vs bronze:** the bronze mix is capped at 75%, so copper is at least 1.52× louder than any
  other plank (check 4 asks for 1.5×).

## Decisions

- **Plank order on phones (Iris, settled here):** Quill found that the 135vw phone hull cropped the
  newest plank off screen from sprint 17 on, so no plank order could work. The hull is now one length
  formula at every width, and it clips 25 of 624 units.
- **Bronze cap (Iris):** capped at 75% because, at a 95% mix, the second-newest plank was nearly as
  loud as the copper.
- **1024 × 768 (Atlas, from Lens's nit):** check 5 keeps the laptop size. On the prototype the keel
  lift sits below the fold there for sprints 26 and 35 (0.07 and 0.03 on screen), so B1 must raise the
  hull at that size; every other sprint is at least 0.82.
- **Lens's second review (ship)** had four nits. The band's gap is now 2 px, as the prototype draws
  it; check 1 counts the font families rather than URLs; and the wide-screen hull is decision 11. Iris's
  memory line about her environment waits for the next build push, so this review stands.
- **Lens's first-review nits** went into the contract: hero C8 is rewritten, not unedited; N = 1 and N = 0 are
  defined; sprints-entry C14.6 joins the owner's list of checks that would weaken. Iris's stale memory
  line was fixed, and the prototype's CSS was made biome-clean with pixel-identical screenshots.
- **Scope (Quill):** the nav moves to B2, and the yaw and plank seating move to B5. In B1 they would
  break pinned Tab-order and rest-pose checks, and neither has been spiked yet.

## Not verified

- The motion: the prototype is static. B4 starts with Probe's spike.
- Timings on a mid-range phone: the prototype was measured from `file://`.
- Firefox, Safari and real devices: none were tested.

## Needs owner decision

Merging accepts the contract's "Needs owner decision" (`contract.md`, last section):
1. **The concept:** the log of the Theseus (recommended), or the network.
2. **The display face:** Besley.
3. **A dark band in light mode** for the ship scene.
4. **The copper "latest" plank moves every sprint.**
5. **Bold on five phrases of your JPMorgan summary,** with the words unchanged.
6. **The hull above the bio on phones,** which edits hero C1 and sprints-entry C14.3/14.4.
7. **The spec retirements** in the contract's "Would weaken a check" list, approved as a set or one by
   one.
8. **The project cards become log rows** (`cards.spec` turns into row checks).
9. **A higher markup cap** for the hero SVG, if compaction can't reach 8,192 B.
10. **Quill's scope change:** the nav moves to B2, and the yaw and seating move to B5.
11. **Above about 1441 px** the hull's 1460 px cap shows the whole hull, with its stern uncropped. Keep
    it, or let the hull grow.

Team copy for your approval: the nav labels, the legend ("Latest plank / Replaced / Original"), the
bold emphasis and the footer pairing (direction §8).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_016kREE8cPjJ1HtpkMLyRD8c
