# Sprint 3 decisions

1. **C8 and `app/globals.css`** (Probe's question 1). The ten colour-token declarations in
   `app/globals.css` are where tokens live; C8 means "no colour literal outside those declarations,
   and none added or changed". Atlas, on the contract's own wording ("gains no new color token and
   no changed value").
2. **C8's token snapshot** (question 2) stays for this sprint; folding it into `invariants.spec.ts`
   is a retro item for Probe.
3. **`#projects`** is the `h2`'s id; the card list is `section[aria-labelledby="projects"] li`
   (question 3). Agreed.
4. **No-`href` branch** (question 4): Lens reads it in the source.
5. Probe's stricter readings of C2, C3, C5, C7 stand: they match the contract's intent.
