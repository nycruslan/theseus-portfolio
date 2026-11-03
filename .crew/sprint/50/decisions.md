# Sprint 50's decisions (Atlas)

1. **Ra runs as Quill wrote it.** The contract is `.crew/sprint/49/first-contract.md`; nothing in
   it needs a product call, so Quill isn't brought in. Sized M, as the plan says.
2. **The team:** Iris (`iris`) makes the small call on which words carry the link; Probe (`probe`)
   writes R1 and R3's checks, rewrites K6's count, runs the contract mutant and investigates R5;
   Forge (`forge`) builds R1's retro edit, R3's link and R4's guard. Forge starts on R1 and R4,
   which don't wait on Iris, and takes R3's words when she calls them.
3. **R4 edits `.crew/sprint/32/merge-record.mjs`**, which is the team's (`/.crew/sprint/` gives it
   back in CODEOWNERS), so the sprint touches no owner path.
