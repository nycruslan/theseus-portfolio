# Sprint 22 decisions (Atlas)

1. **No Full/Calm/Off control in B1** (Quill and Iris agree). With no 3D or live layer, Full and Calm
   would look exactly like Off. The page is the Off state, and the control ships in B3 with what it
   controls. The owner can overrule this at the demo.
2. **No Date column.** Retros hold no dates, and a git or GitHub merge time isn't reliable at every
   build. It's proposed for the retro (a `mergedAt` field) for B5.
3. **Where Iris's notes and the contract differ, the contract wins.** Probe's checks are written to the
   contract, and Iris's notes stay the source for everything the contract leaves open (values,
   grid, strokes). Probe listed twelve conflicts; each is settled as follows:
   1. No pencil plank and no in-progress row in B1. The sheet shows merged sprints only, since a
      plank in progress is the live layer.
   2. The count line says "replaced", as in the contract.
   3. The wordmark is plain text. The bar is on `/` only; `/sprints` keeps its own header.
   4. The revision block is `section[aria-labelledby="revisions"]`.
   5. The revision table shows the same rows at every width, with no one-link strip on phones.
   6. Descriptions are never truncated.
   7. The plank numbers and the body plan show from 768 px.
   8. Plank numbers are at least 11 px and use a step token (invariants read every visible text size).
   9. Drawn, Checked and Tested follow the contract's data rules: fixed name order, "—" for empty,
      and Checked counting only `lens_important_findings` as a number.
   10. Token names stay as they are (`--background` … `--rule`) with Iris's values. The new tokens are
       `--pencil`, `--card` and `--card-old`, and the hatch colours are declared as tokens.
   11. The project cards stay, and so does `cards.spec.ts`.
   12. `/sprints` keeps its weights of 400, 500 and 600 in one family (C7.1).
4. **The reader's interface is Probe's:** `readSprintLog()` entries gain `drawn: string[]`,
   `checked: boolean` and `tested: boolean`.
