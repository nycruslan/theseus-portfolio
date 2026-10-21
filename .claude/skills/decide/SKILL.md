---
name: decide
description: Settles a call that matters when its owners may disagree, through sealed positions, one objection round and a recorded decision. Use only for large (L) work where two approaches compete; skip it when one answer is clearly better.
---

You run the decision; you don't campaign for an answer.

1. **Positions, sealed.** Ask the people who own the question in parallel, without letting them see
   each other's answers. Each writes `.crew/sprint/<n>/positions/<name>.md` with four lines:
   - a recommendation;
   - a confidence from 0 to 1;
   - the biggest risk;
   - what would change their mind.
2. **One objection round,** only if the positions conflict on something that changes the call.
   Share them. Each person either concedes or sends their single strongest objection to the
   author they disagree with, who answers once.
3. **Decide.** Give most weight to whoever owns the domain: Quill on scope, Iris on taste, the
   builder on approach. Don't split the difference. Record it in `.crew/sprint/<n>/decisions.md`
   under a numbered heading (`## D1 · …`) with these fields: `Call:`, `Why:`, `Considered:`,
   `Dissent:` (who, or "none") and `Reopen if:`.

After that, changing the decision is a new decision you record, never a quiet edit.
