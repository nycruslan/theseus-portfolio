# Sprint 55 decisions (Atlas)

1. **M, Yc, as the plan staffs it:** Pixel leads the 3D, Forge builds the controller, Probe writes
   Y12 to Y18 red first with a contract mutant, Iris calls the looks before the flight and reviews
   the build. The contract is Atlas's, since the plan and Pixel's spike already made the product
   calls; it settles the plan's four questions (`contract.md`).
2. **The step's words come from the server's prerendered page for that step,** fetched and swapped,
   not from the table already on the page: the table holds each step's line but not the record's
   body, and a fetch makes "the server's words for that step" true by construction.
3. **The 3D and the controller meet at one written interface** (`Press`, `MakePress`, `startYard` in
   `lib/model/yard.ts`), so Pixel and Forge build in parallel on disjoint files; each keeps a
   stand-in for the other's side until Atlas integrates.
