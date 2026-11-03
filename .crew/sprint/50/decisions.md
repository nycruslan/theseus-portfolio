# Sprint 50's decisions (Atlas)

1. **Ra runs as Quill wrote it.** The contract is `.crew/sprint/49/first-contract.md`; nothing in
   it needs a product call, so Quill isn't brought in. Sized M, as the plan says.
2. **The team:** Iris (`iris`) makes the small call on which words carry the link; Probe (`probe`)
   writes R1 and R3's checks, rewrites K6's count, runs the contract mutant and investigates R5;
   Forge (`forge`) builds R1's retro edit, R3's link and R4's guard. Forge starts on R1 and R4,
   which don't wait on Iris, and takes R3's words when she calls them.
3. **R4 edits `.crew/sprint/32/merge-record.mjs`**, which is the team's (`/.crew/sprint/` gives it
   back in CODEOWNERS), so the sprint touches no owner path.
4. **Iris's call (R3): the whole line carries the link** (`link.md`): "N sprints merged" alone, wrapped
   at 390, gave a ring that boxed words the link doesn't carry.
5. **R5 is a product defect, fixed in CSS.** Probe measured on production: a poll that grows the
   panel while a reader sits at `/crew#keel` moved the keel 33 to 34.5 px (CLS 0.0488 at 390 × 664,
   over the phone budget), and K11's red on 2026-11-03 was the first poll rewrapping a stale page.
   Chrome anchored inside the panel. `overflow-anchor: none` on `.crew` makes it anchor on the keel.
   The trade (Forge's measure): a reader scrolled to the crew table, above a new row, now sees the
   page scroll up 35 px instead of the content below move down 34.5 px (CLS 0.0055). Accepted: the
   movement is the same size, it's no longer a layout shift, and the keel, where every "his rules"
   link lands, holds at every size.
6. **Fix round 1: R5's rule was too wide.** On 1918b80, Lens said changes (Important: with the whole
   panel out of Chrome's anchor walk, a reader in the Activity feed sees its rows slide when a moment
   lands), and CI went red in four kept replay checks (B4.44, B4.45, B4.46, B4.48): during a replay
   the scroll climbed one row per step. Neither Forge's nor Probe's runs had included
   `crew-replay*`, and decision 5 had measured only the table position. Forge narrows the rule to
   the one box Chrome wrongly anchors on at `#keel`; Probe adds the mid-feed reader to R5. If no
   narrowing holds every position, R5's rule is reverted and R5 goes to the roadmap.
