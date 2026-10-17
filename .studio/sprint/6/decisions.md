# Sprint 6 decisions

1. **Goal: Education and stack, not the 3D hero.** The 3D hero is the first open roadmap item, but
   it is L: ambiguous ("subtle", "degrades gracefully"), new visual language, and the sprint skill
   sends L contracts to the owner first, which would stall the chain. Education and stack is M, its
   facts are the owner's newest (PR #25), and nothing renders them. Atlas, sprint 6.
2. **Order: Experience, Projects, Stack, Education, Contact.** The site's point is Theseus, so
   Projects stays second; Stack follows as "what it is built with"; Education is the oldest fact
   and sits last before Contact. Atlas.
3. **Lane M, one builder (Forge).** No 3D or motion: the heading rise comes from `Section`.
4. **Contract change: `reveal.spec.ts` lists the new sections.** Its C2 hard-codes the section ids
   and asserts the page has exactly those, so a correct build failed it. Probe changed only that
   array (866397e) to include `stack` and `education`; the test now also compares their geometry.
   No `expect(` lost, no skip, so scope.mjs sees no weakening. "Changes no existing test line" in
   the contract is amended to this one line. Atlas, on Probe's finding (`probe-checks.md`).
