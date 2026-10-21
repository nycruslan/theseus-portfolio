# Sprint 7 decisions

1. **Goal: the 3D hero, as an L contract.** It is the roadmap's only unticked item and has been
   passed over twice (sprints 5 and 6) for being L. Sprint 6's retro left Quill the follow-up to
   groom it into a contract for the owner. So this sprint ships the L lane's first step only:
   Iris's direction (`direction-iris.md`) and Quill's contract (`contract.md`), in a PR labelled
   `needs-owner` that the owner accepts by merging. No product code changes; the build is the next
   sprint's, by Pixel, against the merged contract.
2. **Smaller follow-ups wait.** The skip-link open question, Iris's drawn Stack dots and Probe's
   `content.spec.ts` fixme are each S, but one sprint ships one PR. They stay as follow-ups.
3. **No `decide` run.** The technique (WebGL library versus hand-written WebGL or CSS) is a build
   call bounded by the contract's budgets, not a call the owner needs to settle now.
4. **Scope cut after fix round 2.** Lens said changes on 96f0b2a, f96f53f and 2355550. Quill fixed
   rounds 1 and 2, and each round's important findings were new ones, mostly in Part B, whose checks
   rest on a WebGL spike nobody has run. With the round cap reached, I recorded a contract change
   (`contract.md`, "Contract change"): Part A (C1 to C9) is the contract, Part B (C10 to C16) is a
   draft that its own sprint rewrites after Probe's spike, and Lens's open findings travel with it.
   I amended C7 from Lens's nits myself (painted shapes only, a chroma floor for the hue test).
