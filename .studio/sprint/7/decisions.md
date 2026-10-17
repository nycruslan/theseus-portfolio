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
